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

export interface CalendarCategory {
  id?: string;
  name: string;
  color: string; // hex, e.g. #E88B5F
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  allDay?: boolean;
  location?: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  createdAt?: Date;
  createdBy?: string;
  /** Stored on Firestore doc when event repeats */
  recurrenceType?: RecurrenceType;
  recurrenceUntil?: Date;
  /** Denormalized for queries: true when recurrenceType is not none */
  hasRecurrence?: boolean;
  /** Set on expanded instances; Firestore document id of the series */
  parentEventId?: string;
} 