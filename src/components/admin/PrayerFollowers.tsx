'use client';

import { useState } from 'react';
import { authenticatedJson } from '@/lib/api/authenticatedFetch';

type Follower = { uid: string; name: string; email: string };

export default function PrayerFollowers({ requestId, count }: { requestId: string; count: number }) {
  const [followers, setFollowers] = useState<Follower[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (open: boolean) => {
    if (!open || followers || count === 0) return;
    try {
      const data = await authenticatedJson<{ followers: Follower[] }>(`/api/prayer-requests/${requestId}/followers`);
      setFollowers(data.followers);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Followers could not be loaded.');
    }
  };

  return (
    <details className="mt-3 text-sm" onToggle={(event) => load(event.currentTarget.open)}>
      <summary className="min-h-10 cursor-pointer rounded-lg px-2 py-2 font-semibold text-text-light hover:bg-bg">Followers ({count})</summary>
      <div className="mt-2 rounded-lg bg-bg p-3">
        {error ? <p className="text-error">{error}</p> : count === 0 ? <p className="text-text-light">No followers.</p> : !followers ? <p className="text-text-light">Loading…</p> : (
          <ul className="space-y-2">
            {followers.map((follower) => <li key={follower.uid}><span className="font-semibold text-charcoal">{follower.name}</span><span className="ml-2 text-text-light">{follower.email}</span></li>)}
          </ul>
        )}
      </div>
    </details>
  );
}
