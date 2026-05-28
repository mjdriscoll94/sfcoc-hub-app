import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { transporter, getEmailFromInformationHub } from '@/lib/email/config';
import { attachmentsFromFormData } from '@/lib/email/attachments';
import { wrapMemberEmailHtml } from '@/lib/email/memberEmailTemplate';

type Audience = 'all' | 'announcements' | 'events' | 'newsletter' | 'list';

async function parseRequestBody(request: Request): Promise<{
  subject: string;
  content: string;
  audience: Audience;
  listId?: string;
  attachments: Awaited<ReturnType<typeof attachmentsFromFormData>>;
}> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const subject = String(formData.get('subject') ?? '').trim();
    const content = String(formData.get('content') ?? '').trim();
    const audience = String(formData.get('audience') ?? 'all') as Audience;
    const listId = String(formData.get('listId') ?? '').trim() || undefined;
    const attachments = await attachmentsFromFormData(formData);
    return { subject, content, audience, listId, attachments };
  }

  const body = await request.json();
  const { subject, content, audience, listId } = body as {
    subject?: string;
    content?: string;
    audience?: Audience;
    listId?: string;
  };
  return {
    subject: subject?.trim() ?? '',
    content: content?.trim() ?? '',
    audience: audience ?? 'all',
    listId: listId?.trim() || undefined,
    attachments: [],
  };
}

export async function POST(request: Request) {
  try {
    let parsed: Awaited<ReturnType<typeof parseRequestBody>>;
    try {
      parsed = await parseRequestBody(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { subject, content, audience, listId, attachments } = parsed;

    if (!subject || !content) {
      return NextResponse.json(
        { error: 'Subject and content are required' },
        { status: 400 }
      );
    }

    const validAudiences: Audience[] = ['all', 'announcements', 'events', 'newsletter', 'list'];
    const chosenAudience = validAudiences.includes(audience) ? audience : 'all';

    const adminDb = getAdminDb();
    let uniqueEmails: string[] = [];

    if (chosenAudience === 'list' && listId) {
      const listDoc = await adminDb.collection('emailLists').doc(listId).get();
      if (!listDoc.exists) {
        return NextResponse.json({ error: 'Email list not found' }, { status: 404 });
      }
      const listData = listDoc.data();
      uniqueEmails = [...new Set((listData?.emails as string[]) || [])].filter(Boolean);
    } else {
      const usersSnap = await adminDb
        .collection('users')
        .where('approvalStatus', '==', 'approved')
        .get();

      const emails: string[] = [];
      usersSnap.docs.forEach((doc) => {
        const data = doc.data();
        const email = data.email?.trim();
        if (!email) return;

        if (chosenAudience === 'all') {
          emails.push(email);
          return;
        }
        const subs = data.emailSubscriptions ?? {};
        const isSubscribed =
          chosenAudience === 'announcements' ? !!subs.announcements :
          chosenAudience === 'events' ? !!subs.events :
          chosenAudience === 'newsletter' ? !!subs.newsletter :
          false;
        if (isSubscribed) emails.push(email);
      });

      uniqueEmails = [...new Set(emails)];
    }
    if (uniqueEmails.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found for the selected audience' },
        { status: 400 }
      );
    }

    const html = wrapMemberEmailHtml(content);

    for (const to of uniqueEmails) {
      await transporter.sendMail({
        from: getEmailFromInformationHub(),
        to,
        subject,
        html,
        ...(attachments.length > 0 ? { attachments } : {}),
      });
    }

    return NextResponse.json({
      success: true,
      recipientCount: uniqueEmails.length,
      attachmentCount: attachments.length,
    });
  } catch (error) {
    console.error('Admin send-email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
