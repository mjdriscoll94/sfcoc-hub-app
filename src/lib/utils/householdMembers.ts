interface MemberEventLike {
  type?: unknown;
}

interface HouseholdMemberLike {
  importantEvents?: unknown;
}

export const hasPassedAwayEvent = (member: unknown): boolean => {
  if (!member || typeof member !== 'object') return false;
  const importantEvents = (member as HouseholdMemberLike).importantEvents;
  return Array.isArray(importantEvents)
    && importantEvents.some((event: MemberEventLike) => event?.type === 'passedAway');
};

export const excludePassedAwayMembers = <T>(members: T[]): T[] => (
  members.filter((member) => !hasPassedAwayEvent(member))
);
