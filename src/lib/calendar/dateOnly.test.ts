import { describe, expect, it } from 'vitest';
import { dateOnlyKeyFromUtc, localDateFromDateOnlyKey } from './dateOnly';
import { expandEventToInstances } from './recurrence';

describe('all-day calendar date handling', () => {
  it('keeps a Sunday occurrence on Sunday across a DST offset change', () => {
    const [occurrence] = expandEventToInstances(
      {
        id: 'life-group-sunday',
        title: 'Life Group Sunday',
        startDate: new Date('2026-05-17T05:00:00.000Z'),
        allDay: true,
        recurrenceType: 'monthly',
        recurrenceMonthlyMode: 'nthWeekday',
        recurrenceNthOccurrence: 3,
        recurrenceWeekday: 0,
      },
      new Date('2026-11-01T00:00:00.000Z'),
      new Date('2026-11-30T23:59:59.999Z')
    );

    expect(occurrence.title).toBe('Life Group Sunday');
    expect(dateOnlyKeyFromUtc(occurrence.startDate)).toBe('2026-11-15');
    const localDate = localDateFromDateOnlyKey('2026-11-15');
    expect(localDate?.getFullYear()).toBe(2026);
    expect(localDate?.getMonth()).toBe(10);
    expect(localDate?.getDate()).toBe(15);
    expect(localDate?.getDay()).toBe(0);
  });

  it('rejects malformed and impossible date keys', () => {
    expect(localDateFromDateOnlyKey('November 15')).toBeNull();
    expect(localDateFromDateOnlyKey('2026-02-30')).toBeNull();
  });
});
