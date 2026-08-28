export interface ParsedBirthdayImportLine {
  lineNumber: number;
  original: string;
  name: string;
  normalizedName: string;
  date: string;
}

export interface BirthdayImportParseError {
  lineNumber: number;
  original: string;
  reason: string;
}

export interface BirthdayImportParseResult {
  entries: ParsedBirthdayImportLine[];
  errors: BirthdayImportParseError[];
}

export const normalizeBirthdayMemberName = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export const parseBirthdayImport = (value: string): BirthdayImportParseResult => {
  const entries: ParsedBirthdayImportLine[] = [];
  const errors: BirthdayImportParseError[] = [];

  value.split(/\r?\n/).forEach((rawLine, index) => {
    const original = rawLine.trim();
    if (!original) return;

    const match = /^(.*?)\s*(?:,\s*|\t+|\s+)(\d{2})\/(\d{2})(?:\/(\d{4}))?$/.exec(original);
    if (!match || !match[1].trim()) {
      errors.push({
        lineNumber: index + 1,
        original,
        reason: 'Expected: First Last, mm/dd',
      });
      return;
    }

    const month = Number(match[2]);
    const day = Number(match[3]);
    const year = match[4] ? Number(match[4]) : 2000;
    const parsedDate = new Date(year, month - 1, day, 12);
    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      errors.push({ lineNumber: index + 1, original, reason: 'Invalid calendar date' });
      return;
    }

    const name = match[1].trim().replace(/\s+/g, ' ');
    entries.push({
      lineNumber: index + 1,
      original,
      name,
      normalizedName: normalizeBirthdayMemberName(name),
      date: `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  });

  return { entries, errors };
};
