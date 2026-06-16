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
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { format } from 'date-fns';
import { AlertCircle, BedSingle, CalendarDays, ChevronLeft, ChevronRight, Mail, Save, Upload, Users } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import {
  buildAttendanceAttention,
  getDateFromSundayKey,
  getSundayForDate,
  getSundayKey,
  isHouseholdAvailableForSunday,
  parseHistoricalAttendanceLines,
  parseAttendanceHouseholds,
  normalizeAttendanceName,
  type AttendanceHousehold,
  type AttendanceRecord,
} from '@/lib/utils/attendance';

interface FirestoreAttendanceHousehold {
  householdName?: string;
  normalizedName?: string;
  active?: boolean;
  createdAt?: Timestamp;
  availableFrom?: Timestamp;
  isVisitor?: boolean;
  longTermExempt?: boolean;
}

interface FirestoreAttendanceRecord {
  serviceDate?: Timestamp;
  counts?: Record<string, number>;
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

interface VisitorDetailDraft {
  notes: string;
  wantedMoreInformation: boolean;
  hasBeenContacted: boolean;
  contactedBy: string;
}

export default function AttendanceAdminPage() {
  useEffect(() => {
    document.title = 'Attendance | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();

  const [households, setHouseholds] = useState<AttendanceHousehold[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedSundayKey, setSelectedSundayKey] = useState(getSundayKey(getSundayForDate(new Date())));
  const [draftCounts, setDraftCounts] = useState<Record<string, string>>({});
  const [draftExemptions, setDraftExemptions] = useState<Record<string, string>>({});
  const [draftVisitorDetails, setDraftVisitorDetails] = useState<Record<string, VisitorDetailDraft>>({});
  const [openVisitorNotes, setOpenVisitorNotes] = useState<Record<string, boolean>>({});
  const [importText, setImportText] = useState('');
  const [importAsVisitor, setImportAsVisitor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sendingAttentionEmail, setSendingAttentionEmail] = useState(false);
  const [attentionEmailRecipients, setAttentionEmailRecipients] = useState('');
  const [sendingRecurringVisitorEmail, setSendingRecurringVisitorEmail] = useState(false);
  const [recurringVisitorEmailRecipients, setRecurringVisitorEmailRecipients] = useState('');
  const [historicalImportText, setHistoricalImportText] = useState('');
  const [importingHistoricalAttendance, setImportingHistoricalAttendance] = useState(false);
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
              availableFrom: data.availableFrom?.toDate() || data.createdAt?.toDate() || new Date(2000, 0, 2, 12, 0, 0, 0),
              isVisitor: data.isVisitor === true,
              longTermExempt: data.longTermExempt === true,
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
            exemptions: data.exemptions || {},
            visitorDetails: data.visitorDetails || {},
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
      const nextExemptions: Record<string, string> = {};
      households.forEach((household) => {
        nextExemptions[household.id] = selectedRecord.exemptions?.[household.id] || (household.longTermExempt ? 'Long-term exemption' : '');
      });
      const nextVisitorDetails: Record<string, VisitorDetailDraft> = {};
      households.forEach((household) => {
        const details = selectedRecord.visitorDetails?.[household.id];
        nextVisitorDetails[household.id] = {
          notes: details?.notes || '',
          wantedMoreInformation: !!details?.wantedMoreInformation,
          hasBeenContacted: !!details?.hasBeenContacted,
          contactedBy: details?.contactedBy || '',
        };
      });
      const nextOpenVisitorNotes: Record<string, boolean> = {};
      households.forEach((household) => {
        nextOpenVisitorNotes[household.id] = !!selectedRecord.visitorDetails?.[household.id]?.notes;
      });
      setDraftCounts(nextDraft);
      setDraftExemptions(nextExemptions);
      setDraftVisitorDetails(nextVisitorDetails);
      setOpenVisitorNotes(nextOpenVisitorNotes);
      return;
    }

    const blankDraft: Record<string, string> = {};
    const blankExemptions: Record<string, string> = {};
    const blankVisitorDetails: Record<string, VisitorDetailDraft> = {};
    const blankOpenVisitorNotes: Record<string, boolean> = {};
    households.forEach((household) => {
      blankDraft[household.id] = '';
      blankExemptions[household.id] = household.longTermExempt ? 'Long-term exemption' : '';
      blankVisitorDetails[household.id] = {
        notes: '',
        wantedMoreInformation: false,
        hasBeenContacted: false,
        contactedBy: '',
      };
      blankOpenVisitorNotes[household.id] = false;
    });
    setDraftCounts(blankDraft);
    setDraftExemptions(blankExemptions);
    setDraftVisitorDetails(blankVisitorDetails);
    setOpenVisitorNotes(blankOpenVisitorNotes);
  }, [households, records, selectedSundayKey]);

