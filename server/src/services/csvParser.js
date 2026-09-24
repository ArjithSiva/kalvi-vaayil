import csv from 'csv-parser';
import { Readable } from 'stream';

/**
 * Parse a Google Meet attendance CSV and extract emails.
 * Google Meet attendance reports typically have columns like:
 * "Name", "Email", "Join Time", "Leave Time", etc.
 * 
 * @param {Buffer} csvBuffer - The CSV file buffer
 * @returns {Promise<{emails: string[], unmatched: string[]}>}
 */
export function parseMeetCSV(csvBuffer) {
  return new Promise((resolve, reject) => {
    const emails = [];
    const stream = Readable.from(csvBuffer);

    stream
      .pipe(csv())
      .on('headers', (headers) => {
        // Try to find the email column (case-insensitive)
        const emailCol = headers.find(
          (h) => h.toLowerCase().trim() === 'email' || h.toLowerCase().trim() === 'email address'
        );
        if (!emailCol) {
          reject(new Error('CSV must contain an "Email" column'));
        }
        stream.emailColumn = emailCol;
      })
      .on('data', (row) => {
        const email = row[stream.emailColumn]?.trim().toLowerCase();
        if (email) emails.push(email);
      })
      .on('end', () => {
        // Deduplicate
        resolve([...new Set(emails)]);
      })
      .on('error', reject);
  });
}

/**
 * Match CSV emails against registered participant emails.
 * @param {string[]} csvEmails - Emails from CSV
 * @param {Array} registeredParticipants - Array of { _id, email } objects
 * @returns {{ matched: Array, unmatched: string[] }}
 */
export function matchEmails(csvEmails, registeredParticipants) {
  const emailToUser = new Map(
    registeredParticipants.map((p) => [p.email.toLowerCase(), p])
  );

  const matched = [];
  const unmatched = [];

  for (const email of csvEmails) {
    const user = emailToUser.get(email);
    if (user) {
      matched.push(user);
    } else {
      unmatched.push(email);
    }
  }

  return { matched, unmatched };
}

export default { parseMeetCSV, matchEmails };
