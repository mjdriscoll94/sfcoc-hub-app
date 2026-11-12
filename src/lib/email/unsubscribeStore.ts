import {
  type DocumentReference,
  type Firestore,
  type WriteBatch,
  Timestamp,
} from 'firebase-admin/firestore';
import {
  createUnsubscribeToken,
  emailSuppressionId,
  normalizeEmailAddress,
} from './unsubscribeToken';

const WRITE_BATCH_LIMIT = 400;
const EMAIL_SUBSCRIPTIONS_OFF = {
  announcements: false,
  events: false,
  newsletter: false,
  prayerRequests: false,
  praiseReports: false,
};

type BatchOperation = (batch: WriteBatch) => void;

async function commitOperations(db: Firestore, operations: BatchOperation[]): Promise<void> {
  for (let start = 0; start < operations.length; start += WRITE_BATCH_LIMIT) {
    const batch = db.batch();
    operations.slice(start, start + WRITE_BATCH_LIMIT).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

export async function filterSuppressedEmailAddresses(
  db: Firestore,
  addresses: string[]
): Promise<{ emails: string[]; suppressedCount: number }> {
  const uniqueEmails = Array.from(
    new Set(addresses.map(normalizeEmailAddress).filter(Boolean))
  );
  if (uniqueEmails.length === 0) return { emails: [], suppressedCount: 0 };

  const suppressedIds = new Set<string>();
  const refs = uniqueEmails.map((email) =>
    db.collection('emailUnsubscribes').doc(emailSuppressionId(email))
  );

  for (let start = 0; start < refs.length; start += 100) {
    const snapshots = await db.getAll(...refs.slice(start, start + 100));
    snapshots.forEach((snapshot) => {
      if (snapshot.exists) suppressedIds.add(snapshot.id);
    });
  }

  const emails = uniqueEmails.filter((email) => !suppressedIds.has(emailSuppressionId(email)));
  return { emails, suppressedCount: uniqueEmails.length - emails.length };
}

export interface UnsubscribeResult {
  removedFromLists: Array<{ id: string; name: string }>;
  matchingUserCount: number;
}

/** Globally suppresses an address and removes it from every saved list and member subscription. */
export async function unsubscribeFromBroadcasts(
  db: Firestore,
  email: string,
  source: 'email-link' | 'one-click' = 'email-link'
): Promise<UnsubscribeResult> {
  const normalizedEmail = normalizeEmailAddress(email);
  const recordRef = db.collection('emailUnsubscribes').doc(emailSuppressionId(normalizedEmail));
  const [recordSnapshot, listsSnapshot, usersSnapshot] = await Promise.all([
    recordRef.get(),
    db.collection('emailLists').get(),
    db.collection('users').get(),
  ]);

  const now = Timestamp.now();
  const existing = recordSnapshot.data();
  const previouslyRemoved = Array.isArray(existing?.removedFromLists)
    ? (existing.removedFromLists as Array<{ id?: unknown; name?: unknown }>)
        .filter((item) => typeof item.id === 'string' && typeof item.name === 'string')
        .map((item) => ({ id: item.id as string, name: item.name as string }))
    : [];
  const removedById = new Map(previouslyRemoved.map((item) => [item.id, item]));
  const newlyRemoved: Array<{ id: string; name: string }> = [];
  const operations: BatchOperation[] = [];

  listsSnapshot.docs.forEach((listDocument) => {
    const data = listDocument.data();
    const currentEmails = Array.isArray(data.emails) ? (data.emails as string[]) : [];
    const filteredEmails = currentEmails.filter(
      (candidate) => normalizeEmailAddress(candidate) !== normalizedEmail
    );
    if (filteredEmails.length === currentEmails.length) return;

    const removedList = { id: listDocument.id, name: String(data.name || 'Unnamed list') };
    newlyRemoved.push(removedList);
    removedById.set(removedList.id, removedList);
    operations.push((batch) => {
      batch.update(listDocument.ref, { emails: filteredEmails, updatedAt: now });
    });
  });

  const matchingUsers = usersSnapshot.docs.filter(
    (userDocument) => normalizeEmailAddress(String(userDocument.data().email || '')) === normalizedEmail
  );
  matchingUsers.forEach((userDocument) => {
    operations.push((batch) => {
      batch.update(userDocument.ref, {
        emailSubscriptions: EMAIL_SUBSCRIPTIONS_OFF,
        emailGloballyUnsubscribed: true,
        emailUnsubscribedAt: now,
        updatedAt: now,
      });
    });
  });

  operations.unshift((batch) => {
    batch.set(
      recordRef,
      {
        emailToken: createUnsubscribeToken(normalizedEmail),
        unsubscribedAt: existing?.unsubscribedAt ?? now,
        lastRequestedAt: now,
        source,
        removedFromLists: Array.from(removedById.values()),
        matchingUserCount: matchingUsers.length,
      },
      { merge: true }
    );
  });

  await commitOperations(db, operations);
  return { removedFromLists: newlyRemoved, matchingUserCount: matchingUsers.length };
}

export async function removeEmailSuppression(
  db: Firestore,
  email: string
): Promise<void> {
  await db.collection('emailUnsubscribes').doc(emailSuppressionId(email)).delete();
}

export function suppressionRef(db: Firestore, email: string): DocumentReference {
  return db.collection('emailUnsubscribes').doc(emailSuppressionId(email));
}
