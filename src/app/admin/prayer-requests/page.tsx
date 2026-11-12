'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import ConfirmationModal from '@/components/ConfirmationModal';
import { usePrayerPraise, PrayerPraiseItem } from '@/hooks/usePrayerPraise';
import { PencilIcon, TrashIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { Download, RotateCcw } from 'lucide-react';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import PrayerFollowers from '@/components/admin/PrayerFollowers';

export default function PrayerRequestsManagement() {
  useEffect(() => {
    document.title = 'Manage Prayer Requests | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const router = useRouter();
  const { items, loading, error, updatePrayerRequest, deletePrayerRequest } = usePrayerPraise(
    undefined,
    true
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    priority: 'Urgent' | 'Batched' | undefined;
    status: 'active' | 'archived';
    approvalStatus: 'pending' | 'approved' | 'rejected';
  }>({
    title: '',
    description: '',
    priority: undefined,
    status: 'active',
    approvalStatus: 'approved',
  });
  const [itemToDelete, setItemToDelete] = useState<PrayerPraiseItem | null>(null);
  const [itemToArchive, setItemToArchive] = useState<PrayerPraiseItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [includeConfidential, setIncludeConfidential] = useState(false);
  const [includePendingRejected, setIncludePendingRejected] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [userProfile, router]);

  const startEdit = (item: PrayerPraiseItem) => {
    setEditingId(item.id);
    setEditForm({
      title: item.title,
      description: item.description,
      priority: item.priority,
      status: item.status,
      approvalStatus: item.approvalStatus,
    });
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaveError(null);
    try {
      await updatePrayerRequest(editingId, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        priority: editForm.priority,
        status: editForm.status,
        approvalStatus: editForm.approvalStatus,
      });
      cancelEdit();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleDeleteClick = (item: PrayerPraiseItem) => {
    setItemToDelete(item);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deletePrayerRequest(itemToDelete.id);
      setItemToDelete(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleArchiveClick = (item: PrayerPraiseItem) => {
    setItemToArchive(item);
  };

  const handleArchiveConfirm = async () => {
    if (!itemToArchive) return;
    try {
      await updatePrayerRequest(itemToArchive.id, { status: 'archived' });
      setItemToArchive(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to archive');
    }
  };

  const handleRestore = async (item: PrayerPraiseItem) => {
    setSaveError(null);
    try {
      await updatePrayerRequest(item.id, { action: 'restore' });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to restore');
    }
  };

  const exportRequests = async () => {
    setExporting(true);
    setSaveError(null);
    try {
      const params = new URLSearchParams({
        includeConfidential: String(includeConfidential),
        includePendingRejected: String(includePendingRejected),
      });
      const response = await authenticatedFetch(`/api/admin/prayer-requests/export?${params}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'The export could not be created.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prayer-request-archive-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'The export could not be created.');
    } finally {
      setExporting(false);
    }
  };

  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentItems = items.filter((item) => item.dateCreated >= thirtyDaysAgo);
  const olderItems = items.filter((item) => item.dateCreated < thirtyDaysAgo);

  if (!userProfile?.isAdmin) return null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <h1 className="text-3xl font-bold text-charcoal">Manage Prayer Requests</h1>
      </div>

      {(error || saveError) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error || saveError}</p>
        </div>
      )}

      <p className="text-text-light mb-6">
        View current and archived prayer requests and praise reports. Changes take effect immediately.
      </p>

      <section className="mb-8 rounded-xl border border-border bg-white p-5 shadow-sm" aria-labelledby="prayer-export-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="prayer-export-heading" className="text-xl font-bold text-charcoal">Export prayer requests</h2>
            <p className="mt-1 text-sm text-text-light">Download a compact PDF of approved current and archived prayer requests.</p>
          </div>
          <button type="button" disabled={exporting} onClick={exportRequests} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-charcoal px-4 font-semibold text-white hover:bg-charcoal-light disabled:opacity-50">
            <Download aria-hidden="true" className="h-4 w-4" /> {exporting ? 'Creating PDF…' : 'Download PDF'}
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-charcoal">
            <input type="checkbox" checked={includePendingRejected} onChange={(event) => setIncludePendingRejected(event.target.checked)} className="mt-1 h-4 w-4 rounded border-border text-coral-dark" />
            <span><strong className="block">Include pending and rejected</strong><span className="text-text-light">Adds submissions that were not approved.</span></span>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-error/30 bg-error-bg/40 p-3 text-sm text-charcoal">
            <input type="checkbox" checked={includeConfidential} onChange={(event) => setIncludeConfidential(event.target.checked)} className="mt-1 h-4 w-4 rounded border-border text-coral-dark" />
            <span><strong className="block">Include confidential requests</strong><span className="text-text-light">The downloaded file will contain admin-only information.</span></span>
          </label>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="bg-white rounded-lg border border-border p-8 text-center">
          <p className="text-text-light">No active prayer requests or praise reports in the system.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { label: null as string | null, items: recentItems },
            { label: 'Older than 30 days', items: olderItems },
          ]
            .filter((s) => s.items.length > 0)
            .map((section) => (
              <div key={section.label ?? 'recent'} className="space-y-4">
                {section.label && (
                  <h2 className="text-lg font-semibold text-charcoal border-b border-border pb-2">
                    {section.label}
                  </h2>
                )}
                {section.items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg border border-border p-4 shadow-sm"
                  >
                    {editingId === item.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-1">Title</label>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
                          <textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal resize-none"
                          />
                        </div>
                        {item.type === 'prayer' && (
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">Priority</label>
                            <select
                              value={editForm.priority ?? ''}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  priority: e.target.value ? (e.target.value as 'Urgent' | 'Batched') : undefined,
                                })
                              }
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
                            >
                              <option value="">None</option>
                              <option value="Urgent">Urgent</option>
                              <option value="Batched">Batched</option>
                            </select>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
                            <select
                              value={editForm.status}
                              onChange={(e) =>
                                setEditForm({ ...editForm, status: e.target.value as 'active' | 'archived' })
                              }
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
                            >
                              <option value="active">Active</option>
                              <option value="archived">Archived</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">Approval</label>
                            <select
                              value={editForm.approvalStatus}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  approvalStatus: e.target.value as 'pending' | 'approved' | 'rejected',
                                })
                              }
                              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-coral bg-white text-charcoal"
                            >
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-4 py-2 border border-border rounded-md text-charcoal hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSave}
                            className="px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary-hover"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                                  item.type === 'prayer'
                                    ? 'bg-coral/20 text-coral'
                                    : 'bg-sage/20 text-sage'
                                }`}
                              >
                                {item.type === 'prayer' ? 'Prayer Request' : 'Praise Report'}
                              </span>
                              <span
                                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                                  item.approvalStatus === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : item.approvalStatus === 'pending'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {item.approvalStatus}
                              </span>
                              <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${item.status === 'archived' ? 'bg-gray-100 text-text-light' : 'bg-blue-50 text-blue-800'}`}>
                                {item.status}
                              </span>
                              {item.type === 'prayer' && item.priority && (
                                <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-charcoal/10 text-charcoal">
                                  {item.priority}
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-charcoal mt-2">{item.title}</h3>
                            <p className="text-sm text-text-light mt-1">
                              {item.isAnonymous ? 'Anonymous' : item.author.name} ·{' '}
                              {new Date(item.dateCreated).toLocaleDateString()}
                              {item.isAdminOnly && ' · Admin only'}
                            </p>
                            <p className="text-charcoal text-sm mt-2 whitespace-pre-wrap">{item.description}</p>
                            {item.type === 'prayer' ? <PrayerFollowers requestId={item.id} count={item.followerCount} /> : null}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="p-2 text-coral hover:bg-coral/10 rounded-md transition-colors"
                              title="Edit"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            {item.status === 'archived' ? (
                              <button type="button" onClick={() => handleRestore(item)} className="p-2 text-coral-dark hover:bg-coral/10 rounded-md transition-colors" title="Restore" aria-label={`Restore ${item.title}`}>
                                <RotateCcw className="h-5 w-5" />
                              </button>
                            ) : (
                              <button type="button" onClick={() => handleArchiveClick(item)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="Archive" aria-label={`Archive ${item.title}`}>
                                <ArchiveBoxIcon className="h-5 w-5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(item)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!itemToArchive}
        onClose={() => setItemToArchive(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive prayer request?"
        message={
          itemToArchive
            ? `Archive "${itemToArchive.title}"? It will no longer appear on the prayer board.`
            : ''
        }
        confirmText="Archive"
        cancelText="Cancel"
      />
      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete prayer request?"
        message={
          itemToDelete
            ? `Are you sure you want to permanently delete "${itemToDelete.title}"? This cannot be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
