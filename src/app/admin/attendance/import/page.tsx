'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp, collection, doc, getDocs, orderBy, query, type WriteBatch, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { Upload } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { getDateFromSundayKey, getSundayKey, normalizeAttendanceName, parseAttendanceImport } from '@/lib/utils/attendance';

interface StoredHousehold {
  id: string;
  householdName: string;
  normalizedName: string;
  availableFrom: Date;
}

interface StoredRecord {
  id: string;
  serviceDate: Date;
  noService: boolean;
  counts: Record<string, number>;
  exemptions: Record<string, string>;
  visitorDetails: Record<string, unknown>;
}

type BatchOperation = (batch: WriteBatch) => void;

const commitOperations = async (operations: BatchOperation[]) => {
  for (let index = 0; index < operations.length; index += 450) {
    const batch = writeBatch(db);
    operations.slice(index, index + 450).forEach((operation) => operation(batch));
    await batch.commit();
  }
};

export default function AttendanceMassImportPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const parsedImport = useMemo(() => parseAttendanceImport(importText), [importText]);
  const uniqueHouseholdCount = useMemo(
    () => new Set(parsedImport.sundays.flatMap((sunday) => sunday.entries.map((entry) => entry.normalizedName))).size,
    [parsedImport],
  );
  const importDateRange = useMemo(() => {
    if (!parsedImport.sundays.length) return null;
    const dates = parsedImport.sundays.map((sunday) => sunday.serviceDate.getTime());
    return { start: new Date(Math.min(...dates)), end: new Date(Math.max(...dates)) };
  }, [parsedImport]);

  useEffect(() => {
    document.title = 'Mass Attendance Import | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) router.push('/');
  }, [router, userProfile]);

  if (!userProfile?.isAdmin) return null;

  const handleImport = async () => {
    if (parsedImport.sundays.length === 0) {
      setError('Paste at least one dated attendance block before importing.');
      return;
    }
    if (parsedImport.errors.length > 0) {
      setError('Fix the import errors shown below before importing.');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setMessage(null);

      const [householdsSnapshot, recordsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'attendanceHouseholds'), orderBy('householdName', 'asc'))),
        getDocs(query(collection(db, 'attendanceRecords'), orderBy('serviceDate', 'asc'))),
      ]);
      const householdsByName = new Map<string, StoredHousehold>();
      householdsSnapshot.docs.forEach((snapshot) => {
        const data = snapshot.data() as { householdName?: string; normalizedName?: string; availableFrom?: Timestamp; createdAt?: Timestamp };
        const householdName = data.householdName || 'Unnamed Household';
        householdsByName.set(data.normalizedName || normalizeAttendanceName(householdName), {
          id: snapshot.id,
          householdName,
          normalizedName: data.normalizedName || normalizeAttendanceName(householdName),
          availableFrom: data.availableFrom?.toDate() || data.createdAt?.toDate() || new Date(2000, 0, 2, 12),
        });
      });

      const recordsByKey = new Map<string, StoredRecord>();
      const earliestByHouseholdId = new Map<string, Date>();
      recordsSnapshot.docs.forEach((snapshot) => {
        const data = snapshot.data() as { serviceDate?: Timestamp; noService?: boolean; counts?: Record<string, number>; exemptions?: Record<string, string>; visitorDetails?: Record<string, unknown> };
        const serviceDate = data.serviceDate?.toDate() || getDateFromSundayKey(snapshot.id);
        const record = {
          id: snapshot.id,
          serviceDate,
          noService: data.noService === true,
          counts: data.counts || {},
          exemptions: data.exemptions || {},
          visitorDetails: data.visitorDetails || {},
        };
        recordsByKey.set(snapshot.id, record);
        Object.keys(record.counts).forEach((householdId) => {
          const currentEarliest = earliestByHouseholdId.get(householdId);
          if (!currentEarliest || serviceDate < currentEarliest) earliestByHouseholdId.set(householdId, serviceDate);
        });
      });

      const createdHouseholds: StoredHousehold[] = [];
      const touchedHouseholdIds = new Set<string>();
      const importedRecords = new Map<string, StoredRecord>();

      parsedImport.sundays.forEach((sunday) => {
        const key = getSundayKey(sunday.serviceDate);
        const existing = recordsByKey.get(key);
        const counts = { ...(existing?.counts || {}) };

        sunday.entries.forEach((entry) => {
          let household = householdsByName.get(entry.normalizedName);
          if (!household) {
            household = {
              id: doc(collection(db, 'attendanceHouseholds')).id,
              householdName: entry.householdName,
              normalizedName: entry.normalizedName,
              availableFrom: sunday.serviceDate,
            };
            householdsByName.set(household.normalizedName, household);
            createdHouseholds.push(household);
          }
          counts[household.id] = entry.count as number;
          touchedHouseholdIds.add(household.id);
          const currentEarliest = earliestByHouseholdId.get(household.id);
          if (!currentEarliest || sunday.serviceDate < currentEarliest) earliestByHouseholdId.set(household.id, sunday.serviceDate);
        });

        importedRecords.set(key, {
          id: key,
          serviceDate: sunday.serviceDate,
          noService: sunday.noService,
          counts,
          exemptions: existing?.exemptions || {},
          visitorDetails: existing?.visitorDetails || {},
        });
      });

      const createdIds = new Set(createdHouseholds.map((household) => household.id));
      const operations: BatchOperation[] = [
        ...createdHouseholds.map((household) => (batch: WriteBatch) => {
          batch.set(doc(db, 'attendanceHouseholds', household.id), {
            householdName: household.householdName,
            normalizedName: household.normalizedName,
            active: true,
            availableFrom: Timestamp.fromDate(earliestByHouseholdId.get(household.id) || household.availableFrom),
            isVisitor: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }),
        ...Array.from(importedRecords.values()).map((record) => (batch: WriteBatch) => {
          batch.set(doc(db, 'attendanceRecords', record.id), {
            serviceDate: Timestamp.fromDate(record.serviceDate),
            noService: record.noService,
            counts: record.counts,
            exemptions: record.exemptions,
            visitorDetails: record.visitorDetails,
            updatedAt: Timestamp.now(),
            updatedBy: userProfile.uid,
          }, { merge: true });
        }),
        ...Array.from(touchedHouseholdIds)
          .filter((householdId) => !createdIds.has(householdId))
          .map((householdId) => (batch: WriteBatch) => {
            const earliest = earliestByHouseholdId.get(householdId);
            if (earliest) {
              batch.update(doc(db, 'attendanceHouseholds', householdId), {
                availableFrom: Timestamp.fromDate(earliest),
                updatedAt: Timestamp.now(),
              });
            }
          }),
      ];

      await commitOperations(operations);
      setMessage(
        `Imported ${importedRecords.size} Sunday records and ${parsedImport.sundays.reduce((total, sunday) => total + sunday.entries.length, 0)} attendance entries. ${createdHouseholds.length} new households were created.`,
      );
      setImportText('');
    } catch (importError) {
      console.error('Error importing attendance history:', importError);
      setError('The mass import failed. No further batches were started; review the browser console for details.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Mass Attendance Import</h1>
          <p className="mt-2 text-sm text-text-light">Paste dated attendance blocks to import multiple Sundays at once.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <p className="text-sm text-text-light">Use a date on its own line (for example, <code>2/23/25</code>), followed by attendee lines such as <code>Smith Family 4</code>.</p>
        <label className="mt-4 inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-charcoal transition hover:border-coral hover:text-coral">
          Choose attendance text file
          <input
            type="file"
            accept=".txt,text/plain"
            className="sr-only"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                setImportText(await file.text());
                setError(null);
                setMessage(null);
              } catch {
                setError('Could not read that file. Please choose a plain-text attendance export.');
              } finally {
                event.target.value = '';
              }
            }}
          />
        </label>
        <textarea
          value={importText}
          onChange={(event) => setImportText(event.target.value)}
          rows={18}
          placeholder={'2/23/25\nSmith Family 4\nJones 0\n\n2/16/25\nSmith Family 3'}
          className="mt-3 w-full rounded-md border border-border px-3 py-2 font-mono text-sm text-charcoal focus:border-coral focus:outline-none"
        />

        {importText ? (
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            <p><span className="font-semibold">Preview:</span> {parsedImport.sundays.length} Sundays, {parsedImport.sundays.reduce((total, sunday) => total + sunday.entries.length, 0)} entries, and {uniqueHouseholdCount} unique households.</p>
            {importDateRange ? <p className="mt-1">Date range: {format(importDateRange.start, 'MMM d, yyyy')} – {format(importDateRange.end, 'MMM d, yyyy')}.</p> : null}
            {parsedImport.errors.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-red-700">{parsedImport.errors.slice(0, 8).map((parseError) => <li key={parseError}>{parseError}</li>)}</ul> : null}
          </div>
        ) : null}

        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        {message ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || parsedImport.sundays.length === 0 || parsedImport.errors.length > 0}
            className="inline-flex items-center rounded-md bg-[#D6805F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#c56f4d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="mr-2 h-4 w-4" />
            {importing ? 'Importing...' : 'Import All Sundays'}
          </button>
        </div>
      </div>
    </div>
  );
}
