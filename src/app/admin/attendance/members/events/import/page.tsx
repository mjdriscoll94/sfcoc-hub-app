'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp, collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { Clipboard, Upload } from 'lucide-react';
import BackButton from '@/components/BackButton';
import AttendanceTabs from '@/components/AttendanceTabs';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { normalizeBirthdayMemberName, parseBirthdayImport, type ParsedBirthdayImportLine } from '@/lib/utils/birthdayImport';
import { canManageAttendance } from '@/types/roles';

interface ImportantEvent {
  id: string;
  type: 'birthday' | 'baptism' | 'attendanceStart' | 'anniversary' | 'passedAway' | 'other';
  date: string;
  title: string;
  notes?: string;
}

interface HouseholdPerson {
  id: string;
  firstName: string;
  lastName: string;
  importantEvents: ImportantEvent[];
}

interface StoredHousehold {
  id: string;
  householdName: string;
  members: HouseholdPerson[];
}

interface LocatedPerson {
  household: StoredHousehold;
  person: HouseholdPerson;
}

interface ImportIssue {
  line: string;
  reason: string;
}

const commitHouseholds = async (households: StoredHousehold[]) => {
  for (let index = 0; index < households.length; index += 450) {
    const batch = writeBatch(db);
    households.slice(index, index + 450).forEach((household) => {
      batch.update(doc(db, 'attendanceHouseholds', household.id), {
        members: household.members,
        updatedAt: Timestamp.now(),
      });
    });
    await batch.commit();
  }
};

const formatIssues = (issues: ImportIssue[]) => issues.map((issue) => `${issue.line} — ${issue.reason}`).join('\n');

