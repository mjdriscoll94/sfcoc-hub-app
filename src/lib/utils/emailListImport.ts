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

export function parseEmailsFromRawText(text: string): string[] {
  const set = new Set<string>();

  for (const token of text.split(/[\n,;\t]+/)) {
    const cell = cleanCell(token);
    if (cell && isValidEmail(cell)) set.add(cell.toLowerCase());
  }

  let m: RegExpExecArray | null;
  const re = new RegExp(EMAIL_REGEX.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    const addr = m[0].toLowerCase();
    if (isValidEmail(addr)) set.add(addr);
  }

  return [...set].sort();
}

/** Derive a human-readable list name from an uploaded file name (e.g. "ministry_leaders.csv"). */
export function listNameFromFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/i, '');
  const spaced = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced || 'Imported list';
}
