import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase/admin';
import { getRoleCapabilities, type UserRole } from '@/types/roles';

export class RequestAuthorizationError extends Error {
  constructor(message: string, readonly status: 401 | 403) {
    super(message);
  }
}

type AuthorizedProfile = {
  uid: string;
  role?: UserRole;
  isAdmin: boolean;
  approvalStatus?: string;
};

async function authorizedProfile(request: Request): Promise<AuthorizedProfile> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new RequestAuthorizationError('Authentication required.', 401);
  }

  const decodedToken = await getAuth(getAdminApp()).verifyIdToken(authorization.slice(7));
  const snapshot = await getAdminDb().collection('users').doc(decodedToken.uid).get();
  if (!snapshot.exists) {
    throw new RequestAuthorizationError('Member profile not found.', 403);
  }

  const data = snapshot.data() ?? {};
  if (data.approvalStatus !== 'approved') {
    throw new RequestAuthorizationError('Member access is not approved.', 403);
  }

  return {
    uid: decodedToken.uid,
    role: data.role,
    isAdmin: data.isAdmin === true,
    approvalStatus: data.approvalStatus,
  };
}

export async function requireLeadershipMember(request: Request): Promise<AuthorizedProfile> {
  const profile = await authorizedProfile(request);
  if (!getRoleCapabilities(profile).canAccessLeadershipDevelopment) {
    throw new RequestAuthorizationError('Leadership Development is available to approved members.', 403);
  }
  return profile;
}

export async function requireAdministrator(request: Request): Promise<AuthorizedProfile> {
  const profile = await authorizedProfile(request);
  if (!profile.isAdmin && profile.role !== 'admin') {
    throw new RequestAuthorizationError('Administrator access is required.', 403);
  }
  return profile;
}
