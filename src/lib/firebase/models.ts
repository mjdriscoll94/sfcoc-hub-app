export interface PrayerPraise {
  id: string;
  type: 'prayer' | 'praise';
  title: string;
  description: string;
  author: {
    id: string;
    name: string;
  };
  dateCreated: Date;
  prayerCount: number;
  isAnonymous: boolean;
  isAdminOnly: boolean;
  status: 'active' | 'archived';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  priority?: 'Urgent' | 'Batched';
  isSent?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  datePosted: Date;
  expiryDate?: Date;
  priority: 'high' | 'normal' | 'low';
  status: 'active' | 'archived';
}

export interface VolunteerOpportunity {
  id: string;
  title: string;
  description: string;
  datePosted: Date;
  eventDate: Date;
  location: string;
  slots: number;
  signedUpUsers: Array<{
    id: string;
    name: string;
  }>;
  requirements?: string[];
  status: 'open' | 'filled' | 'completed';
}

export interface FamilyMember {
  firstName: string;
  lastName: string;
  relationship: string;
  birthday: string;
}

export interface DirectoryEntry {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  anniversary?: string;
  familyMembers: FamilyMember[];
  submittedBy: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  photoURL?: string;
} 