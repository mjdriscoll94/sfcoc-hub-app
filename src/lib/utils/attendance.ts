export interface AttendanceHousehold {
  id: string;
  householdName: string;
  normalizedName: string;
  active: boolean;
  availableFrom: Date;
  isVisitor?: boolean;
  longTermExempt?: boolean;
}

export interface AttendanceRecord {
  id: string;
  serviceDate: Date;
  noService?: boolean;
  counts: Record<string, number>;
  exemptions?: Record<string, string>;
  visitorDetails?: Record<
    string,
    {
      notes?: string;
      wantedMoreInformation?: boolean;
      hasBeenContacted?: boolean;
      contactedBy?: string;
    }
  >;
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

interface AttendanceHistoryEntry {
  count?: number;
  exempt: boolean;
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

export interface ParsedHistoricalAttendanceLine {
  householdName: string;
  normalizedName: string;
  count?: number;
}

export const parseHistoricalAttendanceLines = (value: string): ParsedHistoricalAttendanceLine[] => {
  const lines: ParsedHistoricalAttendanceLine[] = [];

  for (const rawLine of value.split('\n')) {
    const cleaned = rawLine.trim();
    if (!cleaned) {
      continue;
    }

    const match = cleaned.match(/^(.*\S)\s+(\d+)\s*$/);
    const householdName = (match ? match[1] : cleaned).trim();
    const count = match ? Number(match[2]) : undefined;

    if (!householdName) {
      continue;
    }

    lines.push({
      householdName,
      normalizedName: normalizeAttendanceName(householdName),
      ...(typeof count === 'number' ? { count } : {}),
    });
  }

  return lines;
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

export const isHouseholdAvailableForSunday = (
  household: Pick<AttendanceHousehold, 'availableFrom'>,
  sunday: Date,
): boolean => household.availableFrom.getTime() <= getSundayForDate(sunday).getTime();

export const buildAttendanceAttention = (
  households: AttendanceHousehold[],
  records: AttendanceRecord[],
): AttendanceAttentionItem[] => {
  const sortedRecords = [...records].sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime());

  return households
    .filter((household) => !household.isVisitor && !household.longTermExempt)
    .map((household) => {
      const recentHistory = sortedRecords
        .filter((record) => !record.noService)
        .filter((record) => isHouseholdAvailableForSunday(household, record.serviceDate))
        .map<AttendanceHistoryEntry>((record) => ({
          count: record.counts[household.id],
          exempt: typeof record.exemptions?.[household.id] === 'string' && record.exemptions[household.id].trim().length > 0,
        }))
        .filter((entry) => typeof entry.count === 'number' || entry.exempt)
        .slice(0, 8);
      const nonExemptCounts = recentHistory
        .filter((entry): entry is { count: number; exempt: false } => typeof entry.count === 'number' && !entry.exempt)
        .map((entry) => entry.count);
      const recentCounts = recentHistory.map((entry) => (typeof entry.count === 'number' ? entry.count : 0));

      const conditions: AttendanceCondition[] = [];

      if (nonExemptCounts.length >= 2 && nonExemptCounts[0] === 0 && nonExemptCounts[1] === 0) {
        conditions.push({
          key: 'two_consecutive_misses',
          label: '2 consecutive misses',
          detail: 'Absent for the two most recent recorded Sundays.',
        });
      }

      if (nonExemptCounts.slice(0, 6).filter((count) => count === 0).length >= 3) {
        conditions.push({
          key: 'three_misses_in_six_weeks',
          label: '3 misses in 6 weeks',
          detail: 'Missed three of the last six recorded Sundays.',
        });
      }

      if (nonExemptCounts.slice(0, 8).filter((count) => count === 0).length >= 4) {
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
