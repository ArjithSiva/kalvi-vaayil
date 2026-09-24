/**
 * Calendar integration utilities.
 *
 * Generates Google Calendar URLs and downloadable .ics files for sessions.
 */

interface CalendarSession {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  googleMeetLink?: string;
  workshopTitle?: string;
}

/**
 * Format a Date into the iCal basic format: YYYYMMDDTHHMMSSZ
 */
function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Build a Google Calendar event URL.
 */
export function buildGoogleCalendarUrl(session: CalendarSession): string {
  const start = toICSDate(new Date(session.startTime));
  const end = toICSDate(new Date(session.endTime));
  const title = encodeURIComponent(session.title);
  const details = encodeURIComponent(
    session.description || session.workshopTitle || '',
  );
  const location = encodeURIComponent(session.googleMeetLink || '');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

/**
 * Generate a minimal RFC 5545 .ics file and trigger a download.
 */
export function downloadIcsFile(session: CalendarSession): void {
  const start = toICSDate(new Date(session.startTime));
  const end = toICSDate(new Date(session.endTime));
  const now = toICSDate(new Date());
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@kalvivaayil`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kalvi Vaayil//Session//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(session.title)}`,
    session.description ? `DESCRIPTION:${escapeIcs(session.description)}` : '',
    session.googleMeetLink ? `LOCATION:${escapeIcs(session.googleMeetLink)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${session.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}
