'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { ArrowPathIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import {
  randomizeLifeGroupHouseholds,
  summarizeRandomizedLifeGroup,
  type LifeGroupAgeGroup,
  type LifeGroupParticipation,
  type RandomizedLifeGroup,
  type RandomizerHousehold,
} from '@/lib/lifeGroups/randomizer';
import { ROLE_PERMISSIONS } from '@/types/roles';

const AGE_GROUP_LABELS: Record<LifeGroupAgeGroup, string> = {
  unspecified: 'Not set',
  '18-29': '18–29',
  '30-44': '30–44',
  '45-64': '45–64',
  '65+': '65+',
  multigenerational: 'Multigenerational',
};

const AGE_GROUPS = Object.keys(AGE_GROUP_LABELS) as LifeGroupAgeGroup[];

const getAgeGroup = (ageGroup: unknown, legacyCategory: unknown): LifeGroupAgeGroup => {
  if (typeof ageGroup === 'string' && AGE_GROUPS.includes(ageGroup as LifeGroupAgeGroup)) {
    return ageGroup as LifeGroupAgeGroup;
  }

  const legacy = typeof legacyCategory === 'string' ? legacyCategory.toLowerCase() : '';
  if (legacy.includes('young')) return '18-29';
  if (legacy.includes('older')) return '65+';
  if (legacy.includes('multi')) return 'multigenerational';
  return 'unspecified';
};

const PARTICIPATION_LABELS: Record<LifeGroupParticipation, string> = {
  always: 'Always active',
  sometimes: 'Sometimes active',
  never: 'Never active',
};

interface HouseholdRow extends RandomizerHousehold {
  memberNames: string[];
}

interface LifeGroupRow {
  id: string;
  name: string;
  leaderId: string;
  leaderName: string;
  familyUnitIds: string[];
  isActive: boolean;
}

