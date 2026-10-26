import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

dotenv.config({ path: '.env.local' });

const escapeJsonControlCharacters = (value: string): string => {
  let result = '';
  let inString = false;
  let escaped = false;
  for (const character of value) {
    if (!inString) {
      result += character;
      if (character === '"') inString = true;
    } else if (escaped) {
      result += character;
      escaped = false;
    } else if (character === '\\') {
      result += character;
      escaped = true;
    } else if (character === '"') {
      result += character;
      inString = false;
    } else if (character === '\n') result += '\\n';
    else if (character === '\r') result += '\\r';
    else if (character === '\t') result += '\\t';
    else result += character;
  }
  return result;
};

const getServiceAccount = (): ServiceAccount => {
  const value = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (value) return JSON.parse(escapeJsonControlCharacters(value)) as ServiceAccount;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase Admin credentials are missing from .env.local.');
  return { projectId, clientEmail, privateKey };
};

if (getApps().length === 0) initializeApp({ credential: cert(getServiceAccount()) });
const db = getFirestore();
const shouldApply = process.argv.includes('--apply');
const exportDirectory = resolve(process.cwd(), 'migration-exports');

type Backup = { groups?: Array<{ id?: string }> };

const getLatestBackup = (): { path: string; data: Backup } => {
  if (!existsSync(exportDirectory)) throw new Error('No migration-exports directory found. Run npm run export:life-groups:legacy first.');
  const files = readdirSync(exportDirectory)
    .filter((name) => /^life-groups-legacy-.*\.json$/.test(name))
    .sort()
    .reverse();
  if (!files[0]) throw new Error('No LifeGroup JSON backup found. Run npm run export:life-groups:legacy first.');
  const path = resolve(exportDirectory, files[0]);
  return { path, data: JSON.parse(readFileSync(path, 'utf8')) as Backup };
};

async function resetAssignments() {
  const snapshot = await db.collection('lifeGroups').get();
  const groups = snapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name || doc.id }));
  console.log(`Found ${groups.length} life groups to reset:`);
  groups.forEach((group) => console.log(`- ${group.name} [${group.id}]`));

  if (!shouldApply) {
    console.log('Dry run only. Export a backup, then re-run with --apply.');
    return;
  }

  const backup = getLatestBackup();
  const backedUpIds = new Set((backup.data.groups || []).map((group) => group.id).filter(Boolean));
  const missingFromBackup = groups.filter((group) => !backedUpIds.has(group.id));
  if (missingFromBackup.length) {
    throw new Error(`Latest backup does not contain every current life group: ${missingFromBackup.map((group) => group.name).join(', ')}`);
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.update(doc.ref, {
    familyUnitIds: [],
    members: [],
    leaderId: '',
    leaderName: 'Unassigned',
    updatedAt: Timestamp.now(),
  }));
  await batch.commit();
  console.log(`Cleared household and leader assignments from ${groups.length} life groups.`);
  console.log(`Verified backup: ${backup.path}`);
  console.log('The lifegroupParticipants collection was not deleted.');
}

resetAssignments().catch((error) => {
  console.error('LifeGroup assignment reset failed:', error);
  process.exitCode = 1;
});
