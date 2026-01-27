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
  disabled?: boolean;
  customClaims?: { admin: boolean };
  emailSubscriptions: {
    announcements: boolean;
    events: boolean;
    newsletter: boolean;
  };
}

export type Quarter = 'Fall' | 'Winter' | 'Spring' | 'Summer';
export type ClassType = 'Sunday' | 'Wednesday' | 'Decorators';
export type AgeGroup = 'Cradle Roll' | 'Toddlers' | 'Elementary A' | 'Elementary B' | 'Middle School' | 'High School' | 'Decorators';

export interface TeacherAssignment {
  id: string;
  classType: ClassType;
  ageGroup: AgeGroup;
  quarter: Quarter;
  teacherName: string;
  isHelper?: boolean;
  isSecondChoice?: boolean;
  notes?: string;
  assignedBy: string;
  assignedAt: Date;
  updatedAt: Date;
}

export interface TeachingSchedule {
  id: string;
  schoolYear: string; // e.g., "2025-2026"
  assignments: TeacherAssignment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  gender: 'Male' | 'Female';
  preferHelper?: boolean;
  preferMainTeacher?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

export interface LifeGroupMember {
  userId: string;
  displayName: string | null;
  email: string | null;
  addedAt: Date;
  addedBy: string;
}

export interface LifeGroup {
  id: string;
  name: string;
  description?: string;
  leaderId: string;
  leaderName: string;
  members: LifeGroupMember[];
  familyUnitIds?: string[]; // IDs of family units in this life group
  meetingDay?: string;
  meetingTime?: string;
  meetingLocation?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  relationship?: string; // e.g., "Parent", "Child", "Spouse"
}

export interface FamilyUnit {
  id: string;
  familyName: string; // e.g., "Smith Family"
  members: FamilyMember[];
  totalCount: number; // Auto-calculated from members.length
  lifeGroupId?: string; // Optional: if associated with a specific life group
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
} 