import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttendanceAttention,
  getSundayForDate,
  getSundayKey,
  parseAttendanceHouseholds,
  type AttendanceHousehold,
  type AttendanceRecord,
} from '../attendance.ts';

test('parseAttendanceHouseholds trims bullets, numbering, and duplicates', () => {
  assert.deepEqual(
    parseAttendanceHouseholds('1. Smith Family\n- Jones Household\n\nsmith family\n\u2022 Brown'),
    ['Smith Family', 'Jones Household', 'Brown'],
  );
});

test('getSunday helpers normalize a weekday to that week Sunday', () => {
  const sunday = getSundayForDate(new Date(2026, 5, 18, 9, 30));
  assert.equal(getSundayKey(sunday), '2026-06-14');
});

test('buildAttendanceAttention returns active miss conditions', () => {
  const households: AttendanceHousehold[] = [
    { id: 'a', householdName: 'Adams', normalizedName: 'adams', active: true },
    { id: 'b', householdName: 'Baker', normalizedName: 'baker', active: true },
  ];

  const records: AttendanceRecord[] = [
    { id: '2026-06-14', serviceDate: new Date(2026, 5, 14), counts: { a: 0, b: 2 } },
    { id: '2026-06-07', serviceDate: new Date(2026, 5, 7), counts: { a: 0, b: 0 } },
    { id: '2026-05-31', serviceDate: new Date(2026, 4, 31), counts: { a: 1, b: 3 } },
    { id: '2026-05-24', serviceDate: new Date(2026, 4, 24), counts: { a: 0, b: 0 } },
    { id: '2026-05-17', serviceDate: new Date(2026, 4, 17), counts: { a: 4, b: 0 } },
    { id: '2026-05-10', serviceDate: new Date(2026, 4, 10), counts: { a: 0, b: 1 } },
  ];

  const attention = buildAttendanceAttention(households, records);

  assert.equal(attention.length, 2);
  assert.deepEqual(attention[0].conditions.map((condition) => condition.key), [
    'two_consecutive_misses',
    'three_misses_in_six_weeks',
    'four_misses_in_eight_weeks',
  ]);
  assert.deepEqual(attention[1].conditions.map((condition) => condition.key), [
    'three_misses_in_six_weeks',
  ]);
});
