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
import { getActiveHouseholdMembers } from '@/lib/utils/householdMembers';
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
  exempted: 'Exempted',
};

interface HouseholdRow extends RandomizerHousehold {
  memberNames: string[];
  isLifeGroupLeader: boolean;
}

interface LifeGroupRow {
  id: string;
  name: string;
  leaderId: string;
  leaderHouseholdId: string;
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
  const [leaderHouseholdSelections, setLeaderHouseholdSelections] = useState<Record<string, string>>({});
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
          const allMembers = Array.isArray(data.members) ? data.members : [];
          const members = getActiveHouseholdMembers(allMembers);
          if (allMembers.length > 0 && members.length === 0) return [];
          return [{
            id: householdDoc.id,
            name: data.householdName || 'Unnamed Household',
            memberCount: members.length,
            memberNames: members.map((member: { firstName?: string; lastName?: string }) => `${member.firstName || ''} ${member.lastName || ''}`.trim()),
            isLifeGroupLeader: data.isLifeGroupLeader === true,
            ageGroup: getAgeGroup(data.lifeGroupAgeGroup, data.lifeGroupCategory),
            hasKids: typeof data.lifeGroupHasKids === 'boolean'
              ? data.lifeGroupHasKids
              : data.lifeGroupCategory === 'Families with children',
            participation: ['always', 'sometimes', 'never', 'exempted'].includes(data.lifeGroupParticipation)
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
            leaderHouseholdId: data.leaderHouseholdId
              || (typeof data.leaderId === 'string' && data.leaderId.includes('|') ? data.leaderId.split('|')[0] : ''),
            leaderName: data.leaderName || 'Unassigned',
            familyUnitIds: Array.isArray(data.familyUnitIds) ? data.familyUnitIds : [],
            isActive: data.isActive !== false,
          };
        });
        setLifeGroups(rows);
        if (!initializedGroups.current) {
          setSelectedGroupIds(rows.filter((group) => group.isActive).map((group) => group.id));
          setLeaderHouseholdSelections(Object.fromEntries(
            rows.filter((group) => group.leaderHouseholdId).map((group) => [group.id, group.leaderHouseholdId]),
          ));
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

  const activeGroups = useMemo(
    () => lifeGroups.filter((group) => group.isActive),
    [lifeGroups],
  );

  const selectedGroups = useMemo(() => {
    const selected = new Set(selectedGroupIds);
    return activeGroups.filter((group) => selected.has(group.id));
  }, [activeGroups, selectedGroupIds]);

  const filteredHouseholds = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return households;
    return households.filter((household) => `${household.name} ${household.memberNames.join(' ')}`.toLowerCase().includes(normalizedSearch));
  }, [households, search]);

  const householdById = useMemo(
    () => new Map(households.map((household) => [household.id, household])),
    [households],
  );

  const leaderHouseholdOptions = useMemo(
    () => households.filter((household) => household.isLifeGroupLeader),
    [households],
  );

  useEffect(() => {
    if (loadingHouseholds) return;
    setLeaderHouseholdSelections((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([, householdId]) => (
        householdById.get(householdId)?.isLifeGroupLeader === true
      )));
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [householdById, leaderHouseholdSelections, loadingHouseholds]);

  const leaderHouseholdGroupIds = useMemo(() => {
    const result = new Map<string, string>();
    selectedGroups.forEach((group) => {
      const householdId = leaderHouseholdSelections[group.id] || '';
      if (householdId) result.set(householdId, group.id);
    });
    return result;
  }, [leaderHouseholdSelections, selectedGroups]);

  const getDraftGroupName = (groupId: string) => {
    const leaderHousehold = householdById.get(leaderHouseholdSelections[groupId]);
    if (leaderHousehold) return leaderHousehold.name;
    const groupIndex = activeGroups.findIndex((group) => group.id === groupId);
    return `Life Group ${groupIndex >= 0 ? groupIndex + 1 : ''}`.trim();
  };

  const selectLeaderHousehold = (groupId: string, householdId: string) => {
    setLeaderHouseholdSelections((current) => ({ ...current, [groupId]: householdId }));
    setProposal([]);
    setUnassignedHouseholds([]);
    setApplied(false);
    setError(null);
  };

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
      const leaderHouseholdId = leaderHouseholdSelections[group.id] || '';
      const leaderHousehold = householdById.get(leaderHouseholdId);
      if (!leaderHousehold) {
        setError(`Choose a leader household for ${getDraftGroupName(group.id)} before randomizing.`);
        return;
      }
      if (!leaderHousehold.isLifeGroupLeader) {
        setError(`${leaderHousehold.name} is not marked as a Life Group leader household.`);
        return;
      }
      if (leaderHousehold.participation === 'exempted') {
        setError(`${leaderHousehold.name} is marked Exempted but is also the leader household for ${group.name}. Change the leader or activity status before randomizing.`);
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
    const selectedNames = selectedGroups.map((group) => getDraftGroupName(group.id)).join(', ');
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
        groupName: getDraftGroupName(group.id),
        householdIds: proposalByGroup.get(group.id)?.households.map((household) => household.id) || [],
      }));

      selectedGroups.forEach((group) => {
        const leaderHouseholdId = leaderHouseholdSelections[group.id];
        const leaderHousehold = householdById.get(leaderHouseholdId);
        const existingLeaderBelongsToHousehold = group.leaderId.startsWith(`${leaderHouseholdId}|`);
        batch.update(doc(db, 'lifeGroups', group.id), {
          name: leaderHousehold?.name || getDraftGroupName(group.id),
          leaderHouseholdId,
          leaderName: leaderHousehold?.name || 'Unassigned',
          leaderId: existingLeaderBelongsToHousehold ? group.leaderId : '',
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
          householdId: leaderHouseholdSelections[group.id],
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
            <p className="mt-1 text-sm text-text-light">The randomizer independently balances age grouping, households with kids, and the non-exempt activity levels.</p>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-charcoal">Search households or members</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-72 max-w-full rounded-md border border-border px-3 py-2" />
          </label>
        </div>
        <div className="mt-4 max-h-[32rem] overflow-auto rounded-lg border border-border">
          <table className="w-full min-w-[850px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-text-light">
              <tr>
                <th className="border-b border-border px-3 py-2">Household</th>
                <th className="w-40 border-b border-border px-2 py-2">Age group</th>
                <th className="w-40 border-b border-border px-2 py-2">Children</th>
                <th className="w-44 border-b border-border px-2 py-2">Activity</th>
                <th className="w-16 border-b border-border px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredHouseholds.map((household) => (
                <tr key={household.id} className="odd:bg-white even:bg-slate-50/50 hover:bg-orange-50/40">
                  <td className="border-b border-border/70 px-3 py-2">
                    <p className="font-medium leading-tight text-charcoal">{household.name}</p>
                    <p className="mt-0.5 max-w-md truncate text-xs text-text-light" title={household.memberNames.join(', ')}>
                      {household.memberCount} {household.memberCount === 1 ? 'person' : 'people'}{household.memberNames.length ? ` · ${household.memberNames.join(', ')}` : ''}
                    </p>
                  </td>
                  <td className="border-b border-border/70 px-2 py-1.5">
                    <label>
                      <span className="sr-only">Age grouping for {household.name}</span>
                      <select
                        value={household.ageGroup}
                        onChange={(event) => {
                          const ageGroup = event.target.value as LifeGroupAgeGroup;
                          updateHouseholdLocally(household.id, { ageGroup });
                          void saveHouseholdProfile(household.id, { ageGroup });
                        }}
                        className="w-full rounded border border-border bg-white px-2 py-1.5 text-xs"
                      >
                        {AGE_GROUPS.map((value) => <option key={value} value={value}>{AGE_GROUP_LABELS[value]}</option>)}
                      </select>
                    </label>
                  </td>
                  <td className="border-b border-border/70 px-2 py-1.5">
                    <label>
                      <span className="sr-only">Kids status for {household.name}</span>
                      <select
                        value={household.hasKids ? 'with-kids' : 'without-kids'}
                        onChange={(event) => {
                          const hasKids = event.target.value === 'with-kids';
                          updateHouseholdLocally(household.id, { hasKids });
                          void saveHouseholdProfile(household.id, { hasKids });
                        }}
                        className="w-full rounded border border-border bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="with-kids">With kids</option>
                        <option value="without-kids">Without kids</option>
                      </select>
                    </label>
                  </td>
                  <td className="border-b border-border/70 px-2 py-1.5">
                    <label>
                      <span className="sr-only">Participation for {household.name}</span>
                      <select
                        value={household.participation}
                        onChange={(event) => {
                          const participation = event.target.value as LifeGroupParticipation;
                          updateHouseholdLocally(household.id, { participation });
                          void saveHouseholdProfile(household.id, { participation });
                        }}
                        className="w-full rounded border border-border bg-white px-2 py-1.5 text-xs"
                      >
                        {Object.entries(PARTICIPATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                  </td>
                  <td className="border-b border-border/70 px-3 py-2 text-right text-xs text-text-light">{savingIds.has(household.id) ? 'Saving…' : 'Saved'}</td>
                </tr>
              ))}
              {filteredHouseholds.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-text-light">No households match your search.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-border bg-white p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-semibold text-charcoal">2. Choose groups and leaders</h2>
            <p className="mt-1 text-sm text-text-light">Each selected leader household is pinned to its group. Until a leader is selected, groups use generic names; the leader and household-based name are saved when you apply the proposal.</p>
          </div>
          <button type="button" onClick={() => router.push('/admin/households')} className="shrink-0 text-sm font-medium text-coral hover:underline">Manage leader households</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeGroups.map((group, groupIndex) => {
            const isSelected = selectedGroupIds.includes(group.id);
            const selectedLeaderId = leaderHouseholdSelections[group.id] || '';
            const displayName = isSelected && selectedLeaderId ? getDraftGroupName(group.id) : `Life Group ${groupIndex + 1}`;
            return (
              <div key={group.id} className="rounded-lg border border-border p-3">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      setSelectedGroupIds((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id]);
                      setProposal([]);
                      setUnassignedHouseholds([]);
                      setApplied(false);
                    }}
                    className="mt-1 h-4 w-4 rounded border-border text-coral focus:ring-coral"
                  />
                  <span className="font-medium text-charcoal">{displayName}</span>
                </label>
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-medium text-charcoal">Leader household</span>
                  <select
                    value={selectedLeaderId}
                    disabled={!isSelected}
                    onChange={(event) => selectLeaderHousehold(group.id, event.target.value)}
                    className="w-full rounded-md border border-border bg-white px-2 py-2 text-sm disabled:bg-gray-100 disabled:text-text-light"
                  >
                    <option value="">Select a leader…</option>
                    {leaderHouseholdOptions.map((household) => {
                      const assignedGroupId = leaderHouseholdGroupIds.get(household.id);
                      const unavailable = household.participation === 'exempted' || (!!assignedGroupId && assignedGroupId !== group.id);
                      return <option key={household.id} value={household.id} disabled={unavailable}>{household.name}{household.participation === 'exempted' ? ' (Exempted)' : ''}</option>;
                    })}
                  </select>
                </label>
              </div>
            );
          })}
        </div>
        {leaderHouseholdOptions.length === 0 ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">No households are marked as Life Group leaders. Use “Manage leader households” to mark them first.</p> : null}
        <p className="mt-4 text-sm text-text-light">Always, sometimes, and never-active households are assigned and balanced. {households.filter((household) => household.participation === 'exempted').length} exempted households will remain unassigned.</p>
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
              const leaderHousehold = householdById.get(leaderHouseholdSelections[result.id]);
              return (
                <div key={result.id} className="rounded-lg border border-border bg-gray-50 p-4">
                  <h3 className="font-semibold text-charcoal">{getDraftGroupName(result.id)}</h3>
                  <p className="text-sm text-text-light">Leader household: {leaderHousehold?.name || 'Unassigned'} · {result.households.length} households · {result.totalPeople} people · ~{result.expectedAttendance.toFixed(1)} expected</p>
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
                              {proposal.map((target) => <option key={target.id} value={target.id}>{getDraftGroupName(target.id)}</option>)}
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
                        {proposal.map((target) => <option key={target.id} value={target.id}>{getDraftGroupName(target.id)}</option>)}
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
