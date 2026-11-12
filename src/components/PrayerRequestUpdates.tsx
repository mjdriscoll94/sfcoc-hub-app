'use client';

import { useState } from 'react';
import { ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { authenticatedJson } from '@/lib/api/authenticatedFetch';
import type { PrayerPraiseItem, PrayerRequestUpdate } from '@/types/prayer';

export default function PrayerRequestUpdates({
  request,
  onChanged,
}: {
  request: PrayerPraiseItem;
  onChanged: () => void;
}) {
  const { userProfile } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [updates, setUpdates] = useState<PrayerRequestUpdate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [archiveAfter, setArchiveAfter] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const regionId = `prayer-updates-${request.id}`;

  const loadUpdates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authenticatedJson<{ updates: PrayerRequestUpdate[] }>(`/api/prayer-requests/${request.id}/updates`);
      setUpdates(data.updates);
      setLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Updates could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) await loadUpdates();
  };

  const addUpdate = async () => {
    if (!draft.trim()) return;
    setWorking(true);
    setError(null);
    try {
      await authenticatedJson(`/api/prayer-requests/${request.id}/updates`, {
        method: 'POST',
        body: JSON.stringify({ text: draft, archiveAfter }),
      });
      setDraft('');
      setArchiveAfter(false);
      await loadUpdates();
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The update could not be added.');
    } finally {
      setWorking(false);
    }
  };

  const saveEdit = async (updateId: string) => {
    if (!editingText.trim()) return;
    setWorking(true);
    setError(null);
    try {
      const data = await authenticatedJson<{ update: PrayerRequestUpdate }>(`/api/prayer-requests/${request.id}/updates/${updateId}`, {
        method: 'PATCH',
        body: JSON.stringify({ text: editingText }),
      });
      setUpdates((current) => current.map((update) => update.id === updateId ? data.update : update));
      setEditingId(null);
      setEditingText('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The update could not be saved.');
    } finally {
      setWorking(false);
    }
  };

  const deleteUpdate = async (updateId: string) => {
    if (!window.confirm('Delete this update? Followers will not receive another email.')) return;
    setWorking(true);
    setError(null);
    try {
      await authenticatedJson(`/api/prayer-requests/${request.id}/updates/${updateId}`, { method: 'DELETE' });
      setUpdates((current) => current.filter((update) => update.id !== updateId));
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The update could not be deleted.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mt-4 border-t border-sage/20 pt-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={toggleExpanded}
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-charcoal hover:bg-bg"
      >
        <ChevronRight aria-hidden="true" className={`h-5 w-5 text-coral-dark transition-transform ${expanded ? 'rotate-90' : ''}`} />
        Updates ({request.updateCount})
      </button>

      {expanded ? (
        <div id={regionId} className="mt-3 rounded-xl bg-bg p-4">
          {request.canManage && request.approvalStatus === 'approved' ? (
            <div className="mb-4 rounded-xl border border-border bg-white p-4">
              <label htmlFor={`new-update-${request.id}`} className="font-semibold text-charcoal">Add an update</label>
              <textarea
                id={`new-update-${request.id}`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={3000}
                rows={3}
                placeholder={request.status === 'archived' ? 'Adding this update will restore the request.' : 'Share what has changed or how people can continue praying.'}
                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-3 text-charcoal"
              />
              {request.status === 'active' ? (
                <label className="mt-3 flex items-start gap-2 text-sm text-charcoal">
                  <input type="checkbox" checked={archiveAfter} onChange={(event) => setArchiveAfter(event.target.checked)} className="mt-1 h-4 w-4 rounded border-border text-coral-dark" />
                  <span><strong>Add as final update and archive</strong><span className="block text-text-light">Followers will receive the update and an archive notice.</span></span>
                </label>
              ) : null}
              <div className="mt-3 flex justify-end">
                <button type="button" disabled={working || !draft.trim()} onClick={addUpdate} className="min-h-11 rounded-lg bg-charcoal px-4 font-semibold text-white hover:bg-charcoal-light disabled:opacity-50">
                  {working ? 'Saving…' : request.status === 'archived' ? 'Add update and restore' : 'Post update'}
                </button>
              </div>
            </div>
          ) : null}

          {error ? <p role="alert" className="mb-3 rounded-lg bg-error-bg p-3 text-sm text-error">{error}</p> : null}
          {loading ? <p className="py-4 text-sm text-text-light">Loading updates…</p> : updates.length === 0 ? (
            <p className="py-3 text-sm text-text-light">No updates have been added yet.</p>
          ) : (
            <ol className="space-y-3">
              {updates.map((update) => {
                const canEdit = userProfile?.isAdmin || userProfile?.role === 'admin' || update.authorId === userProfile?.uid;
                return (
                  <li key={update.id} className="rounded-lg border border-border bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-charcoal">{update.authorName}</span>
                      <span className="tabular-nums text-text-light">{new Date(update.createdAt).toLocaleDateString()}{update.edited ? ' · Edited' : ''}</span>
                    </div>
                    {editingId === update.id ? (
                      <div className="mt-3">
                        <textarea value={editingText} onChange={(event) => setEditingText(event.target.value)} maxLength={3000} rows={3} className="w-full rounded-lg border border-border bg-white px-3 py-3 text-charcoal" aria-label="Edit prayer request update" />
                        <div className="mt-2 flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingId(null)} className="min-h-10 rounded-lg px-3 font-semibold text-charcoal hover:bg-gray-100">Cancel</button>
                          <button type="button" disabled={working || !editingText.trim()} onClick={() => saveEdit(update.id)} className="min-h-10 rounded-lg bg-charcoal px-3 font-semibold text-white disabled:opacity-50">Save</button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-charcoal/85">{update.text}</p>
                    )}
                    {canEdit && editingId !== update.id ? (
                      <div className="mt-2 flex justify-end gap-1">
                        <button type="button" onClick={() => { setEditingId(update.id); setEditingText(update.text); }} className="min-h-10 min-w-10 rounded-lg text-charcoal hover:bg-bg" aria-label="Edit update"><Pencil aria-hidden="true" className="mx-auto h-4 w-4" /></button>
                        <button type="button" onClick={() => deleteUpdate(update.id)} className="min-h-10 min-w-10 rounded-lg text-error hover:bg-error-bg" aria-label="Delete update"><Trash2 aria-hidden="true" className="mx-auto h-4 w-4" /></button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
