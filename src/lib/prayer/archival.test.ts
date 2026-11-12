import { describe, expect, it } from 'vitest';
import { prayerArchiveAction } from './archival';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 10, 12);

describe('prayer request archival lifecycle', () => {
  it('warns the author seven days before archival', () => {
    expect(prayerArchiveAction({ now, lastActivityAt: now - (83 * DAY_MS) })).toBe('warn');
  });

  it('does not repeat a warning sent after the latest activity', () => {
    const lastActivityAt = now - (85 * DAY_MS);
    expect(prayerArchiveAction({ now, lastActivityAt, warningSentAt: lastActivityAt + DAY_MS })).toBe('none');
  });

  it('archives after 90 days without an update', () => {
    expect(prayerArchiveAction({ now, lastActivityAt: now - (90 * DAY_MS) })).toBe('archive');
  });

  it('uses a new update as the start of a new activity window', () => {
    expect(prayerArchiveAction({ now, lastActivityAt: now - (10 * DAY_MS), warningSentAt: now - (100 * DAY_MS) })).toBe('none');
  });
});
