import type { UserProfile } from '@/types';

/** Life group member resources: approved users with role above `user` (member, organizer, leaders, etc.) or admin. */
export function canViewLifeGroupMemberResources(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.approvalStatus !== 'approved') return false;
  if (profile.isAdmin) return true;
  return profile.role !== 'user';
}
