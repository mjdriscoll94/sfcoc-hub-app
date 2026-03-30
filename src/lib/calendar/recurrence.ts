import { addDays, addWeeks, addMonths, addYears, endOfDay } from 'date-fns';
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
    recurrenceUntil,
    hasRecurrence: (d.hasRecurrence as boolean | undefined) ?? rt !== 'none',
    parentEventId: undefined,
  };
}

const MAX_SERIES_YEARS = 3;
const MAX_ITERATIONS = 4000;

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function nextOccurrence(from: Date, type: RecurrenceType): Date {
  switch (type) {
    case 'daily':
      return addDays(from, 1);
    case 'weekly':
      return addWeeks(from, 1);
    case 'monthly':
      return addMonths(from, 1);
    case 'yearly':
      return addYears(from, 1);
    default:
      return addDays(from, 1);
  }
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

  let cursor = new Date(base.startDate);
  let iterations = 0;

  while (cursor < rangeStart && cursor <= seriesEnd && iterations < MAX_ITERATIONS) {
    cursor = nextOccurrence(cursor, r);
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
    cursor = nextOccurrence(cursor, r);
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
