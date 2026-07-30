export type UserRole = 'admin' | 'organizer' | 'member' | 'user' | 'lifeGroupLeader' | 'lifeGroupOrganizer';

export interface UserRolePermissions {
  canAssignServiceRoles: boolean;
  canManageUsers: boolean;
  canApprovePrayerRequests: boolean;
  canManageAnnouncements: boolean;
  canManageVolunteerOpportunities: boolean;
  canAccessDirectory: boolean;
  canManageLifeGroups: boolean;
  canManageAttendance: boolean;
}

/** Display names for UI (e.g. "Service Organizer" instead of "organizer") */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'Admin',
  organizer: 'Service Organizer',
  member: 'Member',
  user: 'User',
  lifeGroupLeader: 'Life Group Leader',
  lifeGroupOrganizer: 'Life Group Organizer',
};

export const ROLE_PERMISSIONS: Record<UserRole, UserRolePermissions> = {
  admin: {
    canAssignServiceRoles: true,
    canManageUsers: true,
    canApprovePrayerRequests: true,
    canManageAnnouncements: true,
    canManageVolunteerOpportunities: true,
    canAccessDirectory: true,
    canManageLifeGroups: true,
    canManageAttendance: true,
  },
  organizer: {
    canAssignServiceRoles: true,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: true,
    canManageVolunteerOpportunities: true,
    canAccessDirectory: true,
    canManageLifeGroups: false,
    canManageAttendance: true,
  },
  member: {
    canAssignServiceRoles: false,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: false,
    canManageVolunteerOpportunities: false,
    canAccessDirectory: true,
    canManageLifeGroups: false,
    canManageAttendance: false,
  },
  user: {
    canAssignServiceRoles: false,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: false,
    canManageVolunteerOpportunities: false,
    canAccessDirectory: false,
    canManageLifeGroups: false,
    canManageAttendance: false,
  },
  lifeGroupLeader: {
    canAssignServiceRoles: false,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: false,
    canManageVolunteerOpportunities: false,
    canAccessDirectory: true,
    canManageLifeGroups: false,
    canManageAttendance: false,
  },
  lifeGroupOrganizer: {
    canAssignServiceRoles: false,
    canManageUsers: false,
    canApprovePrayerRequests: false,
    canManageAnnouncements: false,
    canManageVolunteerOpportunities: false,
    canAccessDirectory: true,
    canManageLifeGroups: true,
    canManageAttendance: false,
  },
};

export const canManageAttendance = (profile: { isAdmin?: boolean; role?: UserRole } | null | undefined): boolean =>
  !!profile?.isAdmin || !!(profile?.role && ROLE_PERMISSIONS[profile.role].canManageAttendance);
