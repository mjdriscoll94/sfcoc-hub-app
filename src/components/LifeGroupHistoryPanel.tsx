'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, orderBy, query, setDoc, Timestamp } from 'firebase/firestore';
import { ArchiveBoxArrowDownIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { db } from '@/lib/firebase/config';
import type {
  FamilyUnit,
  FamilyMember,
  LifeGroup,
  LifeGroupHistoryGroup,
  LifeGroupYearSnapshot,
} from '@/types';

interface LifeGroupHistoryPanelProps {
  lifeGroups: LifeGroup[];
  households: FamilyUnit[];
  userId: string;
}

type SnapshotHouseholdSource = Pick<FamilyUnit, 'id' | 'familyName' | 'members'>;

const buildSnapshotGroups = (lifeGroups: LifeGroup[], households: SnapshotHouseholdSource[]): LifeGroupHistoryGroup[] => {
  const householdsById = new Map(households.map((household) => [household.id, household]));
  return lifeGroups.map((group) => {
    const householdIds = group.familyUnitIds || [];
    return {
      id: group.id,
      name: group.name,
      description: group.description || null,
      leaderId: group.leaderId || '',
      leaderName: group.leaderName || 'Unassigned',
      meetingDay: group.meetingDay || null,
      meetingTime: group.meetingTime || null,
      meetingLocation: group.meetingLocation || null,
      isActive: group.isActive !== false,
      householdIds,
      households: householdIds.map((id) => {
        const household = householdsById.get(id);
        if (!household) return { id, name: 'Missing household', members: [], missing: true };
        return {
          id,
          name: household.familyName,
          members: household.members.map((member) => ({
            id: member.id,
            firstName: member.firstName,
            lastName: member.lastName,
          })),
        };
      }),
    };
  });
};

export default function LifeGroupHistoryPanel({ lifeGroups, households, userId }: LifeGroupHistoryPanelProps) {
  const currentYear = new Date().getFullYear();
  const [snapshots, setSnapshots] = useState<LifeGroupYearSnapshot[]>([]);
  const [snapshotYear, setSnapshotYear] = useState(currentYear);
  const [viewYear, setViewYear] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const snapshotsQuery = query(collection(db, 'lifeGroupYearSnapshots'), orderBy('year', 'desc'));
    return onSnapshot(snapshotsQuery, (snapshot) => {
      const nextSnapshots = snapshot.docs.map((snapshotDoc) => {
        const data = snapshotDoc.data();
        return {
          id: snapshotDoc.id,
          year: Number(data.year || snapshotDoc.id),
          groups: Array.isArray(data.groups) ? data.groups : [],
          capturedAt: data.capturedAt instanceof Timestamp ? data.capturedAt.toDate() : new Date(),
          capturedBy: data.capturedBy || '',
        } as LifeGroupYearSnapshot;
      });
      setSnapshots(nextSnapshots);
      setViewYear((current) => current ?? nextSnapshots[0]?.year ?? null);
      setError(null);
    }, (snapshotError) => {
      console.error('Error loading LifeGroup history:', snapshotError);
      setError('Failed to load LifeGroup history.');
    });
  }, []);

  const selectedSnapshot = snapshots.find((snapshot) => snapshot.year === viewYear);
  const existingYears = useMemo(() => new Set(snapshots.map((snapshot) => snapshot.year)), [snapshots]);

  const saveSnapshot = async () => {
    if (!Number.isInteger(snapshotYear) || snapshotYear < 1900 || snapshotYear > 2100) {
      setError('Enter a valid four-digit year.');
      return;
    }
    if (existingYears.has(snapshotYear) && !window.confirm(`Replace the saved ${snapshotYear} LifeGroup snapshot?`)) return;

    try {
      setSaving(true);
      setError(null);
      const knownHouseholdIds = new Set(households.map((household) => household.id));
      const assignedIds = lifeGroups.flatMap((group) => group.familyUnitIds || []);
      const needsLegacyFallback = assignedIds.some((id) => !knownHouseholdIds.has(id));
      let snapshotHouseholds: SnapshotHouseholdSource[] = households;

      if (needsLegacyFallback) {
        const legacySnapshot = await getDocs(collection(db, 'lifegroupParticipants'));
        const legacyHouseholds: SnapshotHouseholdSource[] = legacySnapshot.docs.map((legacyDoc) => {
          const data = legacyDoc.data();
          return {
            id: legacyDoc.id,
            familyName: data.familyName || 'Unnamed legacy household',
            members: Array.isArray(data.members) ? data.members as FamilyMember[] : [],
          };
        });
        snapshotHouseholds = [...households, ...legacyHouseholds.filter((household) => !knownHouseholdIds.has(household.id))];
      }

      await setDoc(doc(db, 'lifeGroupYearSnapshots', String(snapshotYear)), {
        year: snapshotYear,
        groups: buildSnapshotGroups(lifeGroups, snapshotHouseholds),
        capturedAt: Timestamp.now(),
        capturedBy: userId,
      });
      setViewYear(snapshotYear);
    } catch (saveError) {
      console.error('Error saving LifeGroup history:', saveError);
      setError('Failed to save the annual LifeGroup snapshot.');
    } finally {
      setSaving(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <section className="mb-8 rounded-lg border border-border bg-white p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-2xl font-bold text-charcoal">Assignment History</h2>
          <p className="mt-1 text-text-light">
            Save a permanent annual snapshot of groups, leaders, households, and member names.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal">Snapshot year</span>
            <input
              type="number"
              min="1900"
              max="2100"
              value={snapshotYear}
              onChange={(event) => setSnapshotYear(Number(event.target.value))}
              className="w-28 rounded-md border border-border bg-white px-3 py-2 text-charcoal"
            />
          </label>
          <button
            type="button"
            onClick={saveSnapshot}
            disabled={saving || lifeGroups.length === 0}
            className="inline-flex items-center rounded-md bg-[#E88B5F] px-4 py-2 font-medium text-white transition-colors hover:bg-[#D6714A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArchiveBoxArrowDownIcon className="mr-2 h-5 w-5" />
            {saving ? 'Saving…' : existingYears.has(snapshotYear) ? `Replace ${snapshotYear}` : `Save ${snapshotYear}`}
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 border-t border-border pt-5">
        {snapshots.length === 0 ? (
          <p className="text-sm text-text-light">No annual snapshots have been saved yet.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3">
              <label htmlFor="life-group-history-year" className="text-sm font-medium text-charcoal">View year</label>
              <select
                id="life-group-history-year"
                value={viewYear || ''}
                onChange={(event) => {
                  setViewYear(Number(event.target.value));
                  setExpandedGroups(new Set());
                }}
                className="rounded-md border border-border bg-white px-3 py-2 text-charcoal"
              >
                {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.year}>{snapshot.year}</option>)}
              </select>
              {selectedSnapshot && (
                <span className="text-xs text-text-light">
                  Saved {selectedSnapshot.capturedAt.toLocaleString()}
                </span>
              )}
            </div>

            {selectedSnapshot && (
              <div className="space-y-3">
                {selectedSnapshot.groups.map((group) => {
                  const peopleCount = group.households.reduce((total, household) => total + household.members.length, 0);
                  const expanded = expandedGroups.has(group.id);
                  return (
                    <div key={group.id} className="rounded-lg border border-border bg-gray-50">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="flex w-full items-center justify-between gap-4 p-4 text-left"
                      >
                        <span className="flex items-center gap-2">
                          {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                          <span>
                            <span className="block font-semibold text-charcoal">{group.name}</span>
                            <span className="block text-sm text-text-light">Leader: {group.leaderName}</span>
                          </span>
                        </span>
                        <span className="text-sm text-text-light">
                          {peopleCount} {peopleCount === 1 ? 'person' : 'people'} · {group.households.length} {group.households.length === 1 ? 'household' : 'households'}
                        </span>
                      </button>
                      {expanded && (
                        <div className="border-t border-border px-4 py-3">
                          {group.households.length === 0 ? (
                            <p className="text-sm text-text-light">No households were assigned.</p>
                          ) : (
                            <div className="space-y-2">
                              {group.households.map((household) => (
                                <div key={household.id} className="rounded-md bg-white p-3 text-sm">
                                  <p className="font-medium text-charcoal">
                                    {household.name}{household.missing ? ' (missing when snapshot was saved)' : ''}
                                  </p>
                                  <p className="mt-1 text-text-light">
                                    {household.members.length
                                      ? household.members.map((member) => `${member.firstName} ${member.lastName}`.trim()).join(', ')
                                      : 'No members recorded'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
