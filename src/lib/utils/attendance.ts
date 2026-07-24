export interface AttendanceHousehold {
  id: string;
  householdName: string;
  normalizedName: string;
  active: boolean;
  availableFrom: Date;
  isVisitor?: boolean;
  longTermExempt?: boolean;
  attentionResetAt?: Date;
  visitorResetAt?: Date;
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
  key: 'two_consecutive_misses' | 'three_misses_in_six_weeks' | 'four_misses_in_eight_weeks' | 'five_consecutive_misses';
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

export interface AttendanceImportSunday {
  serviceDate: Date;
  entries: ParsedHistoricalAttendanceLine[];
  noService: boolean;
}

export interface AttendanceImportParseResult {
  sundays: AttendanceImportSunday[];
  errors: string[];
}

export const parseHistoricalAttendanceLines = (value: string): ParsedHistoricalAttendanceLine[] => {
  const lines: ParsedHistoricalAttendanceLine[] = [];

  for (const rawLine of value.split('\n')) {
    const cleaned = rawLine
      .trim()
      .replace(/^\s*(?:[-*]|\u2022|\d+[.)])\s*/, '');
    if (!cleaned) {
      continue;
    }

    const match = cleaned.match(/^(.*\S)\s+\(?(\d+)\)?\s*$/);
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

export const parseAttendanceImport = (value: string): AttendanceImportParseResult => {
  const sundays: AttendanceImportSunday[] = [];
  const errors: string[] = [];
  let currentDate: Date | null = null;
  let currentLines: string[] = [];

  const saveCurrentSunday = () => {
    if (!currentDate) return;

    const entries = parseHistoricalAttendanceLines(currentLines.join('\n')).filter((entry) => typeof entry.count === 'number');
    sundays.push({ serviceDate: currentDate, entries, noService: entries.length === 0 });
  };

  const lines = value.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) continue;

    const dateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(line);
    if (dateMatch) {
      saveCurrentSunday();
      const year = dateMatch[3].length === 2 ? 2000 + Number(dateMatch[3]) : Number(dateMatch[3]);
      const serviceDate = new Date(year, Number(dateMatch[1]) - 1, Number(dateMatch[2]), 12, 0, 0, 0);
      if (
        serviceDate.getFullYear() !== year ||
        serviceDate.getMonth() !== Number(dateMatch[1]) - 1 ||
        serviceDate.getDate() !== Number(dateMatch[2])
      ) {
        errors.push(`Invalid date on line ${index + 1}: ${line}`);
        currentDate = null;
        currentLines = [];
      } else {
        currentDate = getSundayForDate(serviceDate);
        currentLines = [];
      }
      continue;
    }

    if (!currentDate) {
      errors.push(`Attendance entry before a date on line ${index + 1}: ${line}`);
      continue;
    }
    currentLines.push(line);
  }

  saveCurrentSunday();
  return { sundays, errors };
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
        .filter((record) => !household.attentionResetAt || record.serviceDate.getTime() > household.attentionResetAt.getTime())
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

      if (nonExemptCounts.length >= 5 && nonExemptCounts.slice(0, 5).every((count) => count === 0)) {
        conditions.push({
          key: 'five_consecutive_misses',
          label: '5 weeks in a row',
          detail: 'Absent for five consecutive recorded Sundays.',
        });
      }

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
