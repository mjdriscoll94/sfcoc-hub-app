export const PRAYER_ARCHIVE_AFTER_DAYS = 90;
export const PRAYER_ARCHIVE_WARNING_AFTER_DAYS = 83;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PrayerArchiveAction = 'none' | 'warn' | 'archive';

export function prayerArchiveAction(args: {
  now: number;
  lastActivityAt: number;
  warningSentAt?: number;
}): PrayerArchiveAction {
  const inactiveDays = (args.now - args.lastActivityAt) / DAY_MS;
  if (inactiveDays >= PRAYER_ARCHIVE_AFTER_DAYS) return 'archive';
  if (
    inactiveDays >= PRAYER_ARCHIVE_WARNING_AFTER_DAYS
    && (args.warningSentAt ?? 0) < args.lastActivityAt
  ) return 'warn';
  return 'none';
}
