import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBirthdayMemberName, parseBirthdayImport } from '../birthdayImport.ts';

test('parseBirthdayImport accepts month/day lines and stores no year', () => {
  const result = parseBirthdayImport('Jane Smith, 04/15\nJohn Doe 11/02');

  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.entries.map(({ name, date }) => ({ name, date })), [
    { name: 'Jane Smith', date: '04-15' },
    { name: 'John Doe', date: '11-02' },
  ]);
});

test('parseBirthdayImport accepts but discards a supplied year', () => {
  const result = parseBirthdayImport('Jane Smith\t04/15/1985');

  assert.equal(result.errors.length, 0);
  assert.equal(result.entries[0].date, '04-15');
});

test('parseBirthdayImport reports invalid formats and calendar dates', () => {
  const result = parseBirthdayImport('Jane Smith, 2/3\nJohn Doe, 02/30');

  assert.equal(result.entries.length, 0);
  assert.deepEqual(result.errors.map(({ lineNumber, reason }) => ({ lineNumber, reason })), [
    { lineNumber: 1, reason: 'Expected: First Last, mm/dd' },
    { lineNumber: 2, reason: 'Invalid calendar date' },
  ]);
});

test('normalizeBirthdayMemberName tolerates punctuation, accents, and spacing', () => {
  assert.equal(normalizeBirthdayMemberName("  José   O'Neil-Smith "), 'jose o neil smith');
});

