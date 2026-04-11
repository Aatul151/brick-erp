import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * Format a date value for display using dayjs.
 * API timestamps are stored in UTC - we parse as UTC and display in user's local timezone.
 *
 * @param {string|Date|number|null|undefined} date - Date value to format (UTC from API)
 * @param {string} [format='DD MMM YYYY hh:mm A'] - dayjs format string. Common tokens:
 *   Date: DD (padded day), D (day), MMM (short month), MMMM (full month), MM (padded month), M (month), YYYY (year), YY (2-digit year)
 *   Time: hh (12h padded), h (12h), HH (24h padded), H (24h), mm (minutes), ss (seconds), A (AM/PM)
 * @param {string} [fallback='-'] - Value to return when date is invalid
 * @returns {string} Formatted date string in user's local timezone, or fallback
 */
export function formatDate(date, format = 'DD MMM YYYY hh:mm A', fallback = '-') {
  if (date == null || date === '') return fallback;
  const d = dayjs.utc(date).local();
  if (!d.isValid()) return fallback;
  return d.format(format);
}
