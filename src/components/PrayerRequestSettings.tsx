'use client';

import { useState } from 'react';
import { Archive, BellOff, RotateCcw } from 'lucide-react';
import { usePrayerPraise } from '@/hooks/usePrayerPraise';
import PrayerRequestUpdates from '@/components/PrayerRequestUpdates';

export default function PrayerRequestSettings() {
  const following = usePrayerPraise('prayer', false, 'following', true);
  const mine = usePrayerPraise('prayer', false, 'mine');
  const [actionError, setActionError] = useState<string | null>(null);

  const reportActionError = (caught: unknown, fallback: string) => {
    setActionError(caught instanceof Error ? caught.message : fallback);
  };

  const archiveOwn = async (id: string) => {
    if (!window.confirm('Archive this prayer request? Followers will be notified.')) return;
    setActionError(null);
    try {
      await mine.updatePrayerRequest(id, { action: 'archive' });
      mine.retry();
      following.retry();
    } catch (caught) {
      reportActionError(caught, 'The prayer request could not be archived.');
    }
  };

  const restoreOwn = async (id: string) => {
    setActionError(null);
    try {
      await mine.updatePrayerRequest(id, { action: 'restore' });
      mine.retry();
    } catch (caught) {
      reportActionError(caught, 'The prayer request could not be restored.');
    }
  };

  const unfollow = async (id: string) => {
    setActionError(null);
    try {
      await following.setFollowing(id, false);
    } catch (caught) {
      reportActionError(caught, 'The prayer request could not be unfollowed.');
    }
  };

  return (
    <section className="mb-8 rounded-lg border border-sage/20 bg-card p-6" aria-labelledby="prayer-request-settings-heading">
      <h2 id="prayer-request-settings-heading" className="text-lg font-bold text-text">Prayer request activity</h2>
      <p className="mt-2 text-sm text-text/70">Manage the requests you follow and the requests you have submitted.</p>
      {actionError ? <p role="alert" className="mt-4 rounded-lg bg-error-bg p-3 text-sm text-error">{actionError}</p> : null}

      <div id="followed-prayer-requests" className="mt-6">
        <h3 className="font-semibold text-charcoal">Following</h3>
        {following.loading ? <p className="mt-2 text-sm text-text-light">Loading followed requests…</p> : following.error ? (
          <p role="alert" className="mt-2 rounded-lg bg-error-bg p-3 text-sm text-error">{following.error}</p>
        ) : following.items.length === 0 ? (
          <p className="mt-2 text-sm text-text-light">You are not following any prayer requests.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-white">
            {following.items.map((request) => (
              <li key={request.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-charcoal">{request.title}</p>
                  <p className="mt-1 text-sm text-text-light">{request.status === 'archived' ? 'Archived' : `${request.updateCount} update${request.updateCount === 1 ? '' : 's'}`}</p>
                </div>
                <button type="button" onClick={() => unfollow(request.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 font-semibold text-coral-dark hover:bg-coral/10">
                  <BellOff aria-hidden="true" className="h-4 w-4" /> Unfollow
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-7 border-t border-border pt-6">
        <h3 className="font-semibold text-charcoal">My prayer requests</h3>
        {mine.loading ? <p className="mt-2 text-sm text-text-light">Loading your requests…</p> : mine.error ? (
          <p role="alert" className="mt-2 rounded-lg bg-error-bg p-3 text-sm text-error">{mine.error}</p>
        ) : mine.items.length === 0 ? (
          <p className="mt-2 text-sm text-text-light">You have not submitted a prayer request.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {mine.items.map((request) => (
              <article key={request.id} className="rounded-xl border border-border bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-charcoal">{request.title}</h4>
                      <span className="rounded-full bg-bg px-2 py-1 text-xs font-semibold capitalize text-text-light">{request.approvalStatus === 'approved' ? request.status : request.approvalStatus}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-text-light">{request.description}</p>
                    {request.status === 'archived' ? <p className="mt-1 text-xs text-text-light">Add an update below to restore it and restart the three-month activity period.</p> : null}
                  </div>
                  {request.approvalStatus === 'approved' ? request.status === 'archived' ? (
                    <button type="button" onClick={() => restoreOwn(request.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 font-semibold text-coral-dark hover:bg-coral/10">
                      <RotateCcw aria-hidden="true" className="h-4 w-4" /> Restore
                    </button>
                  ) : (
                    <button type="button" onClick={() => archiveOwn(request.id)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 font-semibold text-text-light hover:bg-bg hover:text-charcoal">
                      <Archive aria-hidden="true" className="h-4 w-4" /> Archive
                    </button>
                  ) : null}
                </div>
                {request.type === 'prayer' && request.approvalStatus === 'approved' ? <PrayerRequestUpdates request={request} onChanged={mine.retry} /> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
