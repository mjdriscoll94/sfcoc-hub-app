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

export type RoleProfile = {
  isAdmin?: boolean;
  role?: UserRole;
};

export interface RoleCapabilities extends UserRolePermissions {
  isAdmin: boolean;
  canAccessManageChurch: boolean;
  canSendEmail: boolean;
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

const NO_ROLE_PERMISSIONS: UserRolePermissions = {
  canAssignServiceRoles: false,
  canManageUsers: false,
  canApprovePrayerRequests: false,
  canManageAnnouncements: false,
  canManageVolunteerOpportunities: false,
  canAccessDirectory: false,
  canManageLifeGroups: false,
  canManageAttendance: false,
};

export function getRoleCapabilities(profile: RoleProfile | null | undefined): RoleCapabilities {
  const isAdmin = Boolean(profile?.isAdmin);
  const permissions = profile?.role ? ROLE_PERMISSIONS[profile.role] : NO_ROLE_PERMISSIONS;
  const canAssignServiceRoles = isAdmin || permissions.canAssignServiceRoles;
  const canManageUsers = isAdmin || permissions.canManageUsers;
  const canApprovePrayerRequests = isAdmin || permissions.canApprovePrayerRequests;
  const canManageAnnouncements = isAdmin || permissions.canManageAnnouncements;
  const canManageVolunteerOpportunities = isAdmin || permissions.canManageVolunteerOpportunities;
  const canAccessDirectory = isAdmin || permissions.canAccessDirectory;
  const canManageLifeGroups = isAdmin || permissions.canManageLifeGroups;
  const canManageAttendance = isAdmin || permissions.canManageAttendance;

  return {
    isAdmin,
    canAssignServiceRoles,
    canManageUsers,
    canApprovePrayerRequests,
    canManageAnnouncements,
    canManageVolunteerOpportunities,
    canAccessDirectory,
    canManageLifeGroups,
    canManageAttendance,
    canAccessManageChurch:
      isAdmin ||
      canAssignServiceRoles ||
      canManageAnnouncements ||
      canManageVolunteerOpportunities ||
      canManageLifeGroups ||
      canManageAttendance,
    canSendEmail: isAdmin || canManageAnnouncements || canManageLifeGroups,
  };
}

export const canManageAttendance = (profile: RoleProfile | null | undefined): boolean =>
  getRoleCapabilities(profile).canManageAttendance;
