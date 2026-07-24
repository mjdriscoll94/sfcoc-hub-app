import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAttendanceAttention,
  getSundayForDate,
  getSundayKey,
  isHouseholdAvailableForSunday,
  parseHistoricalAttendanceLines,
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

test('parseHistoricalAttendanceLines keeps blank-count households and trailing counts', () => {
  assert.deepEqual(parseHistoricalAttendanceLines('Renli, Mason 4\nSmith Family\nJones 0'), [
    { householdName: 'Renli, Mason', normalizedName: 'renli, mason', count: 4 },
    { householdName: 'Smith Family', normalizedName: 'smith family' },
    { householdName: 'Jones', normalizedName: 'jones', count: 0 },
  ]);
});

test('parseHistoricalAttendanceLines accepts pasted bullets and parenthesized counts', () => {
  assert.deepEqual(parseHistoricalAttendanceLines('\u2022 Smith Family (4)\n- Jones 0'), [
    { householdName: 'Smith Family', normalizedName: 'smith family', count: 4 },
    { householdName: 'Jones', normalizedName: 'jones', count: 0 },
  ]);
});

test('getSunday helpers normalize a weekday to that week Sunday', () => {
  const sunday = getSundayForDate(new Date(2026, 5, 18, 9, 30));
  assert.equal(getSundayKey(sunday), '2026-06-14');
});

test('isHouseholdAvailableForSunday only allows current and future Sundays', () => {
  const household: AttendanceHousehold = {
    id: 'a',
    householdName: 'Adams',
    normalizedName: 'adams',
    active: true,
    availableFrom: new Date(2026, 5, 14),
  };

  assert.equal(isHouseholdAvailableForSunday(household, new Date(2026, 5, 14)), true);
  assert.equal(isHouseholdAvailableForSunday(household, new Date(2026, 5, 21)), true);
  assert.equal(isHouseholdAvailableForSunday(household, new Date(2026, 5, 7)), false);
});

test('buildAttendanceAttention returns active miss conditions', () => {
  const households: AttendanceHousehold[] = [
    { id: 'a', householdName: 'Adams', normalizedName: 'adams', active: true, availableFrom: new Date(2026, 0, 4) },
    { id: 'b', householdName: 'Baker', normalizedName: 'baker', active: true, availableFrom: new Date(2026, 0, 4) },
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

test('buildAttendanceAttention ignores exempt absences', () => {
  const households: AttendanceHousehold[] = [
    { id: 'a', householdName: 'Adams', normalizedName: 'adams', active: true, availableFrom: new Date(2026, 0, 4) },
  ];

  const records: AttendanceRecord[] = [
    { id: '2026-06-14', serviceDate: new Date(2026, 5, 14), counts: { a: 0 }, exemptions: { a: 'Preaching elsewhere' } },
    { id: '2026-06-07', serviceDate: new Date(2026, 5, 7), counts: { a: 0 } },
    { id: '2026-05-31', serviceDate: new Date(2026, 4, 31), counts: { a: 2 } },
  ];

  const attention = buildAttendanceAttention(households, records);

  assert.equal(attention.length, 0);
});

test('buildAttendanceAttention ignores visitor households', () => {
  const households: AttendanceHousehold[] = [
    { id: 'v', householdName: 'Visitor Family', normalizedName: 'visitor family', active: true, availableFrom: new Date(2026, 0, 4), isVisitor: true },
  ];

  const records: AttendanceRecord[] = [
    { id: '2026-06-14', serviceDate: new Date(2026, 5, 14), counts: { v: 0 } },
    { id: '2026-06-07', serviceDate: new Date(2026, 5, 7), counts: { v: 0 } },
    { id: '2026-05-31', serviceDate: new Date(2026, 4, 31), counts: { v: 0 } },
  ];

  const attention = buildAttendanceAttention(households, records);

  assert.equal(attention.length, 0);
});

test('buildAttendanceAttention ignores long-term exempt households', () => {
  const households: AttendanceHousehold[] = [
    { id: 'x', householdName: 'Extended Trip', normalizedName: 'extended trip', active: true, availableFrom: new Date(2026, 0, 4), longTermExempt: true },
  ];

  const records: AttendanceRecord[] = [
    { id: '2026-06-14', serviceDate: new Date(2026, 5, 14), counts: { x: 0 } },
    { id: '2026-06-07', serviceDate: new Date(2026, 5, 7), counts: { x: 0 } },
  ];

  const attention = buildAttendanceAttention(households, records);

  assert.equal(attention.length, 0);
});

test('buildAttendanceAttention ignores no-service Sundays', () => {
  const households: AttendanceHousehold[] = [
    { id: 'a', householdName: 'Adams', normalizedName: 'adams', active: true, availableFrom: new Date(2026, 0, 4) },
  ];

  const records: AttendanceRecord[] = [
    { id: '2026-06-14', serviceDate: new Date(2026, 5, 14), noService: true, counts: { a: 0 } },
    { id: '2026-06-07', serviceDate: new Date(2026, 5, 7), counts: { a: 0 } },
    { id: '2026-05-31', serviceDate: new Date(2026, 4, 31), counts: { a: 3 } },
  ];

  const attention = buildAttendanceAttention(households, records);

  assert.equal(attention.length, 0);
});

test('buildAttendanceAttention honors reset dates and five consecutive misses', () => {
  const households: AttendanceHousehold[] = [
    {
      id: 'a',
      householdName: 'Adams',
      normalizedName: 'adams',
      active: true,
      availableFrom: new Date(2026, 0, 4),
      attentionResetAt: new Date(2026, 5, 8),
    },
  ];

  const records: AttendanceRecord[] = [
    { id: '2026-06-14', serviceDate: new Date(2026, 5, 14), counts: { a: 0 } },
    { id: '2026-06-07', serviceDate: new Date(2026, 5, 7), counts: { a: 0 } },
    { id: '2026-05-31', serviceDate: new Date(2026, 4, 31), counts: { a: 0 } },
    { id: '2026-05-24', serviceDate: new Date(2026, 4, 24), counts: { a: 0 } },
    { id: '2026-05-17', serviceDate: new Date(2026, 4, 17), counts: { a: 0 } },
    { id: '2026-05-10', serviceDate: new Date(2026, 4, 10), counts: { a: 0 } },
  ];

  const attention = buildAttendanceAttention(households, records);

  assert.equal(attention.length, 0);

  households[0].attentionResetAt = undefined;
  const fullAttention = buildAttendanceAttention(households, records);
  assert.deepEqual(fullAttention[0].conditions.map((condition) => condition.key), [
    'five_consecutive_misses',
    'two_consecutive_misses',
    'three_misses_in_six_weeks',
    'four_misses_in_eight_weeks',
  ]);
});
