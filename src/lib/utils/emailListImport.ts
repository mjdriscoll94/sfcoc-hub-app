/**
 * Parse emails from pasted text or CSV exports (any column, quoted fields, headers).
 * Collects tokens split by whitespace/newlines/commas/tabs and scans for embedded addresses.
 */

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;

function isValidEmail(addr: string): boolean {
  const t = addr.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function cleanCell(s: string): string {
  return s.trim().replace(/^["']+|["']+$/g, '').trim();
}

export type NormalizedEmailList = {
  emails: string[];
  duplicatesRemoved: number;
};

export function normalizeEmailListEntries(entries: string[]): NormalizedEmailList {
  const emails: string[] = [];
  const seen = new Set<string>();
  let duplicatesRemoved = 0;

  for (const entry of entries) {
    const email = entry.trim().toLowerCase();
    if (!isValidEmail(email)) continue;
    if (seen.has(email)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(email);
    emails.push(email);
  }

  return { emails, duplicatesRemoved };
}

export function extractEmailEntriesFromRawText(text: string): string[] {
  const entries: string[] = [];

  for (const token of text.split(/[\n,;\t]+/)) {
    const cell = cleanCell(token);
    if (!cell) continue;

    const matches = cell.match(new RegExp(EMAIL_REGEX.source, 'gi')) ?? [];
    if (matches.length > 0) {
      entries.push(...matches.map((email) => email.toLowerCase()));
    } else if (isValidEmail(cell)) {
      entries.push(cell.toLowerCase());
    }
  }

  return entries;
}

export function analyzeEmailsFromRawText(text: string): NormalizedEmailList & { entries: string[] } {
  const entries = extractEmailEntriesFromRawText(text);
  const normalized = normalizeEmailListEntries(entries);
  return {
    entries,
    emails: [...normalized.emails].sort(),
    duplicatesRemoved: normalized.duplicatesRemoved,
  };
}

export function parseEmailsFromRawText(text: string): string[] {
  return analyzeEmailsFromRawText(text).emails;
}

/** Derive a human-readable list name from an uploaded file name (e.g. "ministry_leaders.csv"). */
export function listNameFromFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/i, '');
  const spaced = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced || 'Imported list';
}
