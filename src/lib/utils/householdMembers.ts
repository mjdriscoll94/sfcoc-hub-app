interface MemberEventLike {
  type?: unknown;
}

interface HouseholdMemberLike {
  importantEvents?: unknown;
  active?: unknown;
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

export const isInactiveMember = (member: unknown): boolean => (
  !!member && typeof member === 'object' && (member as HouseholdMemberLike).active === false
);

export const excludeInactiveMembers = <T>(members: T[]): T[] => (
  members.filter((member) => !isInactiveMember(member))
);

export const getActiveHouseholdMembers = <T>(members: T[]): T[] => (
  members.filter((member) => !isInactiveMember(member) && !hasPassedAwayEvent(member))
);
