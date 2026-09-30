'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle, Loader2, MessageCircle, Send, UserX } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import {
  ATTENDANCE_CONTACT_OUTCOME_LABELS,
  attendanceContactOutcomeAllowsNotes,
  isAttendanceContactOutcome,
  type AttendanceContactOutcome,
} from '@/lib/utils/attendanceContacts';
import { canManageAttendance } from '@/types/roles';

const outcomeOptions: Array<{
  value: AttendanceContactOutcome;
  description: string;
  icon: typeof MessageCircle;
}> = [
  {
    value: 'contacted_with_response',
    description: 'The household responded to the outreach.',
    icon: MessageCircle,
  },
  {
    value: 'not_coming_back',
    description: 'The household said they do not plan to return.',
    icon: UserX,
  },
  {
    value: 'reached_out_no_response',
    description: 'An outreach attempt was made without a response.',
    icon: Send,
  },
];

function AttendanceContactForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const householdId = searchParams.get('householdId') || '';
  const reportId = searchParams.get('reportId') || '';
  const requestedOutcome = searchParams.get('outcome');
  const [outcome, setOutcome] = useState<AttendanceContactOutcome | null>(
    isAttendanceContactOutcome(requestedOutcome) ? requestedOutcome : null,
  );
  const [householdName, setHouseholdName] = useState('');
  const [loadingHousehold, setLoadingHousehold] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Record Attendance Contact | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const redirect = `/admin/attendance/contact?${searchParams.toString()}`;
      router.replace(`/auth/signin?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    if (!userProfile || !canManageAttendance(userProfile)) {
      router.replace('/');
    }
  }, [authLoading, router, searchParams, user, userProfile]);

  useEffect(() => {
    if (!userProfile || !canManageAttendance(userProfile)) return;
    if (!householdId || !reportId || !outcome) {
      setError('This contact link is incomplete or invalid.');
      setLoadingHousehold(false);
      return;
    }

    const loadHousehold = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'attendanceHouseholds', householdId));
        if (!snapshot.exists()) {
          setError('This household could not be found.');
          return;
        }
        setHouseholdName(snapshot.data().householdName || 'Unnamed Household');
      } catch (loadError) {
        console.error('Failed to load attendance household:', loadError);
        setError('The household could not be loaded.');
      } finally {
        setLoadingHousehold(false);
      }
    };

    loadHousehold();
  }, [householdId, outcome, reportId, userProfile]);

  const selectOutcome = (nextOutcome: AttendanceContactOutcome) => {
    setOutcome(nextOutcome);
    setError(null);
    if (!attendanceContactOutcomeAllowsNotes(nextOutcome)) setNotes('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !outcome) return;

    try {
      setSaving(true);
      setError(null);
      const idToken = await user.getIdToken();
      const response = await fetch('/api/admin/attendance/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          householdId,
          reportId,
          outcome,
          ...(attendanceContactOutcomeAllowsNotes(outcome) ? { notes } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to record the contact.');
      setSaved(true);
    } catch (saveError) {
      console.error('Failed to save attendance contact:', saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to record the contact.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingHousehold) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center text-text-light">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-coral" />
          Loading contact form...
        </div>
      </div>
    );
  }

  if (!userProfile || !canManageAttendance(userProfile)) return null;

  if (saved && outcome) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-2xl font-bold text-charcoal">Contact recorded</h1>
          <p className="mt-2 text-text-light">
            {ATTENDANCE_CONTACT_OUTCOME_LABELS[outcome]} was recorded for {householdName}.
          </p>
          <Link href="/admin/attendance" className="mt-6 inline-flex rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
            Return to Attendance
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-4">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Record Contact</h1>
          {householdName ? <p className="mt-1 text-sm text-text-light">{householdName}</p> : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <fieldset>
          <legend className="text-sm font-semibold text-charcoal">What was the result of the outreach?</legend>
          <div className="mt-3 grid gap-3">
            {outcomeOptions.map((option) => {
              const Icon = option.icon;
              const selected = outcome === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectOutcome(option.value)}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                    selected ? 'border-coral bg-orange-50 ring-1 ring-coral' : 'border-border hover:border-coral'
                  }`}
                >
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? 'text-coral' : 'text-slate-500'}`} />
                  <span>
                    <span className="block text-sm font-semibold text-charcoal">{ATTENDANCE_CONTACT_OUTCOME_LABELS[option.value]}</span>
                    <span className="mt-0.5 block text-xs text-text-light">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {outcome && attendanceContactOutcomeAllowsNotes(outcome) ? (
          <label className="mt-5 block">
            <span className="text-sm font-semibold text-charcoal">Additional information</span>
            <span className="mt-1 block text-xs text-text-light">Optional. Add any context that will help with future follow-up.</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={4000}
              rows={5}
              className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none focus:ring-1 focus:ring-coral"
              placeholder="Add notes about the conversation..."
            />
          </label>
        ) : null}

        {error ? <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={!outcome || !householdName || saving}
            className="inline-flex items-center rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Confirm and Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AttendanceContactPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-light">Loading contact form...</div>}>
      <AttendanceContactForm />
    </Suspense>
  );
}