export default function BirthdayImportPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unresolvedText, setUnresolvedText] = useState('');
  const [copied, setCopied] = useState(false);
  const parsedImport = useMemo(() => parseBirthdayImport(importText), [importText]);

  useEffect(() => {
    document.title = 'Birthday Import | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !canManageAttendance(userProfile)) router.push('/');
  }, [router, userProfile]);

  if (!userProfile || !canManageAttendance(userProfile)) return null;

  const handleImport = async () => {
    if (!parsedImport.entries.length && !parsedImport.errors.length) {
      setError('Paste at least one name and birthday before importing.');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setMessage(null);
      setUnresolvedText('');
      setCopied(false);

      const snapshot = await getDocs(collection(db, 'attendanceHouseholds'));
      const households: StoredHousehold[] = snapshot.docs.flatMap((householdSnapshot) => {
        const data = householdSnapshot.data() as { householdName?: string; active?: boolean; members?: HouseholdPerson[] };
        if (data.active === false) return [];
        return [{
          id: householdSnapshot.id,
          householdName: data.householdName || 'Unnamed Household',
          members: Array.isArray(data.members)
            ? data.members.map((person) => ({ ...person, importantEvents: Array.isArray(person.importantEvents) ? person.importantEvents : [] }))
            : [],
        }];
      });

      const peopleByName = new Map<string, LocatedPerson[]>();
      households.forEach((household) => household.members.forEach((person) => {
        const name = normalizeBirthdayMemberName(`${person.firstName} ${person.lastName}`);
        const matches = peopleByName.get(name) || [];
        matches.push({ household, person });
        peopleByName.set(name, matches);
      }));

      const issues: ImportIssue[] = parsedImport.errors.map((parseError) => ({
        line: parseError.original || `Line ${parseError.lineNumber}`,
        reason: parseError.reason,
      }));
      const entriesByName = new Map<string, ParsedBirthdayImportLine[]>();
      parsedImport.entries.forEach((entry) => {
        const entries = entriesByName.get(entry.normalizedName) || [];
        entries.push(entry);
        entriesByName.set(entry.normalizedName, entries);
      });

      const changedHouseholdIds = new Set<string>();
      let importedCount = 0;
      let skippedCount = 0;

      entriesByName.forEach((entries, normalizedName) => {
        const dates = new Set(entries.map((entry) => entry.date));
        if (dates.size > 1) {
          entries.forEach((entry) => issues.push({ line: entry.original, reason: 'Conflicting dates were supplied for this name' }));
          return;
        }

        const entry = entries[0];
        const matches = peopleByName.get(normalizedName) || [];
        if (matches.length === 0) {
          issues.push({ line: entry.original, reason: 'Member not found' });
          return;
        }
        if (matches.length > 1) {
          issues.push({ line: entry.original, reason: `Multiple members have this name (${matches.map((match) => match.household.householdName).join(', ')})` });
          return;
        }

        const { household, person } = matches[0];
        const birthdays = person.importantEvents.filter((event) => event.type === 'birthday');
        if (birthdays.some((event) => event.date === entry.date)) {
          skippedCount += entries.length;
          return;
        }
        if (birthdays.length > 0) {
          issues.push({ line: entry.original, reason: 'Member already has a different birthday; review manually' });
          return;
        }

        const birthdayEvent: ImportantEvent = {
          id: crypto.randomUUID(),
          type: 'birthday',
          date: entry.date,
          title: 'Birthday',
        };
        person.importantEvents = [...person.importantEvents, birthdayEvent]
          .sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
        changedHouseholdIds.add(household.id);
        importedCount += 1;
        skippedCount += entries.length - 1;
      });

      const changedHouseholds = households.filter((household) => changedHouseholdIds.has(household.id));
      await commitHouseholds(changedHouseholds);
      const unresolved = formatIssues(issues);
      setUnresolvedText(unresolved);
      setMessage(`Created ${importedCount} birthday event${importedCount === 1 ? '' : 's'}.${skippedCount ? ` Skipped ${skippedCount} duplicate${skippedCount === 1 ? '' : 's'}.` : ''}${issues.length ? ` ${issues.length} line${issues.length === 1 ? '' : 's'} need manual review.` : ' Every line was matched.'}`);
      if (!issues.length) setImportText('');
    } catch (importError) {
      console.error('Error importing birthdays:', importError);
      setError('The birthday import failed. No further batches were started; review the browser console for details.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Birthday Import</h1>
          <p className="mt-2 text-sm text-text-light">Match people in the members list and add birthdays to their important events.</p>
        </div>
      </div>

      <AttendanceTabs activeTab="members" />

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <p className="text-sm text-text-light">Enter one person per line as <code>First Last, mm/dd</code>. A four-digit year is also accepted but will not be stored. A tab or a space before the date also works. Names must uniquely match the members list.</p>
        <textarea
          value={importText}
          onChange={(event) => { setImportText(event.target.value); setError(null); setMessage(null); setUnresolvedText(''); }}
          rows={16}
          placeholder={'Jane Smith, 04/15\nJohn Doe 11/02'}
          className="mt-4 w-full rounded-md border border-border px-3 py-2 font-mono text-sm text-charcoal focus:border-coral focus:outline-none"
        />

        {importText ? (
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            <p><span className="font-semibold">Preview:</span> {parsedImport.entries.length} valid line{parsedImport.entries.length === 1 ? '' : 's'} and {parsedImport.errors.length} formatting issue{parsedImport.errors.length === 1 ? '' : 's'}.</p>
            {parsedImport.errors.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-red-700">{parsedImport.errors.slice(0, 8).map((parseError) => <li key={`${parseError.lineNumber}-${parseError.original}`}>Line {parseError.lineNumber}: {parseError.reason}</li>)}</ul> : null}
          </div>
        ) : null}

        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}

        {unresolvedText ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="font-semibold text-amber-900">Needs manual review</h2>
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(unresolvedText); setCopied(true); }} className="inline-flex items-center rounded-md border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100">
                <Clipboard className="mr-1.5 h-4 w-4" />{copied ? 'Copied' : 'Copy text'}
              </button>
            </div>
            <textarea readOnly value={unresolvedText} rows={Math.min(12, unresolvedText.split('\n').length + 1)} className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 font-mono text-sm text-charcoal" />
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={handleImport} disabled={importing || (!parsedImport.entries.length && !parsedImport.errors.length)} className="inline-flex items-center rounded-md bg-[#D6805F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#c56f4d] disabled:cursor-not-allowed disabled:opacity-60">
            <Upload className="mr-2 h-4 w-4" />{importing ? 'Importing...' : 'Import Birthdays'}
          </button>
        </div>
      </div>
    </div>
  );
}
