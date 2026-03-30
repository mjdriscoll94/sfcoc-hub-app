import { addDays, addWeeks, addMonths, addYears, endOfDay, startOfWeek } from 'date-fns';
import type { CalendarEvent, RecurrenceType } from '@/lib/firebase/models';

/** Map Firestore document data (client or admin SDK) to CalendarEvent */
export function calendarEventFromFirestore(id: string, d: Record<string, unknown>): CalendarEvent {
  const startDate = (d.startDate as { toDate?: () => Date })?.toDate?.() ?? new Date(d.startDate as string);
  const endRaw = d.endDate;
  const endDate =
    endRaw != null
      ? (endRaw as { toDate?: () => Date }).toDate?.() ?? new Date(endRaw as string)
      : undefined;
  const untilRaw = d.recurrenceUntil;
  const recurrenceUntil =
    untilRaw != null
      ? (untilRaw as { toDate?: () => Date }).toDate?.() ?? new Date(untilRaw as string)
      : undefined;
  const rt = (d.recurrenceType as RecurrenceType | undefined) ?? 'none';
  const monthlyMode = (d.recurrenceMonthlyMode as CalendarEvent['recurrenceMonthlyMode']) ?? 'sameDay';
  const nth = d.recurrenceNthOccurrence;
  const wd = d.recurrenceWeekday;
  const interval = d.recurrenceInterval;
  const byWeekday = d.recurrenceByWeekday;
  return {
    id,
    title: (d.title as string) ?? '',
    description: d.description as string | undefined,
    startDate,
    endDate,
    allDay: (d.allDay as boolean) ?? false,
    location: d.location as string | undefined,
    categoryId: d.categoryId as string | undefined,
    categoryName: d.categoryName as string | undefined,
    categoryColor: d.categoryColor as string | undefined,
    createdAt: (d.createdAt as { toDate?: () => Date })?.toDate?.(),
    createdBy: d.createdBy as string | undefined,
    recurrenceType: rt,
    recurrenceInterval: typeof interval === 'number' && interval > 0 ? interval : undefined,
    recurrenceUntil,
    hasRecurrence: (d.hasRecurrence as boolean | undefined) ?? rt !== 'none',
    recurrenceByWeekday: Array.isArray(byWeekday) ? (byWeekday as unknown[]).filter((x) => typeof x === 'number') as number[] : undefined,
    recurrenceMonthlyMode: monthlyMode,
    recurrenceNthOccurrence: typeof nth === 'number' ? nth : undefined,
    recurrenceWeekday: typeof wd === 'number' ? wd : undefined,
    parentEventId: undefined,
  };
}

const MAX_SERIES_YEARS = 3;
const MAX_ITERATIONS = 4000;

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Nth weekday of a calendar month. nth: 1–5 = first through fifth; -1 = last.
 * Returns null if the nth weekday does not exist (e.g. fifth Tuesday).
 */
export function getNthWeekdayInMonth(
  year: number,
  monthIndex: number,
  nth: number,
  weekday: number
): Date | null {
  if (nth === -1) {
    const lastDay = new Date(year, monthIndex + 1, 0);
    for (let day = lastDay.getDate(); day >= 1; day--) {
      const dt = new Date(year, monthIndex, day);
      if (dt.getDay() === weekday) return dt;
    }
    return null;
  }
  const first = new Date(year, monthIndex, 1);
  const firstDow = first.getDay();
  const offset = (weekday - firstDow + 7) % 7;
  const dayOfMonth = 1 + offset + 7 * (nth - 1);
  const result = new Date(year, monthIndex, dayOfMonth);
  if (result.getMonth() !== monthIndex) return null;
  return result;
}

function applyTimeFrom(baseTime: Date, on: Date): Date {
  const out = new Date(on);
  out.setHours(
    baseTime.getHours(),
    baseTime.getMinutes(),
    baseTime.getSeconds(),
    baseTime.getMilliseconds()
  );
  return out;
}

function nextOccurrenceSimple(from: Date, type: RecurrenceType, interval: number): Date {
  switch (type) {
    case 'daily':
      return addDays(from, interval);
    case 'weekly':
      return addWeeks(from, interval);
    case 'monthly':
      return addMonths(from, interval);
    case 'yearly':
      return addYears(from, interval);
    default:
      return addDays(from, 1);
  }
}

function advanceMonth(year: number, month: number): [number, number] {
  let m = month + 1;
  let y = year;
  if (m > 11) {
    m = 0;
    y += 1;
  }
  return [y, m];
}

