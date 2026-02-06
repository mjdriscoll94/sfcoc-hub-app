export type UserRole = 'admin' | 'organizer' | 'member' | 'user' | 'lifeGroupLeader';

export interface UserRolePermissions {
  canAssignServiceRoles: boolean;
  canManageUsers: boolean;
  canApprovePrayerRequests: boolean;
  canManageAnnouncements: boolean;
  canManageVolunteerOpportunities: boolean;
  canAccessDirectory: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, UserRolePermissions> = {
  admin: {
    canAssignServiceRoles: true,
    canManageUsers: true,
    canApprovePrayerRequests: true,
    canManageAnnouncements: true,
    canManageVolunteerOpportunities: true,
    canAccessDirectory: true,
  },
  organizer: {
    canAssignServiceRoles: true,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: true,
    canManageVolunteerOpportunities: true,
    canAccessDirectory: true,
  },
  member: {
    canAssignServiceRoles: false,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: false,
    canManageVolunteerOpportunities: false,
    canAccessDirectory: true,
  },
  user: {
    canAssignServiceRoles: false,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: false,
    canManageVolunteerOpportunities: false,
    canAccessDirectory: false,
  },
  lifeGroupLeader: {
    canAssignServiceRoles: false,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: false,
    canManageVolunteerOpportunities: false,
    canAccessDirectory: true,
  },
}; 