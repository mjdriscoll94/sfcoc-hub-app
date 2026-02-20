export type ServiceRole = 
  | 'Preacher'
  | 'Song Leader'
  | 'Head of Table'
  | 'Table Server 1'
  | 'Table Server 2'
  | 'Table Server 3'
  | 'Table Server 4'
  | 'Table Server 5'
  | 'Opening Prayer'
  | 'Closing Prayer'
  | 'Announcements';

export const SERVICE_ROLES: ServiceRole[] = [
  'Preacher',
  'Song Leader',
  'Head of Table',
  'Table Server 1',
  'Table Server 2',
  'Table Server 3',
  'Table Server 4',
  'Table Server 5',
  'Opening Prayer',
  'Closing Prayer',
  'Announcements'
];

export interface ServiceAssignment {
  id: string;
  date: Date;
  role: ServiceRole;
  userId: string;
  status: 'pending' | 'accepted' | 'declined' | 'awaiting_confirmation';
  assignedBy: string;
  assignedAt: Date;
  respondedAt?: Date;
}

/** Person who can be assigned to service roles (name, email, role preferences). Stored in Firestore serviceRoleParticipants. */
export interface ServiceRoleParticipant {
  id: string;
  name: string;
  email: string;
  rolePreferences: ServiceRole[];
} 