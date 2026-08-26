'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Mail, Save, Settings } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmailAddresses(value: string): string[] {
  return Array.from(new Set(
    value
      .split(/[\n,;]/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ));
}

export default function AdminSettingsPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [attendanceRecipients, setAttendanceRecipients] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Admin Settings | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [router, userProfile]);

  useEffect(() => {
    if (!userProfile?.isAdmin) return;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const snapshot = await getDoc(doc(db, 'adminSettings', 'attendance'));
        const recipients = snapshot.data()?.reportRecipients;
        setAttendanceRecipients(Array.isArray(recipients) ? recipients.join('\n') : '');
      } catch (loadError) {
        console.error('Error loading admin settings:', loadError);
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [userProfile]);

  if (!userProfile?.isAdmin) return null;

  const handleSave = async () => {
    const recipients = parseEmailAddresses(attendanceRecipients);
    const invalidAddress = recipients.find((email) => !EMAIL_PATTERN.test(email));

    if (recipients.length === 0) {
      setError('Add at least one attendance report email address.');
      setMessage(null);
      return;
    }
    if (invalidAddress) {
      setError(`Invalid email address: ${invalidAddress}`);
      setMessage(null);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await setDoc(
        doc(db, 'adminSettings', 'attendance'),
        {
          reportRecipients: recipients,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile.uid,
        },
        { merge: true },
      );
      setAttendanceRecipients(recipients.join('\n'));
      setMessage(`Saved ${recipients.length} attendance report recipient${recipients.length === 1 ? '' : 's'}.`);
    } catch (saveError) {
      console.error('Error saving admin settings:', saveError);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <div>
          <div className="flex items-center gap-3">
            <Settings className="h-7 w-7 text-coral" aria-hidden="true" />
            <h1 className="text-3xl font-bold text-charcoal">Settings</h1>
          </div>
          <p className="mt-2 text-sm text-text-light">
            Manage shared configuration for administrative features.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}
      {message ? (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>
      ) : null}

      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Mail className="mt-1 h-5 w-5 text-coral" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-semibold text-charcoal">Attendance Reports</h2>
            <p className="mt-1 text-sm text-text-light">
              Reports sent from the Attendance page will go to every address listed here.
            </p>
          </div>
        </div>

        <label className="mt-6 block">
          <span className="mb-2 block text-sm font-medium text-charcoal">Report recipients</span>
          <textarea
            value={attendanceRecipients}
            onChange={(event) => setAttendanceRecipients(event.target.value)}
            disabled={loading || saving}
            placeholder={'name@example.com\nsecond@example.com'}
            rows={6}
            className="w-full rounded-md border border-border px-3 py-2 text-sm text-charcoal focus:border-coral focus:outline-none disabled:bg-slate-50"
          />
          <span className="mt-2 block text-xs text-text-light">
            Enter one address per line, or separate addresses with commas.
          </span>
        </label>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="inline-flex items-center rounded-md bg-[#D6805F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#c56f4d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </section>
    </div>
  );
}
