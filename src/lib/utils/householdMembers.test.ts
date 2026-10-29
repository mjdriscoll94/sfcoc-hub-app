import { describe, expect, it } from 'vitest';
import { excludePassedAwayMembers, hasPassedAwayEvent } from './householdMembers';

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
});
