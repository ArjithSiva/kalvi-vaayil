import Workshop from '../models/Workshop.js';
import Session from '../models/Session.js';
import Attendance from '../models/Attendance.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';

// Admin analytics: total events per month, avg attendance, per-organizer stats
export async function getAnalytics(req, res) {
  try {
    const { organizerId, months = 6 } = req.query;
    const numMonths = parseInt(months) || 6;

    // Date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - numMonths + 1, 1);

    // Build filter
    const workshopFilter = { createdAt: { $gte: startDate } };
    if (organizerId) workshopFilter.organizer = organizerId;

    // 1. Total events per month
    const monthlyEvents = await Workshop.aggregate([
      { $match: workshopFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          physical: {
            $sum: { $cond: [{ $eq: ['$mode', 'physical'] }, 1, 0] },
          },
          online: {
            $sum: { $cond: [{ $eq: ['$mode', 'online'] }, 1, 0] },
          },
          hybrid: {
            $sum: { $cond: [{ $eq: ['$mode', 'hybrid'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // 2. Average attendance rates
    const workshops = await Workshop.find(workshopFilter).select('_id');
    const workshopIds = workshops.map((w) => w._id);

    const totalSessions = await Session.countDocuments({ workshop: { $in: workshopIds } });
    const totalPresent = await Attendance.countDocuments({
      workshop: { $in: workshopIds },
      status: 'present',
    });
    const totalAttendanceRecords = await Attendance.countDocuments({ workshop: { $in: workshopIds } });
    const avgAttendanceRate = totalAttendanceRecords > 0
      ? Math.round((totalPresent / totalAttendanceRecords) * 100)
      : 0;

    // 3. Per-organizer stats
    const organizerStats = await Workshop.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$organizer',
          totalWorkshops: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
        },
      },
    ]);

    // Enrich with organizer names and attendance
    const enrichedStats = [];
    for (const stat of organizerStats) {
      const organizer = await User.findById(stat._id).select('name email');
      const orgWorkshops = await Workshop.find({ organizer: stat._id, createdAt: { $gte: startDate } }).select('_id');
      const orgWorkshopIds = orgWorkshops.map((w) => w._id);

      const orgSessions = await Session.countDocuments({ workshop: { $in: orgWorkshopIds } });
      const orgPresent = await Attendance.countDocuments({ workshop: { $in: orgWorkshopIds }, status: 'present' });
      const orgTotal = await Attendance.countDocuments({ workshop: { $in: orgWorkshopIds } });

      enrichedStats.push({
        organizer: organizer ? { _id: organizer._id, name: organizer.name, email: organizer.email } : null,
        totalWorkshops: stat.totalWorkshops,
        totalCapacity: stat.totalCapacity,
        totalSessions: orgSessions,
        avgAttendanceRate: orgTotal > 0 ? Math.round((orgPresent / orgTotal) * 100) : 0,
        totalRegistrations: await Registration.countDocuments({ workshop: { $in: orgWorkshopIds }, status: 'confirmed' }),
      });
    }

    // 4. Overall summary
    const totalWorkshops = await Workshop.countDocuments(workshopFilter);
    const totalRegistrations = await Registration.countDocuments({
      workshop: { $in: workshopIds },
      status: 'confirmed',
    });
    const totalOrganizers = await Workshop.distinct('organizer', workshopFilter);

    res.json({
      summary: {
        totalWorkshops,
        totalRegistrations,
        totalSessions,
        totalOrganizers: totalOrganizers.length,
        avgAttendanceRate,
      },
      monthlyEvents,
      organizerStats: enrichedStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
