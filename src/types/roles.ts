export type UserRole = 'admin' | 'organizer' | 'member' | 'user';

export interface UserRolePermissions {
  canAssignServiceRoles: boolean;
  canManageUsers: boolean;
  canApprovePrayerRequests: boolean;
  canManageAnnouncements: boolean;
  canAccessDirectory: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, UserRolePermissions> = {
  admin: {
    canAssignServiceRoles: true,
    canManageUsers: true,
    canApprovePrayerRequests: true,
    canManageAnnouncements: true,
    canAccessDirectory: true,
  },
  organizer: {
    canAssignServiceRoles: true,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: false,
    canAccessDirectory: true,
  },
  member: {
    canAssignServiceRoles: false,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: false,
    canAccessDirectory: true,
  },
  user: {
    canAssignServiceRoles: false,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: false,
    canAccessDirectory: false,
  },
}; 