export default function LifeGroupRandomizerPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const initializedGroups = useRef(false);
  const [households, setHouseholds] = useState<HouseholdRow[]>([]);
  const [lifeGroups, setLifeGroups] = useState<LifeGroupRow[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [proposal, setProposal] = useState<RandomizedLifeGroup[]>([]);
  const [unassignedHouseholds, setUnassignedHouseholds] = useState<RandomizerHousehold[]>([]);
  const [search, setSearch] = useState('');
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManageLifeGroups = userProfile?.isAdmin || (
    !!userProfile?.role && ROLE_PERMISSIONS[userProfile.role]?.canManageLifeGroups
  );

  useEffect(() => {
    document.title = 'Life Group Randomizer | Sioux Falls Church of Christ';
  }, []);

  useEffect(() => {
    if (userProfile && !canManageLifeGroups) router.push('/');
  }, [canManageLifeGroups, router, userProfile]);

  useEffect(() => {
    if (!canManageLifeGroups) return;
    const unsubscribeHouseholds = onSnapshot(
      query(collection(db, 'attendanceHouseholds'), orderBy('householdName', 'asc')),
      (snapshot) => {
        const rows = snapshot.docs.flatMap((householdDoc) => {
          const data = householdDoc.data();
          if (data.active === false) return [];
          const members = Array.isArray(data.members) ? data.members : [];
          return [{
            id: householdDoc.id,
            name: data.householdName || 'Unnamed Household',
            memberCount: members.length,
            memberNames: members.map((member: { firstName?: string; lastName?: string }) => `${member.firstName || ''} ${member.lastName || ''}`.trim()),
            ageGroup: getAgeGroup(data.lifeGroupAgeGroup, data.lifeGroupCategory),
            hasKids: typeof data.lifeGroupHasKids === 'boolean'
              ? data.lifeGroupHasKids
              : data.lifeGroupCategory === 'Families with children',
            participation: ['always', 'sometimes', 'never'].includes(data.lifeGroupParticipation)
              ? data.lifeGroupParticipation as LifeGroupParticipation
              : 'sometimes',
          }];
        });
        setHouseholds(rows);
        setLoadingHouseholds(false);
      },
      (loadError) => {
        console.error('Error loading households for randomizer:', loadError);
        setError('Failed to load households.');
        setLoadingHouseholds(false);
      },
    );

    const unsubscribeGroups = onSnapshot(
      query(collection(db, 'lifeGroups'), orderBy('name', 'asc')),
      (snapshot) => {
        const rows = snapshot.docs.map((groupDoc) => {
          const data = groupDoc.data();
          return {
            id: groupDoc.id,
            name: data.name || 'Unnamed Life Group',
            leaderId: data.leaderId || '',
            leaderName: data.leaderName || 'Unassigned',
            familyUnitIds: Array.isArray(data.familyUnitIds) ? data.familyUnitIds : [],
            isActive: data.isActive !== false,
          };
        });
        setLifeGroups(rows);
        if (!initializedGroups.current) {
          setSelectedGroupIds(rows.filter((group) => group.isActive).map((group) => group.id));
          initializedGroups.current = true;
        }
        setLoadingGroups(false);
      },
      (loadError) => {
        console.error('Error loading LifeGroups for randomizer:', loadError);
        setError('Failed to load LifeGroups.');
        setLoadingGroups(false);
      },
    );

    return () => {
      unsubscribeHouseholds();
      unsubscribeGroups();
    };
  }, [canManageLifeGroups]);

  const selectedGroups = useMemo(() => {
    const selected = new Set(selectedGroupIds);
    return lifeGroups.filter((group) => selected.has(group.id));
  }, [lifeGroups, selectedGroupIds]);

  const filteredHouseholds = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return households;
    return households.filter((household) => `${household.name} ${household.memberNames.join(' ')}`.toLowerCase().includes(normalizedSearch));
  }, [households, search]);

  const leaderHouseholdGroupIds = useMemo(() => {
    const result = new Map<string, string>();
    selectedGroups.forEach((group) => {
      const householdId = group.leaderId.includes('|') ? group.leaderId.split('|')[0] : '';
      if (householdId) result.set(householdId, group.id);
    });
    return result;
  }, [selectedGroups]);

  const updateHouseholdLocally = (householdId: string, updates: Partial<Pick<HouseholdRow, 'ageGroup' | 'hasKids' | 'participation'>>) => {
    setHouseholds((current) => current.map((household) => household.id === householdId ? { ...household, ...updates } : household));
    setProposal([]);
    setUnassignedHouseholds([]);
    setApplied(false);
  };

  const saveHouseholdProfile = async (
    householdId: string,
    updates: Partial<Pick<HouseholdRow, 'ageGroup' | 'hasKids' | 'participation'>> = {},
  ) => {
    const household = households.find((item) => item.id === householdId);
    if (!household) return;
    const profile = { ...household, ...updates };
    setSavingIds((current) => new Set(current).add(householdId));
    try {
      await updateDoc(doc(db, 'attendanceHouseholds', householdId), {
        lifeGroupAgeGroup: profile.ageGroup,
        lifeGroupHasKids: profile.hasKids,
        lifeGroupParticipation: profile.participation,
        updatedAt: Timestamp.now(),
      });
    } catch (saveError) {
      console.error('Error saving household LifeGroup profile:', saveError);
      setError(`Failed to save ${household.name}.`);
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(householdId);
        return next;
      });
    }
  };

  const generateProposal = () => {
    if (selectedGroupIds.length < 2) {
      setError('Select at least two LifeGroups.');
      return;
    }

    const initialHouseholdsByGroupId: Record<string, RandomizerHousehold[]> = {};
    const claimedLeaderHouseholds = new Set<string>();
    for (const group of selectedGroups) {
      const leaderHouseholdId = group.leaderId.includes('|') ? group.leaderId.split('|')[0] : '';
      const leaderHousehold = households.find((household) => household.id === leaderHouseholdId);
      if (!leaderHousehold) {
        setError(`Assign a leader from an active household to ${group.name} before randomizing.`);
        return;
      }
      if (claimedLeaderHouseholds.has(leaderHousehold.id)) {
        setError(`${leaderHousehold.name} is the leader household for more than one selected group.`);
        return;
      }
      claimedLeaderHouseholds.add(leaderHousehold.id);
      initialHouseholdsByGroupId[group.id] = [leaderHousehold];
    }

    setError(null);
    setApplied(false);
    setUnassignedHouseholds([]);
    setProposal(randomizeLifeGroupHouseholds(households, selectedGroupIds, { initialHouseholdsByGroupId }));
  };

  const moveHousehold = (householdId: string, targetGroupId: string | null) => {
    if (leaderHouseholdGroupIds.has(householdId)) return;
    const household = proposal.flatMap((group) => group.households).find((item) => item.id === householdId)
      || unassignedHouseholds.find((item) => item.id === householdId);
    if (!household) return;

    setProposal((current) => current.map((group) => {
      const remaining = group.households.filter((item) => item.id !== householdId);
      const nextHouseholds = group.id === targetGroupId ? [...remaining, household] : remaining;
      return summarizeRandomizedLifeGroup(group.id, nextHouseholds);
    }));
    setUnassignedHouseholds((current) => targetGroupId
      ? current.filter((item) => item.id !== householdId)
      : [...current.filter((item) => item.id !== householdId), household]);
    setApplied(false);
  };

  const applyProposal = async () => {
    if (!userProfile || proposal.length === 0) return;
    const proposalByGroup = new Map(proposal.map((group) => [group.id, group]));
    const managedHouseholdIds = new Set(households.map((household) => household.id));
    const selectedNames = selectedGroups.map((group) => group.name).join(', ');
    if (!window.confirm(`Replace household assignments for ${selectedNames}? A randomizer audit record will be saved.`)) return;

    try {
      setApplying(true);
      setError(null);
      const batch = writeBatch(db);
      const runRef = doc(collection(db, 'lifeGroupRandomizerRuns'));
      const before = lifeGroups.map((group) => ({
        groupId: group.id,
        groupName: group.name,
        householdIds: group.familyUnitIds,
      }));
      const after = selectedGroups.map((group) => ({
        groupId: group.id,
        groupName: group.name,
        householdIds: proposalByGroup.get(group.id)?.households.map((household) => household.id) || [],
      }));

      selectedGroups.forEach((group) => {
        batch.update(doc(db, 'lifeGroups', group.id), {
          familyUnitIds: proposalByGroup.get(group.id)?.households.map((household) => household.id) || [],
          updatedAt: Timestamp.now(),
        });
      });
      lifeGroups.filter((group) => !selectedGroupIds.includes(group.id)).forEach((group) => {
        const remainingIds = group.familyUnitIds.filter((id) => !managedHouseholdIds.has(id));
        if (remainingIds.length !== group.familyUnitIds.length) {
          batch.update(doc(db, 'lifeGroups', group.id), { familyUnitIds: remainingIds, updatedAt: Timestamp.now() });
        }
      });
      batch.set(runRef, {
        createdAt: Timestamp.now(),
        createdBy: userProfile.uid,
        includeNever: true,
        manuallyUnassignedHouseholdIds: unassignedHouseholds.map((household) => household.id),
        pinnedLeaderHouseholds: selectedGroups.map((group) => ({
          groupId: group.id,
          householdId: group.leaderId.split('|')[0],
        })),
        householdProfiles: households.map((household) => ({
          id: household.id,
          name: household.name,
          memberCount: household.memberCount,
          ageGroup: household.ageGroup,
          hasKids: household.hasKids,
          participation: household.participation,
        })),
        before,
        after,
      });
      await batch.commit();
      setApplied(true);
    } catch (applyError) {
      console.error('Error applying LifeGroup randomizer proposal:', applyError);
      setError('Failed to apply the proposed assignments. No partial batch changes were committed.');
    } finally {
      setApplying(false);
    }
  };

  if (!canManageLifeGroups) return null;
  if (loadingHouseholds || loadingGroups) {
    return <div className="flex min-h-[400px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-coral" /></div>;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-4">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Life Group Randomizer</h1>
          <p className="mt-1 text-text-light">Profile households, generate a balanced proposal, then review it before applying.</p>
        </div>
      </div>

      {error ? <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p> : null}
      {applied ? (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircleIcon className="h-5 w-5" /> Assignments applied successfully. The audit record can be used to review the previous assignments.
        </div>
      ) : null}

      <section className="mb-8 rounded-lg border border-border bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-semibold text-charcoal">1. Household profiles</h2>
            <p className="mt-1 text-sm text-text-light">The randomizer independently balances age grouping, households with kids, and all three activity levels.</p>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal">Search households or members</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-72 max-w-full rounded-md border border-border px-3 py-2" />
          </label>
        </div>
        <div className="mt-5 space-y-2">
          {filteredHouseholds.map((household) => (
            <div key={household.id} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[minmax(220px,1fr)_180px_170px_190px_70px] md:items-center">
              <div>
                <p className="font-medium text-charcoal">{household.name}</p>
                <p className="text-xs text-text-light">{household.memberCount} {household.memberCount === 1 ? 'person' : 'people'}{household.memberNames.length ? ` · ${household.memberNames.join(', ')}` : ''}</p>
              </div>
              <label>
                <span className="sr-only">Age grouping for {household.name}</span>
                <select
                  value={household.ageGroup}
                  onChange={(event) => {
                    const ageGroup = event.target.value as LifeGroupAgeGroup;
                    updateHouseholdLocally(household.id, { ageGroup });
                    void saveHouseholdProfile(household.id, { ageGroup });
                  }}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                >
                  {AGE_GROUPS.map((value) => <option key={value} value={value}>{AGE_GROUP_LABELS[value]}</option>)}
                </select>
              </label>
              <label>
                <span className="sr-only">Kids status for {household.name}</span>
                <select
                  value={household.hasKids ? 'with-kids' : 'without-kids'}
                  onChange={(event) => {
                    const hasKids = event.target.value === 'with-kids';
                    updateHouseholdLocally(household.id, { hasKids });
                    void saveHouseholdProfile(household.id, { hasKids });
                  }}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                >
                  <option value="with-kids">With kids</option>
                  <option value="without-kids">Without kids</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Participation for {household.name}</span>
                <select
                  value={household.participation}
                  onChange={(event) => {
                    const participation = event.target.value as LifeGroupParticipation;
                    updateHouseholdLocally(household.id, { participation });
                    void saveHouseholdProfile(household.id, { participation });
                  }}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                >
                  {Object.entries(PARTICIPATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <span className="text-right text-xs text-text-light">{savingIds.has(household.id) ? 'Saving…' : 'Saved'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-border bg-white p-6">
        <h2 className="text-xl font-semibold text-charcoal">2. Choose groups</h2>
        <p className="mt-1 text-sm text-text-light">Assign each group’s leader on the Life Groups page first. The leader’s household is pinned to that group and the remaining households are balanced around it.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {lifeGroups.filter((group) => group.isActive).map((group) => (
            <label key={group.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
              <input
                type="checkbox"
                checked={selectedGroupIds.includes(group.id)}
                onChange={() => {
                  setSelectedGroupIds((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id]);
                  setProposal([]);
                  setUnassignedHouseholds([]);
                  setApplied(false);
                }}
                className="mt-1 h-4 w-4 rounded border-border text-coral focus:ring-coral"
              />
              <span>
                <span className="block font-medium text-charcoal">{group.name}</span>
                <span className="text-xs text-text-light">Leader: {group.leaderName}</span>
                <span className="block text-xs text-coral">
                  {group.leaderId.includes('|') && households.some((household) => household.id === group.leaderId.split('|')[0])
                    ? `Pinned household: ${households.find((household) => household.id === group.leaderId.split('|')[0])?.name}`
                    : 'Leader household needs to be set'}
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-4 text-sm text-text-light">Always, sometimes, and never-active households are all assigned and balanced across the selected groups.</p>
        <button type="button" onClick={generateProposal} className="mt-5 inline-flex items-center rounded-lg bg-[#E88B5F] px-4 py-2 font-medium text-white hover:bg-[#D6714A]">
          <SparklesIcon className="mr-2 h-5 w-5" /> Generate balanced proposal
        </button>
      </section>

      {proposal.length ? (
        <section className="rounded-lg border border-border bg-white p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div><h2 className="text-xl font-semibold text-charcoal">3. Review proposal</h2><p className="mt-1 text-sm text-text-light">Generate again for a different randomized arrangement.</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={generateProposal} className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-charcoal hover:border-coral hover:text-coral"><ArrowPathIcon className="mr-2 h-5 w-5" />Randomize again</button>
              <button type="button" onClick={applyProposal} disabled={applying} className="rounded-lg bg-[#E88B5F] px-4 py-2 font-medium text-white hover:bg-[#D6714A] disabled:opacity-50">{applying ? 'Applying…' : 'Apply assignments'}</button>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {proposal.map((result) => {
              const group = lifeGroups.find((item) => item.id === result.id);
              return (
                <div key={result.id} className="rounded-lg border border-border bg-gray-50 p-4">
                  <h3 className="font-semibold text-charcoal">{group?.name || result.id}</h3>
                  <p className="text-sm text-text-light">Leader: {group?.leaderName || 'Unassigned'} · {result.households.length} households · {result.totalPeople} people · ~{result.expectedAttendance.toFixed(1)} expected</p>
                  <div className="mt-3 space-y-2">
                    {result.households.map((household) => (
                      <div key={household.id} className="flex flex-col gap-2 rounded-md bg-white p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          <span className="font-medium text-charcoal">{household.name}</span>
                          <span className="ml-2 text-text-light">{AGE_GROUP_LABELS[household.ageGroup]} · {household.hasKids ? 'With kids' : 'Without kids'} · {PARTICIPATION_LABELS[household.participation]}</span>
                          {leaderHouseholdGroupIds.get(household.id) === result.id ? <span className="ml-2 font-medium text-coral">Leader household · Pinned</span> : null}
                        </span>
                        {leaderHouseholdGroupIds.has(household.id) ? null : <span className="flex items-center gap-2">
                          <label>
                            <span className="sr-only">Move {household.name}</span>
                            <select value={result.id} onChange={(event) => moveHousehold(household.id, event.target.value || null)} className="rounded border border-border bg-white px-2 py-1 text-xs">
                              {proposal.map((target) => <option key={target.id} value={target.id}>{lifeGroups.find((item) => item.id === target.id)?.name || target.id}</option>)}
                            </select>
                          </label>
                          <button type="button" onClick={() => moveHousehold(household.id, null)} className="text-xs font-medium text-red-700 hover:underline">Remove</button>
                        </span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {unassignedHouseholds.length ? (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-semibold text-charcoal">Manually unassigned households</h3>
              <p className="mt-1 text-sm text-text-light">These households will be removed from every LifeGroup when the proposal is applied.</p>
              <div className="mt-3 space-y-2">
                {unassignedHouseholds.map((household) => (
                  <div key={household.id} className="flex flex-col justify-between gap-2 rounded-md bg-white p-2 text-sm sm:flex-row sm:items-center">
                    <span><span className="font-medium text-charcoal">{household.name}</span><span className="ml-2 text-text-light">{AGE_GROUP_LABELS[household.ageGroup]} · {household.hasKids ? 'With kids' : 'Without kids'} · {PARTICIPATION_LABELS[household.participation]}</span></span>
                    <label className="flex items-center gap-2">
                      <span className="text-xs text-text-light">Assign to</span>
                      <select defaultValue="" onChange={(event) => { if (event.target.value) moveHousehold(household.id, event.target.value); }} className="rounded border border-border bg-white px-2 py-1 text-xs">
                        <option value="" disabled>Select group…</option>
                        {proposal.map((target) => <option key={target.id} value={target.id}>{lifeGroups.find((item) => item.id === target.id)?.name || target.id}</option>)}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
