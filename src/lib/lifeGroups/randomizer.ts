export type LifeGroupParticipation = 'always' | 'sometimes' | 'never' | 'exempted';
export type LifeGroupAgeGroup = 'unspecified' | '18-29' | '30-44' | '45-64' | '65+' | 'multigenerational';

export interface RandomizerHousehold {
  id: string;
  name: string;
  memberCount: number;
  ageGroup: LifeGroupAgeGroup;
  hasKids: boolean;
  participation: LifeGroupParticipation;
}

export interface RandomizedLifeGroup {
  id: string;
  households: RandomizerHousehold[];
  expectedAttendance: number;
  totalPeople: number;
}

const PARTICIPATION_WEIGHT: Record<LifeGroupParticipation, number> = {
  always: 1,
  sometimes: 0.5,
  never: 0,
  exempted: 0,
};

export const summarizeRandomizedLifeGroup = (
  id: string,
  households: RandomizerHousehold[],
): RandomizedLifeGroup => ({
  id,
  households,
  expectedAttendance: households.reduce(
    (total, household) => total + household.memberCount * PARTICIPATION_WEIGHT[household.participation],
    0,
  ),
  totalPeople: households.reduce((total, household) => total + household.memberCount, 0),
});

const shuffle = <T>(values: T[], random: () => number): T[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

const countMatching = (
  group: RandomizedLifeGroup,
  predicate: (household: RandomizerHousehold) => boolean,
): number => group.households.reduce((total, household) => total + (predicate(household) ? 1 : 0), 0);

export const randomizeLifeGroupHouseholds = (
  households: RandomizerHousehold[],
  groupIds: string[],
  options: {
    random?: () => number;
    initialHouseholdsByGroupId?: Record<string, RandomizerHousehold[]>;
  } = {},
): RandomizedLifeGroup[] => {
  if (groupIds.length === 0) return [];

  const random = options.random || Math.random;
  const initialHouseholdsByGroupId = Object.fromEntries(groupIds.map((groupId) => [
    groupId,
    (options.initialHouseholdsByGroupId?.[groupId] || []).filter((household) => household.participation !== 'exempted'),
  ]));
  const initiallyAssignedIds = new Set(
    groupIds.flatMap((groupId) => initialHouseholdsByGroupId[groupId].map((household) => household.id)),
  );
  const householdsToAssign = households.filter(
    (household) => household.participation !== 'exempted' && !initiallyAssignedIds.has(household.id),
  );
  const ageGroupFrequency = householdsToAssign.reduce((counts, household) => {
    counts.set(household.ageGroup, (counts.get(household.ageGroup) || 0) + 1);
    return counts;
  }, new Map<string, number>());

  const ordered = shuffle(householdsToAssign, random).sort((a, b) => {
    const ageGroupDifference = (ageGroupFrequency.get(a.ageGroup) || 0) - (ageGroupFrequency.get(b.ageGroup) || 0);
    if (ageGroupDifference !== 0) return ageGroupDifference;
    const participationDifference = PARTICIPATION_WEIGHT[b.participation] - PARTICIPATION_WEIGHT[a.participation];
    if (participationDifference !== 0) return participationDifference;
    return b.memberCount - a.memberCount;
  });

  const groups: RandomizedLifeGroup[] = groupIds.map((id) => summarizeRandomizedLifeGroup(
    id,
    [...initialHouseholdsByGroupId[id]],
  ));

  ordered.forEach((household) => {
    const candidates = shuffle(groups, random).sort((a, b) => {
      const ageGroupDifference = countMatching(a, (item) => item.ageGroup === household.ageGroup)
        - countMatching(b, (item) => item.ageGroup === household.ageGroup);
      if (ageGroupDifference !== 0) return ageGroupDifference;

      const kidsDifference = countMatching(a, (item) => item.hasKids === household.hasKids)
        - countMatching(b, (item) => item.hasKids === household.hasKids);
      if (kidsDifference !== 0) return kidsDifference;

      const participationDifference = countMatching(a, (item) => item.participation === household.participation)
        - countMatching(b, (item) => item.participation === household.participation);
      if (participationDifference !== 0) return participationDifference;
      if (a.expectedAttendance !== b.expectedAttendance) return a.expectedAttendance - b.expectedAttendance;
      if (a.totalPeople !== b.totalPeople) return a.totalPeople - b.totalPeople;
      return a.households.length - b.households.length;
    });

    const target = candidates[0];
    target.households.push(household);
    target.totalPeople += household.memberCount;
    target.expectedAttendance += household.memberCount * PARTICIPATION_WEIGHT[household.participation];
  });

  return groups;
};