  if (!userProfile?.isAdmin) {
    return null;
  }

  const selectedSunday = getDateFromSundayKey(selectedSundayKey);
  const selectedRecord = records.find((record) => record.id === selectedSundayKey);
  const mostRecentSunday = getSundayForDate(new Date());
  const attentionItems = buildAttendanceAttention(households, records);
  const recurringVisitors = households
    .filter((household) => household.isVisitor)
    .map((household) => {
      const visits = records.filter((record) => (record.counts[household.id] || 0) > 0).length;
      const latestDetails = records
        .slice()
        .sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime())
        .map((record) => record.visitorDetails?.[household.id])
        .find(Boolean);

      return {
        householdId: household.id,
        householdName: household.householdName,
        visits,
        wantedMoreInformation: !!latestDetails?.wantedMoreInformation,
        hasBeenContacted: !!latestDetails?.hasBeenContacted,
        contactedBy: latestDetails?.contactedBy || '',
      };
    })
    .filter((visitor) => visitor.visits >= 2)
    .sort((a, b) => b.visits - a.visits || a.householdName.localeCompare(b.householdName));
  const availableHouseholds = households.filter((household) => isHouseholdAvailableForSunday(household, selectedSunday));
  const filteredHouseholds = availableHouseholds.filter((household) =>
    household.householdName.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );
  const totalAttendance = filteredHouseholds.reduce((sum, household) => {
    const value = Number(draftCounts[household.id]);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const isPastSunday = selectedSunday.getTime() < mostRecentSunday.getTime();

  const handleSundayChange = (direction: -1 | 1) => {
    const nextSunday = new Date(selectedSunday);
    nextSunday.setDate(nextSunday.getDate() + direction * 7);
    if (direction === 1 && nextSunday.getTime() > mostRecentSunday.getTime()) {
      return;
    }

    setSelectedSundayKey(getSundayKey(nextSunday));
    setMessage(null);
  };

  const isViewingMostRecentSunday = selectedSunday.getTime() >= mostRecentSunday.getTime();

  const handleCountChange = (householdId: string, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) {
      return;
    }

    setDraftCounts((current) => ({
      ...current,
      [householdId]: value,
    }));
  };

  const handleExemptionToggle = (householdId: string) => {
    setDraftExemptions((current) => {
      const currentValue = current[householdId] || '';
      return {
        ...current,
        [householdId]: currentValue ? '' : 'Away with notice',
      };
    });
  };

  const handleExemptionNoteChange = (householdId: string, value: string) => {
    setDraftExemptions((current) => ({
      ...current,
      [householdId]: value,
    }));
  };

  const handleLongTermExemptionToggle = async (household: AttendanceHousehold) => {
    const nextValue = !household.longTermExempt;

    setHouseholds((current) =>
      current.map((item) =>
        item.id === household.id ? { ...item, longTermExempt: nextValue } : item,
      ),
    );
    setDraftExemptions((current) => ({
      ...current,
      [household.id]: nextValue ? 'Long-term exemption' : current[household.id] === 'Long-term exemption' ? '' : current[household.id],
    }));

    try {
      await updateDoc(doc(db, 'attendanceHouseholds', household.id), {
        longTermExempt: nextValue,
        updatedAt: Timestamp.now(),
      });
      setMessage(`${household.householdName} ${nextValue ? 'entered' : 'left'} long-term exemption mode.`);
      setError(null);
    } catch (toggleError) {
      console.error('Error updating long-term exemption:', toggleError);
      setHouseholds((current) =>
        current.map((item) =>
          item.id === household.id ? { ...item, longTermExempt: household.longTermExempt } : item,
        ),
      );
      setDraftExemptions((current) => ({
        ...current,
        [household.id]: household.longTermExempt ? 'Long-term exemption' : '',
      }));
      setError('Failed to update long-term exemption.');
    }
  };

  const handleVisitorNotesToggle = (householdId: string) => {
    setOpenVisitorNotes((current) => ({
      ...current,
      [householdId]: !current[householdId],
    }));
  };

  const handleVisitorDetailChange = (
    householdId: string,
    field: keyof VisitorDetailDraft,
    value: string | boolean,
  ) => {
    setDraftVisitorDetails((current) => {
      const existing = current[householdId] || {
        notes: '',
        wantedMoreInformation: false,
        hasBeenContacted: false,
        contactedBy: '',
      };

      const next: VisitorDetailDraft = {
        ...existing,
        [field]: value,
      } as VisitorDetailDraft;

      if (field === 'hasBeenContacted' && value === false) {
        next.contactedBy = '';
      }

      return {
        ...current,
        [householdId]: next,
      };
    });
  };

  const handleImportHouseholds = async () => {
    const parsedHouseholds = parseAttendanceHouseholds(importText);
    const previousHouseholds = households;

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

        const availableFrom = getSundayForDate(selectedSunday);
        const newDoc = doc(collection(db, 'attendanceHouseholds'));
        batch.set(newDoc, {
          householdName,
          normalizedName,
          active: true,
          availableFrom: Timestamp.fromDate(availableFrom),
          isVisitor: importAsVisitor,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        nextHouseholds.push({
          id: newDoc.id,
          householdName,
          normalizedName,
          active: true,
          availableFrom,
          isVisitor: importAsVisitor,
        });
        existingByName.set(normalizedName, nextHouseholds[nextHouseholds.length - 1]);
        addedCount += 1;
      }

      const activeHouseholds = nextHouseholds
        .filter((household) => household.active)
        .sort((a, b) => a.householdName.localeCompare(b.householdName));

      setHouseholds(activeHouseholds);
      setImportText('');
      await batch.commit();
      setMessage(`Imported ${addedCount} ${importAsVisitor ? 'visitor ' : ''}household${addedCount === 1 ? '' : 's'}.`);
    } catch (importError) {
      console.error('Error importing households:', importError);
      setHouseholds(previousHouseholds);
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

      const counts = availableHouseholds.reduce<Record<string, number>>((result, household) => {
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
      const exemptions = availableHouseholds.reduce<Record<string, string>>((result, household) => {
        const note = (household.longTermExempt ? 'Long-term exemption' : draftExemptions[household.id])?.trim();
        if (note) {
          result[household.id] = note;
        }
        return result;
      }, {});
      const visitorDetails = availableHouseholds.reduce<NonNullable<AttendanceRecord['visitorDetails']>>((result, household) => {
        if (!household.isVisitor) {
          return result;
        }

        const details = draftVisitorDetails[household.id];
        const notes = details?.notes.trim() || '';
        const wantedMoreInformation = !!details?.wantedMoreInformation;
        const hasBeenContacted = !!details?.hasBeenContacted;
        const contactedBy = details?.contactedBy.trim() || '';

        if (!notes && !wantedMoreInformation && !hasBeenContacted && !contactedBy) {
          return result;
        }

        result[household.id] = {
          ...(notes ? { notes } : {}),
          ...(wantedMoreInformation ? { wantedMoreInformation } : {}),
          ...(hasBeenContacted ? { hasBeenContacted } : {}),
          ...(contactedBy ? { contactedBy } : {}),
        };

        return result;
      }, {});

      await setDoc(
        doc(db, 'attendanceRecords', selectedSundayKey),
        {
          serviceDate: Timestamp.fromDate(selectedSunday),
          counts,
          exemptions,
          visitorDetails,
          updatedAt: Timestamp.now(),
          updatedBy: userProfile.uid,
        },
        { merge: true },
      );

      const nextRecord: AttendanceRecord = {
        id: selectedSundayKey,
        serviceDate: selectedSunday,
        counts,
        exemptions,
        visitorDetails,
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

  const sendAttendanceSectionEmail = async ({
    recipientsText,
    items,
    subject,
    intro,
    setSending,
    clearRecipients,
  }: {
    recipientsText: string;
    items: Array<{ householdName: string; labels: string[] }>;
    subject: string;
    intro: string;
    setSending: (value: boolean) => void;
    clearRecipients: () => void;
  }) => {
    const recipients = recipientsText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      setError('Enter at least one email address for the report.');
      return;
    }

    if (items.length === 0) {
      setError('There are no households to include in this email.');
      return;
    }

    try {
      setSending(true);
      setError(null);
      setMessage(null);

      const response = await fetch('/api/admin/attendance/send-attention-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipients,
          subject,
          intro,
          items: items.map((item) => ({
            householdName: item.householdName,
            labels: item.labels.map((label) => ({ label })),
          })),
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to send email.');
      }

      setMessage(`Sent email to ${responseData.recipientCount} recipient${responseData.recipientCount === 1 ? '' : 's'}.`);
      clearRecipients();
    } catch (sendError) {
      console.error('Error sending attendance section email:', sendError);
      setError(sendError instanceof Error ? sendError.message : 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  const handleSendAttentionEmail = async () => {
    await sendAttendanceSectionEmail({
      recipientsText: attentionEmailRecipients,
      items: attentionItems.map((item) => ({
        householdName: item.householdName,
        labels: item.conditions.map((condition) => condition.label),
      })),
      subject: `Attendance follow-up needed (${attentionItems.length})`,
      intro: 'The following households currently need attendance follow-up:',
      setSending: setSendingAttentionEmail,
      clearRecipients: () => setAttentionEmailRecipients(''),
    });
  };

  const handleSendRecurringVisitorEmail = async () => {
    await sendAttendanceSectionEmail({
      recipientsText: recurringVisitorEmailRecipients,
      items: recurringVisitors.map((visitor) => ({
        householdName: visitor.householdName,
        labels: [
          `${visitor.visits} total visits`,
          ...(visitor.wantedMoreInformation ? ['Wanted more information'] : []),
          ...(visitor.hasBeenContacted ? [`Contacted${visitor.contactedBy ? ` by ${visitor.contactedBy}` : ''}`] : []),
        ],
      })),
      subject: `Recurring visitors report (${recurringVisitors.length})`,
      intro: 'The following visitor households have become recurring visitors:',
      setSending: setSendingRecurringVisitorEmail,
      clearRecipients: () => setRecurringVisitorEmailRecipients(''),
    });
  };

  const handleImportHistoricalAttendance = async () => {
    const parsedLines = parseHistoricalAttendanceLines(historicalImportText);

    if (parsedLines.length === 0) {
      setError('Paste at least one household line to import for this Sunday.');
      return;
    }

    try {
      setImportingHistoricalAttendance(true);
      setError(null);
      setMessage(null);

      const existingByName = new Map(households.map((household) => [household.normalizedName, household]));
      const unmatched: string[] = [];
      const matchedHouseholdIds = new Set<string>();
      const nextCounts = { ...(selectedRecord?.counts || {}) };

      for (const line of parsedLines) {
        const household = existingByName.get(line.normalizedName);
        if (!household) {
          unmatched.push(line.householdName);
          continue;
        }

        matchedHouseholdIds.add(household.id);

        if (typeof line.count === 'number') {
          nextCounts[household.id] = line.count;
        } else {
          delete nextCounts[household.id];
        }
      }

      await setDoc(
        doc(db, 'attendanceRecords', selectedSundayKey),
        {
          serviceDate: Timestamp.fromDate(selectedSunday),
          counts: nextCounts,
          exemptions: selectedRecord?.exemptions || {},
          visitorDetails: selectedRecord?.visitorDetails || {},
          updatedAt: Timestamp.now(),
          updatedBy: userProfile.uid,
        },
        { merge: true },
      );

      const allRecordsSnapshot = await getDocs(query(collection(db, 'attendanceRecords'), orderBy('serviceDate', 'asc')));
      const allRecords = allRecordsSnapshot.docs.map((snapshot) => {
        const data = snapshot.data() as FirestoreAttendanceRecord;
        return {
          id: snapshot.id,
          serviceDate: data.serviceDate?.toDate() || getDateFromSundayKey(snapshot.id),
          counts: data.counts || {},
        };
      });

      const batch = writeBatch(db);
      matchedHouseholdIds.forEach((householdId) => {
        const earliestRecord = allRecords.find((record) => typeof record.counts[householdId] === 'number');
        if (!earliestRecord) {
          return;
        }

        batch.update(doc(db, 'attendanceHouseholds', householdId), {
          availableFrom: Timestamp.fromDate(getSundayForDate(earliestRecord.serviceDate)),
          updatedAt: Timestamp.now(),
        });
      });
      await batch.commit();

      const nextRecord: AttendanceRecord = {
        id: selectedSundayKey,
        serviceDate: selectedSunday,
        counts: nextCounts,
        exemptions: selectedRecord?.exemptions || {},
        visitorDetails: selectedRecord?.visitorDetails || {},
      };

      setRecords((current) => {
        const withoutCurrent = current.filter((record) => record.id !== selectedSundayKey);
        return [...withoutCurrent, nextRecord].sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime()).slice(0, 12);
      });

      setHouseholds((current) =>
        current.map((household) => {
          if (!matchedHouseholdIds.has(household.id)) {
            return household;
          }

          const earliestRecord = allRecords.find((record) => typeof record.counts[household.id] === 'number');
          return earliestRecord
            ? { ...household, availableFrom: getSundayForDate(earliestRecord.serviceDate) }
            : household;
        }),
      );

      setHistoricalImportText('');
      const matchedCount = parsedLines.length - unmatched.length;
      setMessage(
        `Imported ${matchedCount} matched line${matchedCount === 1 ? '' : 's'} for ${format(selectedSunday, 'MMMM d, yyyy')}${
          unmatched.length ? `. Unmatched: ${unmatched.join(', ')}` : '.'
        }`,
      );
    } catch (importError) {
      console.error('Error importing historical attendance:', importError);
      setError('Failed to import historical attendance.');
    } finally {
      setImportingHistoricalAttendance(false);
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
              <div>
                <span className="mb-2 block text-sm font-medium text-charcoal">Sunday</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSundayChange(-1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-charcoal transition hover:border-coral hover:text-coral"
                    aria-label="Previous Sunday"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex-1 rounded-md border border-border px-3 py-2 text-center text-sm font-medium text-charcoal">
                    {format(selectedSunday, 'MMM d, yyyy')}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSundayChange(1)}
                    disabled={isViewingMostRecentSunday}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-charcoal transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Next Sunday"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
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

            {isPastSunday ? (
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <Upload className="mt-0.5 h-5 w-5 text-coral" />
                  <div className="w-full">
                    <h3 className="text-sm font-semibold text-charcoal">Import Attendance For This Sunday</h3>
                    <p className="mt-1 text-xs text-text-light">
                      Paste one household per line like `Smith Family 4` or `Jones 0`. If a line has no number, that household will be cleared for this Sunday and its start date will be driven by the earliest Sunday with a real value.
                    </p>
                    <textarea
                      value={historicalImportText}
                      onChange={(event) => setHistoricalImportText(event.target.value)}
                      rows={6}
                      placeholder={`Smith Family 4\nRenli, Mason 2\nHousehold With Blank`}
                      className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleImportHistoricalAttendance}
                        disabled={importingHistoricalAttendance}
                        className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-charcoal transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {importingHistoricalAttendance ? 'Importing...' : 'Import Sunday History'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

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
                  const history = records
                    .filter((record) => isHouseholdAvailableForSunday(household, record.serviceDate))
                    .sort((a, b) => b.serviceDate.getTime() - a.serviceDate.getTime())
                    .slice(0, 6)
                    .map((record) => ({
                      id: record.id,
                      label: format(record.serviceDate, 'MMM d'),
                      value: record.counts[household.id],
                      exempt: !!record.exemptions?.[household.id],
                    }));
                  const exemptionNote = draftExemptions[household.id] || '';
                  const isExempt = exemptionNote.trim().length > 0;
                  const visitorDetails = draftVisitorDetails[household.id] || {
                    notes: '',
                    wantedMoreInformation: false,
                    hasBeenContacted: false,
                    contactedBy: '',
                  };
                  const hasVisitorNotes = visitorDetails.notes.trim().length > 0;
                  const visitorNotesOpen = !!openVisitorNotes[household.id];

                  return (
                    <div
                      key={household.id}
                      className={`rounded-lg border p-4 ${
                        household.isVisitor ? 'border-emerald-200 bg-emerald-50/50' : 'border-border'
                      }`}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-charcoal">
                              {household.householdName}
                              {household.isVisitor ? (
                                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  Visitor
                                </span>
                              ) : null}
                              {!household.isVisitor && household.longTermExempt ? (
                                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                  Long-term exempt
                                </span>
                              ) : null}
                            </p>
                          </div>
                          {household.isVisitor ? (
                            <div className="flex flex-col items-start gap-2 text-sm text-charcoal">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={visitorDetails.wantedMoreInformation}
                                  onChange={(event) => handleVisitorDetailChange(household.id, 'wantedMoreInformation', event.target.checked)}
                                  className="h-4 w-4 rounded border-border text-coral focus:ring-coral"
                                />
                                <span>Wanted more information</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={visitorDetails.hasBeenContacted}
                                  onChange={(event) => handleVisitorDetailChange(household.id, 'hasBeenContacted', event.target.checked)}
                                  className="h-4 w-4 rounded border-border text-coral focus:ring-coral"
                                />
                                <span>Has been contacted</span>
                              </label>
                              {visitorDetails.hasBeenContacted ? (
                                <input
                                  type="text"
                                  value={visitorDetails.contactedBy}
                                  onChange={(event) => handleVisitorDetailChange(household.id, 'contactedBy', event.target.value)}
                                  placeholder="Who contacted them?"
                                  className="w-full max-w-[240px] rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                                />
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <div className="flex flex-wrap gap-2">
                            {history.map((entry) => (
                              <span
                                key={entry.id}
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  entry.exempt
                                    ? 'bg-sky-100 text-sky-700'
                                    : entry.value === 0
                                    ? 'bg-red-100 text-red-700'
                                    : typeof entry.value === 'number'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {entry.label}: {entry.exempt ? 'Exempt' : typeof entry.value === 'number' ? entry.value : '-'}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                          <div className="flex-1 lg:max-w-md">
                            {household.isVisitor ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleVisitorNotesToggle(household.id)}
                                  className={`mb-2 inline-flex rounded-md border px-3 py-2 text-sm font-medium transition ${
                                    hasVisitorNotes
                                      ? 'border-sky-300 bg-sky-50 text-sky-700'
                                      : 'border-border text-charcoal hover:border-coral hover:text-coral'
                                  }`}
                                >
                                  {hasVisitorNotes ? 'Visitor Notes Added' : 'Visitor Notes'}
                                </button>
                                {visitorNotesOpen ? (
                                  <textarea
                                    value={visitorDetails.notes}
                                    onChange={(event) => handleVisitorDetailChange(household.id, 'notes', event.target.value)}
                                    rows={2}
                                    placeholder="Visitor notes"
                                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                                  />
                                ) : null}
                              </>
                            ) : (
                              <>
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleExemptionToggle(household.id)}
                                    className={`inline-flex rounded-md border px-3 py-2 text-sm font-medium transition ${
                                      isExempt
                                        ? 'border-sky-300 bg-sky-50 text-sky-700'
                                        : 'border-border text-charcoal hover:border-coral hover:text-coral'
                                    }`}
                                  >
                                    {isExempt ? 'Exemption Added' : 'Add Exemption'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleLongTermExemptionToggle(household)}
                                    className={`inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition ${
                                      household.longTermExempt
                                        ? 'border-slate-300 bg-slate-100 text-slate-700'
                                        : 'border-border text-charcoal hover:border-coral hover:text-coral'
                                    }`}
                                    aria-label={`Toggle long-term exemption for ${household.householdName}`}
                                    title="Long-term exemption"
                                  >
                                    <BedSingle className="h-4 w-4" />
                                  </button>
                                </div>
                                {isExempt && !household.longTermExempt && (
                                  <textarea
                                    value={exemptionNote}
                                    onChange={(event) => handleExemptionNoteChange(household.id, event.target.value)}
                                    rows={2}
                                    placeholder="Where were they?"
                                    className="w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                                  />
                                )}
                              </>
                            )}
                          </div>
                        </div>
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
                <>
                  <div className="rounded-lg border border-border bg-slate-50 p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-charcoal">Send this list to</span>
                      <input
                        type="text"
                        value={attentionEmailRecipients}
                        onChange={(event) => setAttentionEmailRecipients(event.target.value)}
                        placeholder="name@example.com, second@example.com"
                        className="w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                      />
                    </label>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSendAttentionEmail}
                        disabled={sendingAttentionEmail}
                        className="inline-flex items-center rounded-md bg-[#D6805F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#c56f4d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {sendingAttentionEmail ? 'Sending...' : 'Send Email'}
                      </button>
                    </div>
                  </div>
                  {attentionItems.map((item) => (
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
                  ))}
                </>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <Users className="mt-1 h-5 w-5 text-coral" />
              <div>
                <h2 className="text-xl font-semibold text-charcoal">Recurring Visitors</h2>
                <p className="mt-1 text-sm text-text-light">
                  Visitor households appear here once they have been present at least 2 times.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {recurringVisitors.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-5 text-sm text-text-light">
                  No visitor households have reached 2 visits yet.
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-border bg-slate-50 p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-charcoal">Send this list to</span>
                      <input
                        type="text"
                        value={recurringVisitorEmailRecipients}
                        onChange={(event) => setRecurringVisitorEmailRecipients(event.target.value)}
                        placeholder="name@example.com, second@example.com"
                        className="w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none"
                      />
                    </label>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSendRecurringVisitorEmail}
                        disabled={sendingRecurringVisitorEmail}
                        className="inline-flex items-center rounded-md bg-[#D6805F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#c56f4d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {sendingRecurringVisitorEmail ? 'Sending...' : 'Send Email'}
                      </button>
                    </div>
                  </div>
                  {recurringVisitors.map((visitor) => (
                    <div key={visitor.householdId} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-charcoal">{visitor.householdName}</p>
                          <p className="mt-1 text-xs text-text-light">Total visits: {visitor.visits}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Recurring visitor
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {visitor.wantedMoreInformation ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            Wanted more information
                          </span>
                        ) : null}
                        {visitor.hasBeenContacted ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            Contacted{visitor.contactedBy ? ` by ${visitor.contactedBy}` : ''}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </>
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
              <div className="flex flex-col gap-3">
                <p className="text-xs text-text-light">
                  Imported households stay separate from the app directory and member records.
                </p>
                <label className="flex items-center gap-2 text-sm text-charcoal">
                  <input
                    type="checkbox"
                    checked={importAsVisitor}
                    onChange={(event) => setImportAsVisitor(event.target.checked)}
                    className="h-4 w-4 rounded border-border text-coral focus:ring-coral"
                  />
                  <span>Import these as visitor households</span>
                </label>
              </div>
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
