export type PrayerPostType = 'prayer' | 'praise';
export type PrayerPostStatus = 'active' | 'archived';
export type PrayerApprovalStatus = 'pending' | 'approved' | 'rejected';

export type PrayerRequestUpdate = {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorIsAdmin: boolean;
  createdAt: number;
  updatedAt: number;
  edited: boolean;
};

export type PrayerPraiseItem = {
  id: string;
  type: PrayerPostType;
  title: string;
  description: string;
  author: { id: string; name: string };
  dateCreated: number;
  lastActivityAt: number;
  prayerCount: number;
  updateCount: number;
  isAnonymous: boolean;
  isAdminOnly: boolean;
  status: PrayerPostStatus;
  approvalStatus: PrayerApprovalStatus;
  priority?: 'Urgent' | 'Batched';
  isFollowing: boolean;
  followerCount: number;
  canManage: boolean;
  canFollow: boolean;
  archivedAt?: number;
  archivedReason?: 'manual' | 'automatic';
};
