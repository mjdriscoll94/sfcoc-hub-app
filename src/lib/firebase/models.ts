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
  status: 'active' | 'archived';
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