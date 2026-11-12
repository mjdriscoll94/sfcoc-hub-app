import { describe, expect, it } from 'vitest';
import { getRoleCapabilities, type RoleProfile } from './roles';

function capabilities(profile: RoleProfile | null) {
  return getRoleCapabilities(profile);
}

describe('role navigation capabilities', () => {
  it('limits Leadership Development to membership-level roles', () => {
    expect(capabilities({ role: 'user' }).canAccessLeadershipDevelopment).toBe(false);
    for (const role of ['member', 'lifeGroupLeader', 'lifeGroupOrganizer', 'organizer', 'admin'] as const) {
      expect(capabilities({ role }).canAccessLeadershipDevelopment).toBe(true);
    }
  });

  it('keeps signed-out visitors out of member management tools', () => {
    expect(capabilities(null)).toMatchObject({
      isAdmin: false,
      canAccessDirectory: false,
      canAccessLeadershipDevelopment: false,
      canAccessManageChurch: false,
      canManageAttendance: false,
      canSendEmail: false,
    });
  });

  it('gives regular members directory access without staff navigation', () => {
    expect(capabilities({ role: 'member' })).toMatchObject({
      isAdmin: false,
      canAccessDirectory: true,
      canAccessLeadershipDevelopment: true,
      canAccessManageChurch: false,
      canManageAttendance: false,
      canSendEmail: false,
    });
  });

  it('shows the Service Organizer only the tools granted to that role', () => {
    expect(capabilities({ role: 'organizer' })).toMatchObject({
      isAdmin: false,
      canAccessManageChurch: true,
      canAccessLeadershipDevelopment: true,
      canAssignServiceRoles: true,
      canManageAnnouncements: true,
      canManageVolunteerOpportunities: true,
      canManageAttendance: true,
      canSendEmail: true,
      canManageUsers: false,
      canApprovePrayerRequests: false,
      canManageLifeGroups: false,
    });
  });

  it('shows the Life Group Organizer only life-group communication tools', () => {
    expect(capabilities({ role: 'lifeGroupOrganizer' })).toMatchObject({
      isAdmin: false,
      canAccessManageChurch: true,
      canAccessLeadershipDevelopment: true,
      canManageLifeGroups: true,
      canSendEmail: true,
      canManageAnnouncements: false,
      canManageAttendance: false,
      canManageUsers: false,
    });
  });

  it('keeps Life Group Leaders in the member experience', () => {
    expect(capabilities({ role: 'lifeGroupLeader' })).toMatchObject({
      isAdmin: false,
      canAccessDirectory: true,
      canAccessLeadershipDevelopment: true,
      canAccessManageChurch: false,
      canManageLifeGroups: false,
      canSendEmail: false,
    });
  });

  it('gives administrators every capability regardless of the legacy role field', () => {
    expect(capabilities({ isAdmin: true, role: 'member' })).toMatchObject({
      isAdmin: true,
      canAssignServiceRoles: true,
      canManageUsers: true,
      canApprovePrayerRequests: true,
      canManageAnnouncements: true,
      canManageVolunteerOpportunities: true,
      canAccessDirectory: true,
      canManageLifeGroups: true,
      canManageAttendance: true,
      canAccessManageChurch: true,
      canAccessLeadershipDevelopment: true,
      canSendEmail: true,
    });
  });
});
