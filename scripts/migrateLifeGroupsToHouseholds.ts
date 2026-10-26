import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { readFileSync } from 'node:fs';

dotenv.config({ path: '.env.local' });

const escapeControlCharactersInJsonStrings = (value: string): string => {
  let result = '';
  let inString = false;
  let escaped = false;

  for (const character of value) {
    if (!inString) {
      result += character;
      if (character === '"') inString = true;
      continue;
    }

    if (escaped) {
      result += character;
      escaped = false;
    } else if (character === '\\') {
      result += character;
      escaped = true;
    } else if (character === '"') {
      result += character;
      inString = false;
    } else if (character === '\n') {
      result += '\\n';
    } else if (character === '\r') {
      result += '\\r';
    } else if (character === '\t') {
      result += '\\t';
    } else {
      result += character;
    }
  }

  return result;
};

const getServiceAccount = (): ServiceAccount => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const value = escapeControlCharactersInJsonStrings(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return JSON.parse(value) as ServiceAccount;
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY in .env.local is not valid JSON.');
    }
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials are missing. Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local, or provide NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
    );
  }

  return { projectId, clientEmail, privateKey };
};

if (getApps().length === 0) {
  initializeApp({
    credential: cert(getServiceAccount()),
  });
}

const db = getFirestore();
const shouldApply = process.argv.includes('--apply');
const normalize = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const manualMappings = JSON.parse(
  readFileSync(new URL('./lifeGroupHouseholdOverrides.json', import.meta.url), 'utf8'),
) as Record<string, string>;

type Person = { id?: string; firstName?: string; lastName?: string };
type Household = {
  id: string;
  householdName?: string;
  normalizedName?: string;
  members?: Person[];
};

const memberSignature = (members: Person[] = []) => members
  .map((member) => normalize(`${member.firstName || ''} ${member.lastName || ''}`))
  .filter(Boolean)
  .sort()
  .join('|');

async function migrate() {
  const [legacySnapshot, householdSnapshot, groupSnapshot] = await Promise.all([
    db.collection('lifegroupParticipants').get(),
    db.collection('attendanceHouseholds').get(),
    db.collection('lifeGroups').get(),
  ]);

  const households: Household[] = householdSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  const householdIds = new Set(households.map((household) => household.id));
  const legacyHouseholds = new Map(legacySnapshot.docs.map((doc) => [doc.id, doc.data()]));
  const referencedHouseholdIds = new Set(
    groupSnapshot.docs.flatMap((doc) => Array.isArray(doc.data().familyUnitIds) ? doc.data().familyUnitIds : []),
  );
  const mappings = new Map<string, string>();
  const unmatchedLegacy: string[] = [];
  const invalidOverrides: string[] = [];
  let appliedOverrides = 0;

  for (const [legacyId, householdId] of Object.entries(manualMappings)) {
    if (!legacyHouseholds.has(legacyId) && !referencedHouseholdIds.has(legacyId)) {
      invalidOverrides.push(`${legacyId} (not found in the legacy collection or any life group)`);
    } else if (!householdIds.has(householdId)) {
      invalidOverrides.push(`${legacyId} -> ${householdId} (attendance household does not exist)`);
    } else {
      mappings.set(legacyId, householdId);
      appliedOverrides += 1;
    }
  }

  for (const legacyDoc of legacySnapshot.docs) {
    const legacy = legacyDoc.data();
    if (mappings.has(legacyDoc.id)) continue;

    const name = normalize(legacy.familyName);
    const signature = memberSignature(legacy.members);
    const candidates = households.filter((household) => {
      const householdName = normalize(household.normalizedName || household.householdName);
      return (name && householdName === name) || (signature && memberSignature(household.members) === signature);
    });

    if (candidates.length === 1) {
      mappings.set(legacyDoc.id, candidates[0].id);
    } else {
      unmatchedLegacy.push(`${legacy.familyName || legacyDoc.id} (${candidates.length ? 'multiple matches' : 'no match'})`);
    }
  }

  const updates: Array<{ id: string; data: { familyUnitIds: string[]; leaderId?: string } }> = [];
  const skippedGroups: string[] = [];

  for (const groupDoc of groupSnapshot.docs) {
    const group = groupDoc.data();
    const currentIds: string[] = Array.isArray(group.familyUnitIds) ? group.familyUnitIds : [];
    const unresolved = currentIds.filter((id) => !householdIds.has(id) && !mappings.has(id));
    if (unresolved.length) {
      const labels = unresolved.map((id) => `${legacyHouseholds.get(id)?.familyName || 'Unknown household'} [${id}]`);
      skippedGroups.push(`${group.name || groupDoc.id}: ${labels.join(', ')}`);
      continue;
    }

    const nextIds = currentIds.map((id) => householdIds.has(id) ? id : mappings.get(id)!);
    const data: { familyUnitIds: string[]; leaderId?: string } = { familyUnitIds: nextIds };

    if (typeof group.leaderId === 'string' && group.leaderId.includes('|')) {
      const [legacyHouseholdId] = group.leaderId.split('|');
      const householdId = mappings.get(legacyHouseholdId);
      if (householdId) {
        const household = households.find((candidate) => candidate.id === householdId);
        const leader = Array.isArray(household?.members)
          ? household.members.find((person: Person) => normalize(`${person.firstName || ''} ${person.lastName || ''}`) === normalize(group.leaderName))
          : undefined;
        if (!leader?.id) {
          skippedGroups.push(`${group.name || groupDoc.id}: could not match leader ${group.leaderName || group.leaderId}`);
          continue;
        }
        data.leaderId = `${householdId}|${leader.id}`;
      }
    }

    if (JSON.stringify(nextIds) !== JSON.stringify(currentIds) || data.leaderId) {
      updates.push({ id: groupDoc.id, data });
    }
  }

  console.log(`Matched ${mappings.size}/${legacySnapshot.size} legacy household records.`);
  console.log(`Applied ${appliedOverrides} manual override(s).`);
  console.log(`Prepared ${updates.length}/${groupSnapshot.size} life group updates.`);
  invalidOverrides.forEach((item) => console.warn(`Invalid manual override: ${item}`));
  unmatchedLegacy.forEach((item) => console.warn(`Unmatched legacy household: ${item}`));
  skippedGroups.forEach((item) => console.warn(`Skipped life group: ${item}`));

  if (!shouldApply) {
    console.log('Dry run only. Re-run with --apply after reviewing the matches.');
    return;
  }

  const batch = db.batch();
  updates.forEach(({ id, data }) => batch.update(db.collection('lifeGroups').doc(id), data));
  await batch.commit();
  console.log(`Updated ${updates.length} life groups to reference attendanceHouseholds.`);
}

migrate().catch((error) => {
  console.error('Life group household migration failed:', error);
  process.exitCode = 1;
});