function expandMonthlyNthWeekday(
  base: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
  seriesEnd: Date,
  durationMs: number
): CalendarEvent[] {
  const nth = base.recurrenceNthOccurrence ?? 1;
  const weekday = base.recurrenceWeekday ?? 0;
  const timeSrc = base.startDate;

  const at = (year: number, month: number): Date | null => {
    const d = getNthWeekdayInMonth(year, month, nth, weekday);
    if (!d) return null;
    return applyTimeFrom(timeSrc, d);
  };

  let y = base.startDate.getFullYear();
  let m = base.startDate.getMonth();
  const out: CalendarEvent[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const c = at(y, m);
    if (!c) {
      [y, m] = advanceMonth(y, m);
      continue;
    }
    if (c > seriesEnd) break;
    if (c >= rangeStart && c <= rangeEnd) {
      const instStart = new Date(c);
      const instEnd = new Date(instStart.getTime() + durationMs);
      const dateKey = toDateKey(instStart.getFullYear(), instStart.getMonth(), instStart.getDate());
      const parentId = base.id ?? 'event';
      out.push({
        ...base,
        id: `${parentId}__${dateKey}`,
        parentEventId: base.id,
        startDate: instStart,
        endDate: instEnd,
      });
    }
    [y, m] = advanceMonth(y, m);
  }

  return out;
}

function expandWeeklyByWeekday(
  base: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
  seriesEnd: Date,
  durationMs: number,
  intervalWeeks: number,
  weekdays: number[]
): CalendarEvent[] {
  const sorted = [...new Set(weekdays)]
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return [];

  const baseStart = base.startDate;
  const baseWeekStart = startOfWeek(baseStart, { weekStartsOn: 0 }); // Sunday
  const timeSrc = baseStart;

  const out: CalendarEvent[] = [];
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const wkStart = addWeeks(baseWeekStart, i * intervalWeeks);
    for (const wd of sorted) {
      const day = new Date(wkStart);
      day.setDate(day.getDate() + wd);
      const occStart = applyTimeFrom(timeSrc, day);
      if (occStart < baseStart) continue; // don't generate before first occurrence
      if (occStart > seriesEnd) return out;
      if (occStart < rangeStart || occStart > rangeEnd) continue;

      const instStart = new Date(occStart);
      const instEnd = new Date(instStart.getTime() + durationMs);
      const dateKey = toDateKey(instStart.getFullYear(), instStart.getMonth(), instStart.getDate());
      const parentId = base.id ?? 'event';
      out.push({
        ...base,
        id: `${parentId}__${dateKey}`,
        parentEventId: base.id,
        startDate: instStart,
        endDate: instEnd,
      });
    }
  }
  return out;
}

/**
 * Expand a stored calendar event into display instances for [rangeStart, rangeEnd].
 * Non-recurring: one instance if its start falls in range.
 * Recurring: virtual instances with id `${parentId}__YYYY-MM-DD` and parentEventId set.
 */
export function expandEventToInstances(
  base: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const r = base.recurrenceType;
  if (!r || r === 'none') {
    const s = base.startDate;
    if (s >= rangeStart && s <= rangeEnd) {
      return [base];
    }
    return [];
  }

  const durationMs = (base.endDate ?? base.startDate).getTime() - base.startDate.getTime();
  const seriesEnd = base.recurrenceUntil
    ? endOfDay(base.recurrenceUntil)
    : endOfDay(addYears(base.startDate, MAX_SERIES_YEARS));
  const interval = Math.max(1, base.recurrenceInterval ?? 1);

  if (
    r === 'monthly' &&
    base.recurrenceMonthlyMode === 'nthWeekday' &&
    base.recurrenceNthOccurrence != null &&
    base.recurrenceWeekday != null
  ) {
    return expandMonthlyNthWeekday(base, rangeStart, rangeEnd, seriesEnd, durationMs);
  }

  if (r === 'weekly' && base.recurrenceByWeekday && base.recurrenceByWeekday.length > 0) {
    return expandWeeklyByWeekday(
      base,
      rangeStart,
      rangeEnd,
      seriesEnd,
      durationMs,
      interval,
      base.recurrenceByWeekday
    );
  }

  let cursor = new Date(base.startDate);
  let iterations = 0;

  while (cursor < rangeStart && cursor <= seriesEnd && iterations < MAX_ITERATIONS) {
    cursor = nextOccurrenceSimple(cursor, r, interval);
    iterations++;
  }

  const out: CalendarEvent[] = [];
  iterations = 0;
  while (cursor <= rangeEnd && cursor <= seriesEnd && iterations < MAX_ITERATIONS) {
    const instStart = new Date(cursor);
    const instEnd = new Date(instStart.getTime() + durationMs);
    const dateKey = toDateKey(instStart.getFullYear(), instStart.getMonth(), instStart.getDate());
    const parentId = base.id ?? 'event';
    out.push({
      ...base,
      id: `${parentId}__${dateKey}`,
      parentEventId: base.id,
      startDate: instStart,
      endDate: instEnd,
    });
    cursor = nextOccurrenceSimple(cursor, r, interval);
    iterations++;
  }

  return out;
}

/** Dedupe by Firestore id, merge query results */
export function dedupeEventsById(events: CalendarEvent[]): CalendarEvent[] {
  const map = new Map<string, CalendarEvent>();
  for (const ev of events) {
    if (ev.id) map.set(ev.id, ev);
  }
  return [...map.values()];
}

export function expandAllEvents(
  raw: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const unique = dedupeEventsById(raw);
  const expanded: CalendarEvent[] = [];
  for (const ev of unique) {
    expanded.push(...expandEventToInstances(ev, rangeStart, rangeEnd));
  }
  expanded.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  return expanded;
}
