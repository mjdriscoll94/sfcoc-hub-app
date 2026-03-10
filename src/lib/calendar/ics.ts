/**
 * Generate iCalendar (.ics) format string for calendar events.
 * Used for "Download .ics" and for the subscribe feed.
 */

export interface IcsEvent {
  id?: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  allDay?: boolean;
  location?: string;
}

function formatDateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** Escape text for iCal (backslash-escape special chars, fold long lines) */
function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line: string, maxLen = 75): string {
  if (line.length <= maxLen) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > maxLen) {
    parts.push(rest.slice(0, maxLen));
    rest = ' ' + rest.slice(maxLen);
  }
  if (rest.length > 0) parts.push(rest);
  return parts.join('\r\n');
}

export function toIcsString(
  events: IcsEvent[],
  calendarName: string = 'SFCoC Calendar'
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SFCoC//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:' + escapeIcalText(calendarName),
    'METHOD:PUBLISH',
  ];

  for (const ev of events) {
    const start = ev.startDate instanceof Date ? ev.startDate : new Date(ev.startDate);
    const end = ev.endDate
      ? (ev.endDate instanceof Date ? ev.endDate : new Date(ev.endDate))
      : new Date(start.getTime() + (ev.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));

    const uid = ev.id ? `sfcoc-${ev.id}@siouxfallschurchofchrist.org` : `sfcoc-${start.getTime()}@siouxfallschurchofchrist.org`;
    const now = new Date();
    const dtstamp = formatDateUTC(now);

    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + uid);
    lines.push('DTSTAMP:' + dtstamp);

    if (ev.allDay) {
      lines.push('DTSTART;VALUE=DATE:' + formatDateOnly(start));
      lines.push('DTEND;VALUE=DATE:' + formatDateOnly(end));
    } else {
      lines.push('DTSTART:' + formatDateUTC(start));
      lines.push('DTEND:' + formatDateUTC(end));
    }

    lines.push('SUMMARY:' + escapeIcalText(ev.title));
    if (ev.description) {
      lines.push('DESCRIPTION:' + escapeIcalText(ev.description));
    }
    if (ev.location) {
      lines.push('LOCATION:' + escapeIcalText(ev.location));
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map((line) => foldLine(line)).join('\r\n');
}
