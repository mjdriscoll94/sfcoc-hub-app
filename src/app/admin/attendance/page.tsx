'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { AlertCircle, CalendarDays, Save, Upload, Users } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import {
  buildAttendanceAttention,
  getDateFromSundayKey,
  getSundayKey,
  parseAttendanceHouseholds,
  normalizeAttendanceName,
  type AttendanceHousehold,
  type AttendanceRecord,
} from '@/lib/utils/attendance';

interface FirestoreAttendanceHousehold {
  householdName?: string;
  normalizedName?: string;
  active?: boolean;
}

interface FirestoreAttendanceRecord {
  serviceDate?: Timestamp;
  counts?: Record<string, number>;
}

export default function AttendanceAdminPage() {
  useEffect(() => {
    document.title = 'Attendance | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();

  const [households, setHouseholds] = useState<AttendanceHousehold[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedSundayKey, setSelectedSundayKey] = useState(getSundayKey(new Date()));
  const [draftCounts, setDraftCounts] = useState<Record<string, string>>({});
  const [importText, setImportText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [router, userProfile]);

  useEffect(() => {
    if (!userProfile?.isAdmin) {
      return;
    }

    const loadAttendance = async () => {
      try {
        setLoading(true);
        setError(null);

        const householdsSnapshot = await getDocs(query(collection(db, 'attendanceHouseholds'), orderBy('householdName', 'asc')));
        const loadedHouseholds = householdsSnapshot.docs
          .map((snapshot) => {
            const data = snapshot.data() as FirestoreAttendanceHousehold;
            return {
              id: snapshot.id,
              householdName: data.householdName || 'Unnamed Household',
              normalizedName: data.normalizedName || normalizeAttendanceName(data.householdName || ''),
              active: data.active !== false,
            };
          })
          .filter((household) => household.active);

        const recordsSnapshot = await getDocs(
          query(collection(db, 'attendanceRecords'), orderBy('serviceDate', 'desc'), limit(12)),
        );
        const loadedRecords = recordsSnapshot.docs.map((snapshot) => {
          const data = snapshot.data() as FirestoreAttendanceRecord;
          return {
            id: snapshot.id,
            serviceDate: data.serviceDate?.toDate() || getDateFromSundayKey(snapshot.id),
            counts: data.counts || {},
          };
        });

        setHouseholds(loadedHouseholds);
        setRecords(loadedRecords);
      } catch (loadError) {
        console.error('Error loading attendance data:', loadError);
        setError('Failed to load attendance data.');
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [userProfile]);

  useEffect(() => {
    const selectedRecord = records.find((record) => record.id === selectedSundayKey);
    if (selectedRecord) {
      const nextDraft: Record<string, string> = {};
      households.forEach((household) => {
        const count = selectedRecord.counts[household.id];
        nextDraft[household.id] = typeof count === 'number' ? String(count) : '';
      });
      setDraftCounts(nextDraft);
      return;
    }

    const blankDraft: Record<string, string> = {};
    households.forEach((household) => {
      blankDraft[household.id] = '';
    });
    setDraftCounts(blankDraft);
  }, [households, records, selectedSundayKey]);

  if (!userProfile?.isAdmin) {
    return null;
  }

  const selectedSunday = getDateFromSundayKey(selectedSundayKey);
  const selectedRecord = records.find((record) => record.id === selectedSundayKey);
  const attentionItems = buildAttendanceAttention(households, records);
  const filteredHouseholds = households.filter((household) =>
    household.householdName.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );
  const totalAttendance = filteredHouseholds.reduce((sum, household) => {
    const value = Number(draftCounts[household.id]);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const handleSundayChange = (value: string) => {
    setSelectedSundayKey(getSundayKey(new Date(`${value}T12:00:00`)));
    setMessage(null);
  };

  const handleCountChange = (householdId: string, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) {
      return;
    }

    setDraftCounts((current) => ({
      ...current,
      [householdId]: value,
    }));
  };

  const handleImportHouseholds = async () => {
    const parsedHouseholds = parseAttendanceHouseholds(importText);

    if (parsedHouseholds.length === 0) {
      setError('Paste at least one household name to import.');
      return;
    }

    try {
      setImporting(true);
      setError(null);
      setMessage(null);

      const existingByName = new Map(households.map((household) => [household.normalizedName, household]));
      const batch = writeBatch(db);
      const nextHouseholds = [...households];
      let addedCount = 0;

      for (const householdName of parsedHouseholds) {
        const normalizedName = normalizeAttendanceName(householdName);
        const existing = existingByName.get(normalizedName);

        if (existing) {
          continue;
        }

        const newDoc = doc(collection(db, 'attendanceHouseholds'));
        batch.set(newDoc, {
          householdName,
          normalizedName,
          active: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        nextHouseholds.push({
          id: newDoc.id,
          householdName,
          normalizedName,
          active: true,
        });
        existingByName.set(normalizedName, nextHouseholds[nextHouseholds.length - 1]);
        addedCount += 1;
      }

      await batch.commit();

      const activeHouseholds = nextHouseholds
        .filter((household) => household.active)
        .sort((a, b) => a.householdName.localeCompare(b.householdName));

      setHouseholds(activeHouseholds);
      setImportText('');
      setMessage(`Imported ${addedCount} household${addedCount === 1 ? '' : 's'}.`);
    } catch (importError) {
      console.error('Error importing households:', importError);
      setError('Failed to import households.');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const counts = households.reduce<Record<string, number>>((result, household) => {
        const rawValue = draftCounts[household.id];
        if (rawValue === '') {
          return result;
        }

        const parsedValue = Number(rawValue);
        if (Number.isFinite(parsedValue) && parsedValue >= 0) {
          result[household.id] = parsedValue;
        }

        return result;
      }, {});

      await setDoc(
        doc(db, 'attendanceRecords', selectedSundayKey),
        {
          serviceDate: Timestamp.fromDate(selectedSunday),
          counts,
          updatedAt: Timestamp.now(),
          updatedBy: userProfile.uid,
        },
        { merge: true },
      );

      const nextRecord: AttendanceRecord = {
        id: selectedSundayKey,
        serviceDate: selectedSunday,
        counts,
      };

      setRecords((current) => {
        const withoutCurrent = current.filter((record) => record.id !== selectedSundayKey);
        return [...withoutCurrent, nextRecord].sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime()).slice(0, 12);
      });
      setMessage(`Saved attendance for ${format(selectedSunday, 'MMMM d, yyyy')}.`);
    } catch (saveError) {
      console.error('Error saving attendance:', saveError);
      setError('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Attendance</h1>
          <p className="mt-2 text-sm text-text-light">
            Track Sunday attendance by household and flag follow-up patterns.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {message && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-charcoal">Sunday Entry</h2>
                <p className="mt-1 text-sm text-text-light">
                  Enter `0` when a household misses so the follow-up conditions can be tracked.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Present</p>
                <p className="text-2xl font-bold text-charcoal">{totalAttendance}</p>
              </div>
            </div>

            <div className="mb-4 grid gap-4 md:grid-cols-[220px_1fr]">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-charcoal">Sunday</span>
                <input
                  type="date"
                  value={selectedSundayKey}
                  onChange={(event) => handleSundayChange(event.target.value)}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                />
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-5 w-5 text-coral" />
                  <div>
                    <p className="font-medium text-charcoal">{format(selectedSunday, 'EEEE, MMMM d, yyyy')}</p>
                    <p className="mt-1">
                      {selectedRecord ? 'Editing a saved attendance record.' : 'No record saved yet for this Sunday.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-charcoal">Find Household</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search imported households..."
                  className="w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                />
              </label>
            </div>

            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#D6805F]"></div>
              </div>
            ) : filteredHouseholds.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-text-light">
                {households.length === 0 ? 'Import households to begin tracking attendance.' : 'No households match that search.'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHouseholds.map((household) => {
                  const history = records.slice(0, 6).map((record) => ({
                    id: record.id,
                    label: format(record.serviceDate, 'MMM d'),
                    value: record.counts[household.id],
                  }));

                  return (
                    <div key={household.id} className="rounded-lg border border-border p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-base font-semibold text-charcoal">{household.householdName}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {history.map((entry) => (
                              <span
                                key={entry.id}
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  entry.value === 0
                                    ? 'bg-red-100 text-red-700'
                                    : typeof entry.value === 'number'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {entry.label}: {typeof entry.value === 'number' ? entry.value : '-'}
                              </span>
                            ))}
                          </div>
                        </div>
                        <label className="flex items-center gap-3">
                          <span className="text-sm font-medium text-charcoal">Present</span>
                          <input
                            inputMode="numeric"
                            type="text"
                            value={draftCounts[household.id] || ''}
                            onChange={(event) => handleCountChange(household.id, event.target.value)}
                            className="w-24 rounded-md border border-border px-3 py-2 text-center text-lg font-semibold text-charcoal focus:border-coral focus:outline-none"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveAttendance}
                disabled={saving || loading || households.length === 0}
                className="inline-flex items-center rounded-md bg-[#D6805F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#c56f4d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 h-5 w-5 text-coral" />
              <div>
                <h2 className="text-xl font-semibold text-charcoal">Attention Needed</h2>
                <p className="mt-1 text-sm text-text-light">
                  Current checks: 2 consecutive misses, 3 misses in 6 weeks, and 4 misses in 8 weeks.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {attentionItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-5 text-sm text-text-light">
                  No households currently match a follow-up condition.
                </div>
              ) : (
                attentionItems.map((item) => (
                  <div key={item.householdId} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-charcoal">{item.householdName}</p>
                        <p className="mt-1 text-xs text-text-light">
                          Recent counts: {item.recentCounts.length > 0 ? item.recentCounts.join(', ') : 'No history yet'}
                        </p>
                      </div>
                      <Users className="h-5 w-5 text-coral" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.conditions.map((condition) => (
                        <span key={condition.key} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          {condition.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Upload className="mt-1 h-5 w-5 text-coral" />
              <div>
                <h2 className="text-xl font-semibold text-charcoal">Import Households</h2>
                <p className="mt-1 text-sm text-text-light">
                  Paste one family or household per line. Duplicate names are ignored.
                </p>
              </div>
            </div>

            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={`Smith Family\nJones\nGarcia Household`}
              rows={10}
              className="mt-4 w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
            />

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-text-light">
                Imported households stay separate from the app directory and member records.
              </p>
              <button
                onClick={handleImportHouseholds}
                disabled={importing}
                className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-charcoal transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
