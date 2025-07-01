import { User as FirebaseUser } from 'firebase/auth';
import { UserRole } from './roles';

export interface User extends FirebaseUser {}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
  emailSubscriptions: {
    announcements: boolean;
    events: boolean;
    newsletter: boolean;
  };
  role: UserRole;
  isAdmin?: boolean;
  notificationsEnabled?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  [key: string]: any; // For additional fields
} 