'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { ROLE_PERMISSIONS, type UserRole } from '@/types/roles';
import { listNameFromFilename, parseEmailsFromRawText } from '@/lib/utils/emailListImport';

type EmailListSummary = { id: string; name: string; emailCount: number };

export default function AdminEmailListsPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<EmailListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmailsText, setFormEmailsText] = useState('');
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canAccessAdmin =
    userProfile?.isAdmin ||
    (userProfile?.role &&
      (ROLE_PERMISSIONS[userProfile.role as UserRole]?.canManageAnnouncements ||
        ROLE_PERMISSIONS[userProfile.role as UserRole]?.canManageLifeGroups));

  useEffect(() => {
    document.title = 'Email Lists | Admin | Sioux Falls Church of Christ';
  }, []);

  const fetchLists = async () => {
    try {
      const res = await fetch('/api/admin/email-lists');
      if (!res.ok) throw new Error('Failed to load lists');
      const data = await res.json();
      setLists(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccessAdmin) {
      router.push('/');
      return;
    }
    fetchLists();
  }, [canAccessAdmin, router]);

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormEmailsText('');
    setImportSummary(null);
    setShowForm(true);
  };

  const openEdit = async (id: string) => {
    setEditingId(id);
    setFormName('');
    setFormEmailsText('');
    setImportSummary(null);
    try {
      const res = await fetch(`/api/admin/email-lists/${id}`);
      if (!res.ok) throw new Error('Failed to load list');
      const data = await res.json();
      setFormName(data.name || '');
      setFormEmailsText((data.emails || []).join('\n'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load list');
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName('');
    setFormEmailsText('');
    setImportSummary(null);
  };

  const handleCsvSelected = async (file: File | null) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const imported = parseEmailsFromRawText(raw);
      if (imported.length === 0) {
        setImportSummary(`No email addresses found in ${file.name}. Check the file format.`);
        return;
      }

      if (editingId) {
        const existing = new Set(parseEmailsFromRawText(formEmailsText));
        let added = 0;
        for (const e of imported) {
          if (!existing.has(e)) {
            existing.add(e);
            added++;
          }
        }
        setFormEmailsText([...existing].sort().join('\n'));
        setImportSummary(
          added > 0
            ? `Merged ${added} new address${added !== 1 ? 'es' : ''} from ${file.name} (${imported.length} in file).`
            : `No new addresses to add from ${file.name} (all were already on this list).`
        );
      } else {
        setFormEmailsText(imported.join('\n'));
        if (!formName.trim()) {
          setFormName(listNameFromFilename(file.name));
        }
        setImportSummary(
          `Imported ${imported.length} address${imported.length !== 1 ? 'es' : ''} from ${file.name}. You can edit the list name below.`
        );
      }
    } catch {
      setImportSummary('Could not read that file. Try a UTF-8 .csv or .txt file.');
    }
  };

  const getEmailsToSave = (): string[] => parseEmailsFromRawText(formEmailsText);

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('List name is required.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const emails = getEmailsToSave();
      if (emails.length === 0) {
        setError('Add at least one email address, or import a CSV file.');
        setSaving(false);
        return;
      }
      if (editingId) {
        const res = await fetch(`/api/admin/email-lists/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim(), emails }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      } else {
        const res = await fetch('/api/admin/email-lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim(), emails }),
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to create');
      }
      await fetchLists();
      closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/email-lists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDeleteConfirm(null);
      await fetchLists();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  if (!canAccessAdmin) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/send-email"
        className="inline-flex items-center text-sm text-text-light hover:text-charcoal mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Send Email
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Email Lists</h1>
          <p className="text-text-light mt-1">
            Create and manage custom lists of email addresses. Use them when sending emails from the Send Email page.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:opacity-90"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create list
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-error-bg border border-error/30 p-3 text-error text-sm mb-6">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg border border-border p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-charcoal mb-4">
            {editingId ? 'Edit list' : 'New list'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">List name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="block w-full rounded-md border border-border bg-card text-charcoal px-3 py-2 sm:text-sm"
                placeholder="e.g. Ministry Leaders (filled from CSV file name when you import)"
              />
            </div>

            <div className="rounded-md border border-border bg-bg/50 p-4 space-y-2">
              <label className="block text-sm font-medium text-charcoal">
                Import from CSV or text file
              </label>
              <p className="text-xs text-text-light">
                Upload a .csv export (e.g. from Google Contacts or a spreadsheet). Emails are found in any column;
                a header row is fine. For a new list, the list name is set from the file name until you change it.
                When editing, new addresses from the file are merged with the list.
              </p>
              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  void handleCsvSelected(f ?? null);
                  e.target.value = '';
                }}
                className="block w-full text-sm text-charcoal file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-on-primary file:font-semibold"
              />
            </div>

            {importSummary && (
              <p className="text-sm text-charcoal bg-sage/10 border border-sage/20 rounded-md px-3 py-2">
                {importSummary}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Email addresses (edit freely; one per line works best)
              </label>
              <textarea
                rows={10}
                value={formEmailsText}
                onChange={(e) => setFormEmailsText(e.target.value)}
                className="block w-full rounded-md border border-border bg-card text-charcoal px-3 py-2 sm:text-sm font-mono text-xs"
                placeholder="one@example.com&#10;two@example.com&#10;&#10;Or paste comma-separated addresses, or import a CSV above."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary text-on-primary text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Update list' : 'Create list'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 border border-border text-charcoal text-sm font-semibold rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-text-light">Loading lists…</div>
      ) : lists.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-8 text-center text-text-light">
          No email lists yet. Create one to send to a custom group of addresses.
        </div>
      ) : (
        <ul className="space-y-3">
          {lists.map((list) => (
            <li
              key={list.id}
              className="bg-white rounded-lg border border-border p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium text-charcoal">{list.name}</p>
                <p className="text-sm text-text-light">{list.emailCount} address{list.emailCount !== 1 ? 'es' : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(list.id)}
                  className="p-2 text-charcoal hover:bg-gray-100 rounded-lg"
                  aria-label={`Edit ${list.name}`}
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                {deleteConfirm === list.id ? (
                  <>
                    <span className="text-sm text-error">Delete?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(list.id)}
                      className="px-2 py-1 text-sm bg-error text-white rounded"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(null)}
                      className="px-2 py-1 text-sm border border-border rounded"
                    >
                      No
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(list.id)}
                    className="p-2 text-error hover:bg-error-bg rounded-lg"
                    aria-label={`Delete ${list.name}`}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
