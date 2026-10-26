import { describe, expect, it } from 'vitest';
import {
  randomizeLifeGroupHouseholds,
  summarizeRandomizedLifeGroup,
  type RandomizerHousehold,
} from '../randomizer';

const deterministicRandom = () => 0.25;

describe('randomizeLifeGroupHouseholds', () => {
  it('spreads categories and participation levels across groups', () => {
    const households: RandomizerHousehold[] = Array.from({ length: 12 }, (_, index) => ({
      id: String(index),
      name: `Household ${index}`,
      memberCount: index % 3 + 1,
      ageGroup: index < 6 ? '18-29' : '65+',
      hasKids: index % 3 === 0,
      participation: index % 2 === 0 ? 'always' : 'sometimes',
    }));

    const groups = randomizeLifeGroupHouseholds(households, ['a', 'b', 'c'], { random: deterministicRandom });
    const youngCounts = groups.map((group) => group.households.filter((household) => household.ageGroup === '18-29').length);
    const withKidsCounts = groups.map((group) => group.households.filter((household) => household.hasKids).length);
    const alwaysCounts = groups.map((group) => group.households.filter((household) => household.participation === 'always').length);

    expect(Math.max(...youngCounts) - Math.min(...youngCounts)).toBeLessThanOrEqual(1);
    expect(Math.max(...withKidsCounts) - Math.min(...withKidsCounts)).toBeLessThanOrEqual(1);
    expect(Math.max(...alwaysCounts) - Math.min(...alwaysCounts)).toBeLessThanOrEqual(1);
    expect(groups.flatMap((group) => group.households)).toHaveLength(12);
  });

  it('always assigns and balances never-active households', () => {
    const households: RandomizerHousehold[] = Array.from({ length: 7 }, (_, index) => ({
      id: `never-${index}`,
      name: `Never ${index}`,
      memberCount: 2,
      ageGroup: '45-64',
      hasKids: false,
      participation: 'never',
    }));

    const groups = randomizeLifeGroupHouseholds(households, ['a', 'b', 'c'], { random: deterministicRandom });
    const neverCounts = groups.map((group) => group.households.length);

    expect(groups.flatMap((group) => group.households)).toHaveLength(7);
    expect(Math.max(...neverCounts) - Math.min(...neverCounts)).toBeLessThanOrEqual(1);
  });

  it('keeps every household intact in one group', () => {
    const household = { id: 'family', name: 'Family', memberCount: 7, ageGroup: 'multigenerational' as const, hasKids: true, participation: 'always' as const };
    const groups = randomizeLifeGroupHouseholds([household], ['a', 'b']);
    expect(groups.filter((group) => group.households.some((item) => item.id === household.id))).toHaveLength(1);
  });

  it('recalculates totals after a manual edit', () => {
    const group = summarizeRandomizedLifeGroup('a', [
      { id: 'always', name: 'Always', memberCount: 4, ageGroup: '30-44', hasKids: true, participation: 'always' },
      { id: 'sometimes', name: 'Sometimes', memberCount: 2, ageGroup: '30-44', hasKids: false, participation: 'sometimes' },
      { id: 'never', name: 'Never', memberCount: 3, ageGroup: '65+', hasKids: false, participation: 'never' },
    ]);

    expect(group.totalPeople).toBe(9);
    expect(group.expectedAttendance).toBe(5);
  });
});
