import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
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

const csvCell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;
type LegacyAssignment = {
  id: string;
  familyName?: string;
  members?: Array<{ firstName?: string; lastName?: string }>;
  missing?: boolean;
  [key: string]: unknown;
};

async function exportAssignments() {
  const [groupSnapshot, legacySnapshot] = await Promise.all([
    db.collection('lifeGroups').get(),
    db.collection('lifegroupParticipants').get(),
  ]);
  const legacy = new Map<string, LegacyAssignment>(
    legacySnapshot.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() } as LegacyAssignment]),
  );
  const groups = groupSnapshot.docs.map((doc) => {
    const data = doc.data();
    const householdIds: string[] = Array.isArray(data.familyUnitIds) ? data.familyUnitIds : [];
    return {
      id: doc.id,
      name: data.name || doc.id,
      leaderId: data.leaderId || null,
      leaderName: data.leaderName || null,
      familyUnitIds: householdIds,
      assignments: householdIds.map((id): LegacyAssignment => legacy.get(id) || { id, missing: true }),
      lifeGroupDocument: data,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const exportedAt = new Date().toISOString();
  const stamp = exportedAt.replace(/[:.]/g, '-');
  const outputDirectory = resolve(process.cwd(), 'migration-exports');
  mkdirSync(outputDirectory, { recursive: true });
  const jsonPath = resolve(outputDirectory, `life-groups-legacy-${stamp}.json`);
  const csvPath = resolve(outputDirectory, `life-groups-legacy-${stamp}.csv`);
  writeFileSync(jsonPath, `${JSON.stringify({ exportedAt, groups }, null, 2)}\n`, { mode: 0o600 });

  const rows = [['Group ID', 'Group Name', 'Leader', 'Legacy Household ID', 'Household Name', 'Members', 'Missing Legacy Document']];
  groups.forEach((group) => group.assignments.forEach((assignment) => {
    const members = Array.isArray(assignment.members)
      ? assignment.members.map((member: { firstName?: string; lastName?: string }) => `${member.firstName || ''} ${member.lastName || ''}`.trim()).join('; ')
      : '';
    rows.push([
      group.id,
      group.name,
      group.leaderName || '',
      assignment.id,
      typeof assignment.familyName === 'string' ? assignment.familyName : '',
      members,
      assignment.missing ? 'yes' : 'no',
    ]);
  }));
  writeFileSync(csvPath, `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`, { mode: 0o600 });

  console.log(`Exported ${groups.length} life groups.`);
  console.log(`JSON backup: ${jsonPath}`);
  console.log(`CSV reference: ${csvPath}`);
}

exportAssignments().catch((error) => {
  console.error('Legacy LifeGroup export failed:', error);
  process.exitCode = 1;
});
