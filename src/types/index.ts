import { User as FirebaseUser } from 'firebase/auth';
import { UserRole } from './roles';

export interface User extends FirebaseUser {}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string;
  role: UserRole;
  isAdmin: boolean;
  notificationsEnabled: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  emailSubscriptions: {
    announcements: boolean;
    events: boolean;
    newsletter: boolean;
  };
} 