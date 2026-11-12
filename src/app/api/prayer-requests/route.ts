import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { RequestAuthorizationError, requireApprovedMember } from '@/lib/auth/requestAuthorization';
import {
  errorStatus,
  isAdministrator,
  prayerPostFromDocument,
  requiredText,
} from '@/lib/prayer/server';

export const dynamic = 'force-dynamic';

function errorResponse(error: unknown, operation: string) {
  const status = error instanceof RequestAuthorizationError ? error.status : errorStatus(error);
  if (status !== 500) return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed.' }, { status });
  console.error(`Prayer request ${operation} error:`, error);
  return NextResponse.json({ error: `We couldn’t ${operation} prayer requests.` }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const profile = await requireApprovedMember(request);
    const url = new URL(request.url);
    const view = url.searchParams.get('view') ?? 'active';
    const type = url.searchParams.get('type');
    const includeArchived = url.searchParams.get('includeArchived') === 'true';
    const admin = isAdministrator(profile);
    const snapshot = await getAdminDb().collection('prayerPraise').orderBy('dateCreated', 'desc').get();

    const documents = snapshot.docs.filter((document) => {
      const data = document.data();
      const isAuthor = data.author?.id === profile.uid;
      const followerIds = Array.isArray(data.followerIds) ? data.followerIds : [];

      if (type === 'prayer' || type === 'praise') {
        if (data.type !== type) return false;
      }
      if (data.isAdminOnly === true && !admin && !isAuthor) return false;

      if (view === 'admin') return admin;
      if (view === 'mine') return isAuthor;
      if (view === 'archived') return data.status === 'archived' && (admin || isAuthor);
      if (view === 'following') {
        return data.type === 'prayer'
          && data.approvalStatus === 'approved'
          && followerIds.includes(profile.uid)
          && (includeArchived || data.status === 'active');
      }
      return data.approvalStatus === 'approved' && data.status === 'active';
    });

    const requests = documents.map((document) => {
      const item = prayerPostFromDocument(document, profile);
      if (view === 'following' && item.status === 'archived' && !admin && item.author.id !== profile.uid) {
        return {
          ...item,
          title: 'Archived prayer request',
          description: '',
          author: { id: '', name: '' },
          isAnonymous: true,
          canManage: false,
          canFollow: false,
        };
      }
      return item;
    });

    return NextResponse.json(
      { requests },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return errorResponse(error, 'load');
  }
}

export async function POST(request: Request) {
  try {
    const profile = await requireApprovedMember(request);
    const body = await request.json() as Record<string, unknown>;
    const type = body.type === 'praise' ? 'praise' : 'prayer';
    const admin = isAdministrator(profile);
    const now = Timestamp.now();
    const reference = await getAdminDb().collection('prayerPraise').add({
      type,
      title: requiredText(body.title, 'Title', 160),
      description: requiredText(body.description, 'Description', 4000),
      author: {
        id: profile.uid,
        name: profile.displayName || 'Member',
      },
      dateCreated: now,
      lastActivityAt: now,
      prayerCount: 0,
      updateCount: 0,
      followerIds: [],
      isAnonymous: body.isAnonymous === true,
      isAdminOnly: body.isAdminOnly === true,
      status: 'active',
      approvalStatus: admin ? 'approved' : 'pending',
      archiveWarningSentAt: null,
    });
    const created = await reference.get();
    return NextResponse.json({ request: prayerPostFromDocument(created, profile) }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'create');
  }
}
