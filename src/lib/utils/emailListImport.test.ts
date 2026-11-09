import { describe, expect, it } from 'vitest';
import {
  analyzeEmailsFromRawText,
  normalizeEmailListEntries,
  parseEmailsFromRawText,
} from './emailListImport';

describe('email list normalization', () => {
  it('keeps unique addresses and counts case-insensitive duplicates', () => {
    expect(
      normalizeEmailListEntries([
        'Member@example.com',
        'member@example.com',
        ' second@example.com ',
        'MEMBER@example.com',
      ])
    ).toEqual({
      emails: ['member@example.com', 'second@example.com'],
      duplicatesRemoved: 2,
    });
  });

  it('does not count invalid entries as duplicates', () => {
    expect(normalizeEmailListEntries(['not-an-email', 'member@example.com'])).toEqual({
      emails: ['member@example.com'],
      duplicatesRemoved: 0,
    });
  });
});

describe('email list text parsing', () => {
  it('finds addresses in CSV-like text and reports repeated occurrences', () => {
    const result = analyzeEmailsFromRawText(
      'Name,Email\nJane,jane@example.com\nJohn,JOHN@example.com\nJane Again,jane@example.com'
    );

    expect(result.entries).toEqual([
      'jane@example.com',
      'john@example.com',
      'jane@example.com',
    ]);
    expect(result.emails).toEqual(['jane@example.com', 'john@example.com']);
    expect(result.duplicatesRemoved).toBe(1);
  });

  it('preserves the existing unique sorted parser result', () => {
    expect(parseEmailsFromRawText('z@example.com; A@example.com; z@example.com')).toEqual([
      'a@example.com',
      'z@example.com',
    ]);
  });
});
