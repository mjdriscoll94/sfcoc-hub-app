'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { ROLE_PERMISSIONS, type UserRole } from '@/types/roles';
import {
  MAX_EMAIL_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES_PER_FILE,
  MAX_ATTACHMENT_BYTES_TOTAL,
} from '@/lib/email/attachments';

type EmailListSummary = { id: string; name: string; emailCount: number };

/** Single select value: built-in keys, or `list:<firestoreId>` for a saved list. */
type RecipientSelection = 'all' | 'announcements' | 'events' | 'newsletter' | `list:${string}`;

export default function AdminSendEmailPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientSelection, setRecipientSelection] = useState<RecipientSelection>('all');
  const [emailLists, setEmailLists] = useState<EmailListSummary[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ count: number } | null>(null);

  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);

  const canAccessAdmin =
    userProfile?.isAdmin ||
    (userProfile?.role &&
      (ROLE_PERMISSIONS[userProfile.role as UserRole]?.canManageAnnouncements ||
        ROLE_PERMISSIONS[userProfile.role as UserRole]?.canManageLifeGroups));

  useEffect(() => {
    document.title = 'Send Email | Admin | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/email-lists');
        if (res.ok) {
          const data = await res.json();
          setEmailLists(data);
        }
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  if (userProfile && !canAccessAdmin) {
    router.push('/');
    return null;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (picked.length === 0) return;

    setAttachments((prev) => {
      const combined = [...prev, ...picked].slice(0, MAX_EMAIL_ATTACHMENTS);
      const total = combined.reduce((sum, f) => sum + f.size, 0);
      if (total > MAX_ATTACHMENT_BYTES_TOTAL) {
        setError(
          `Total attachment size cannot exceed ${MAX_ATTACHMENT_BYTES_TOTAL / (1024 * 1024)} MB.`
        );
        return prev;
      }
      for (const f of picked) {
        if (f.size > MAX_ATTACHMENT_BYTES_PER_FILE) {
          setError(
            `Each file must be ${MAX_ATTACHMENT_BYTES_PER_FILE / (1024 * 1024)} MB or smaller (${f.name}).`
          );
          return prev;
        }
      }
      setError(null);
      return combined;
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message are required.');
      return;
    }
    const isSavedList = recipientSelection.startsWith('list:');
    const listId = isSavedList ? recipientSelection.slice(5) : '';
    if (isSavedList && !listId) {
      setError('Please select an email list.');
      return;
    }
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject.trim());
      formData.append('content', body.trim());
      formData.append('audience', isSavedList ? 'list' : recipientSelection);
      if (isSavedList && listId) formData.append('listId', listId);
      attachments.forEach((file) => formData.append('attachments', file));

      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSuccess({ count: data.recipientCount ?? 0 });
      setSubject('');
      setBody('');
      setAttachments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestError(null);
    setTestSuccess(false);
    const addr = testEmail.trim();
    if (!addr) {
      setTestError('Enter an email address.');
      return;
    }
    setTestSending(true);
    try {
      const res = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: addr }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details?.message || 'Failed to send test');
      setTestSuccess(true);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center text-sm text-text-light hover:text-charcoal mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Admin
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-charcoal mb-2">Send Email to Members</h1>
          <p className="text-text-light">
            Send an email to approved members, subscription groups, or a saved email list.
          </p>
        </div>
        <Link
          href="/admin/send-email/lists"
          className="text-sm font-medium text-primary hover:underline"
        >
          Manage email lists
        </Link>
      </div>

      <div id="send-test-email" className="mb-8 rounded-lg border border-border bg-card p-6 shadow-sm scroll-mt-8">
        <h2 className="text-lg font-semibold text-charcoal mb-1">Send test email</h2>
        <p className="text-sm text-text-light mb-4">
          Sends one templated message (same layout as member emails: logo and footer) to a single address.
          Uses the announcements sender identity. Does not contact any mailing list.
        </p>
        <form onSubmit={handleSendTest} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="test-email" className="block text-sm font-medium text-charcoal mb-1">
              Recipient email
            </label>
            <input
              id="test-email"
              type="email"
              autoComplete="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="block w-full rounded-md border border-border bg-white text-charcoal focus:ring-primary focus:border-primary sm:text-sm px-3 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={testSending}
            className="shrink-0 px-4 py-2 border border-primary text-primary text-sm font-semibold rounded-lg hover:bg-primary/5 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {testSending ? 'Sending…' : 'Send test email'}
          </button>
        </form>
        {testError && (
          <p className="mt-3 text-sm text-error" role="alert">
            {testError}
          </p>
        )}
        {testSuccess && (
          <p className="mt-3 text-sm text-success">
            Test email sent. Check the inbox (and spam) for the recipient you entered.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg border border-border p-6 shadow-sm">
        <div>
          <label htmlFor="audience" className="block text-sm font-medium text-charcoal mb-1">
            Who should receive this email?
          </label>
          <select
            id="audience"
            value={recipientSelection}
            onChange={(e) => setRecipientSelection(e.target.value as RecipientSelection)}
            className="block w-full rounded-md border border-border bg-card text-charcoal focus:ring-primary focus:border-primary sm:text-sm px-3 py-2"
          >
            <option value="all">All approved members</option>
            <option value="announcements">Announcements subscribers only</option>
            <option value="events">Events subscribers only</option>
            <option value="newsletter">Newsletter subscribers only</option>
            {emailLists.length > 0 && (
              <optgroup label="Saved email lists">
                {emailLists.map((list) => {
                  const n = list.emailCount;
                  const countLabel = `${n} ${n === 1 ? 'recipient' : 'recipients'}`;
                  return (
                    <option
                      key={list.id}
                      value={`list:${list.id}`}
                      disabled={n === 0}
                    >
                      {list.name} ({countLabel})
                    </option>
                  );
                })}
              </optgroup>
            )}
          </select>
          {emailLists.length === 0 && (
            <p className="text-sm text-text-light mt-2">
              No saved lists yet.{' '}
              <Link href="/admin/send-email/lists" className="text-primary hover:underline">
                Create an email list
              </Link>{' '}
              to target a specific group.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-charcoal mb-1">
            Subject
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="block w-full rounded-md border border-border bg-card text-charcoal focus:ring-primary focus:border-primary sm:text-sm px-3 py-2"
            placeholder="Email subject"
            required
          />
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-charcoal mb-1">
            Message
          </label>
          <textarea
            id="body"
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="block w-full rounded-md border border-border bg-card text-charcoal focus:ring-primary focus:border-primary sm:text-sm px-3 py-2"
            placeholder="Write your message. You can use plain text; it will be wrapped in the church email template."
            required
          />
        </div>

        <div>
          <label htmlFor="attachments" className="block text-sm font-medium text-charcoal mb-1">
            Attachments (optional)
          </label>
          <p className="text-sm text-text-light mb-2">
            Up to {MAX_EMAIL_ATTACHMENTS} files, {MAX_ATTACHMENT_BYTES_PER_FILE / (1024 * 1024)} MB each,{' '}
            {MAX_ATTACHMENT_BYTES_TOTAL / (1024 * 1024)} MB total. PDF, images, and common documents.
          </p>
          <input
            id="attachments"
            type="file"
            multiple
            disabled={attachments.length >= MAX_EMAIL_ATTACHMENTS || sending}
            onChange={handleAttachmentChange}
            className="block w-full text-sm text-charcoal file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
          />
          {attachments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {attachments.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="truncate text-charcoal">
                    {file.name}{' '}
                    <span className="text-text-light">({formatFileSize(file.size)})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    disabled={sending}
                    className="shrink-0 text-error hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-error-bg border border-error/30 p-3 text-error text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-success-bg border border-success/30 p-3 text-success text-sm">
            Email sent successfully to {success.count} recipient{success.count !== 1 ? 's' : ''}.
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {sending ? 'Sending…' : 'Send Email'}
          </button>
          <Link
            href="/admin"
            className="px-4 py-2 border border-border text-charcoal text-sm font-semibold rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-charcoal"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
