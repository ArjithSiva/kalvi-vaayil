import Notification from '../models/Notification.js';

/**
 * Create a notification for a user.
 */
export async function createNotification(userId, type, title, message = '', relatedEntity = null) {
  return Notification.create({
    user: userId,
    type,
    title,
    message,
    relatedEntityType: relatedEntity?.type || '',
    relatedEntityId: relatedEntity?.id || null,
  });
}

/**
 * Notify all participants registered with a given organizer about a new workshop.
 */
export async function notifyOrganizerParticipants(organizerId, workshop) {
  const Registration = (await import('../models/Registration.js')).default;
  const Workshop = (await import('../models/Workshop.js')).default;

  // Find all workshops by this organizer
  const organizerWorkshops = await Workshop.find({ organizer: organizerId }).select('_id');
  const workshopIds = organizerWorkshops.map((w) => w._id);

  // Find all participants registered for any of these workshops (excluding the new one)
  const registrations = await Registration.find({
    workshop: { $in: workshopIds },
    status: 'confirmed',
  }).distinct('user');

  // Create notifications (deduplicate)
  const uniqueParticipants = [...new Set(registrations.map((id) => id.toString()))];

  const notifications = uniqueParticipants.map((userId) => ({
    user: userId,
    type: 'new_workshop',
    title: 'New Workshop Available',
    message: `${workshop.title} is now open for registration.`,
    relatedEntityType: 'workshop',
    relatedEntityId: workshop._id,
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }
}

export default { createNotification, notifyOrganizerParticipants };
