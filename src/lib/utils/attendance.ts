export interface AttendanceHousehold {
  id: string;
  householdName: string;
  normalizedName: string;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  serviceDate: Date;
  counts: Record<string, number>;
}

export interface AttendanceCondition {
  key: 'two_consecutive_misses' | 'three_misses_in_six_weeks' | 'four_misses_in_eight_weeks';
  label: string;
  detail: string;
}

export interface AttendanceAttentionItem {
  householdId: string;
  householdName: string;
  recentCounts: number[];
  conditions: AttendanceCondition[];
}

export const normalizeAttendanceName = (value: string): string =>
  value
    .trim()
    .replace(/^\s*(?:[-*]|\u2022|\d+[.)])\s*/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const parseAttendanceHouseholds = (value: string): string[] => {
  const seen = new Set<string>();
  const households: string[] = [];

  for (const rawLine of value.split('\n')) {
    const cleaned = rawLine
      .trim()
      .replace(/^\s*(?:[-*]|\u2022|\d+[.)])\s*/, '')
      .replace(/\s+/g, ' ');

    if (!cleaned) {
      continue;
    }

    const normalized = cleaned.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    households.push(cleaned);
  }

  return households;
};

export const getSundayForDate = (value: Date): Date => {
  const sunday = new Date(value);
  sunday.setHours(12, 0, 0, 0);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return sunday;
};

export const getSundayKey = (value: Date): string => {
  const sunday = getSundayForDate(value);
  const year = sunday.getFullYear();
  const month = `${sunday.getMonth() + 1}`.padStart(2, '0');
  const day = `${sunday.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDateFromSundayKey = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
};

export const buildAttendanceAttention = (
  households: AttendanceHousehold[],
  records: AttendanceRecord[],
): AttendanceAttentionItem[] => {
  const sortedRecords = [...records].sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime());

  return households
    .map((household) => {
      const recentCounts = sortedRecords
        .map((record) => record.counts[household.id])
        .filter((count): count is number => typeof count === 'number')
        .slice(0, 8);

      const conditions: AttendanceCondition[] = [];

      if (recentCounts.length >= 2 && recentCounts[0] === 0 && recentCounts[1] === 0) {
        conditions.push({
          key: 'two_consecutive_misses',
          label: '2 consecutive misses',
          detail: 'Absent for the two most recent recorded Sundays.',
        });
      }

      if (recentCounts.slice(0, 6).filter((count) => count === 0).length >= 3) {
        conditions.push({
          key: 'three_misses_in_six_weeks',
          label: '3 misses in 6 weeks',
          detail: 'Missed three of the last six recorded Sundays.',
        });
      }

      if (recentCounts.slice(0, 8).filter((count) => count === 0).length >= 4) {
        conditions.push({
          key: 'four_misses_in_eight_weeks',
          label: '4 misses in 8 weeks',
          detail: 'Missed four of the last eight recorded Sundays.',
        });
      }

      return {
        householdId: household.id,
        householdName: household.householdName,
        recentCounts,
        conditions,
      };
    })
    .filter((item) => item.conditions.length > 0)
    .sort((a, b) => {
      if (b.conditions.length !== a.conditions.length) {
        return b.conditions.length - a.conditions.length;
      }

      return a.householdName.localeCompare(b.householdName);
    });
};
