import { describe, expect, it } from 'vitest';
import {
  excludeInactiveMembers,
  excludePassedAwayMembers,
  getActiveHouseholdMembers,
  hasPassedAwayEvent,
  isInactiveMember,
} from './householdMembers';

describe('household member visibility', () => {
  it('recognizes a passed away event', () => {
    expect(hasPassedAwayEvent({ importantEvents: [{ type: 'birthday' }, { type: 'passedAway' }] })).toBe(true);
    expect(hasPassedAwayEvent({ importantEvents: [{ type: 'birthday' }] })).toBe(false);
  });

  it('keeps member data intact while excluding deceased members from normal displays', () => {
    const members = [
      { id: 'active', importantEvents: [{ type: 'birthday' }] },
      { id: 'deceased', importantEvents: [{ type: 'passedAway' }] },
    ];

    expect(excludePassedAwayMembers(members).map((member) => member.id)).toEqual(['active']);
    expect(members).toHaveLength(2);
  });

  it('treats missing active status as active and filters explicit inactive status', () => {
    const members = [
      { id: 'legacy' },
      { id: 'active', active: true },
      { id: 'inactive', active: false, inactiveReason: 'Moved away' },
    ];

    expect(isInactiveMember(members[0])).toBe(false);
    expect(isInactiveMember(members[2])).toBe(true);
    expect(excludeInactiveMembers(members).map((member) => member.id)).toEqual(['legacy', 'active']);
  });

  it('excludes both inactive and deceased members from active household displays', () => {
    const members = [
      { id: 'active', active: true, importantEvents: [] },
      { id: 'inactive', active: false, importantEvents: [] },
      { id: 'deceased', active: true, importantEvents: [{ type: 'passedAway' }] },
    ];

    expect(getActiveHouseholdMembers(members).map((member) => member.id)).toEqual(['active']);
  });
});
