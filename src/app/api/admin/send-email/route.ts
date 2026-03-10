import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { transporter } from '@/lib/email/config';

const LOGO_URL = 'https://res.cloudinary.com/dzjsztwqp/image/upload/v1751485185/SFCOC_Colored_lxaty4.png';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.siouxfallschurchofchrist.org';

type Audience = 'all' | 'announcements' | 'events' | 'newsletter' | 'list';

function wrapInTemplate(content: string): string {
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${LOGO_URL}" alt="SFCOC Logo" style="width: 120px; height: auto;" />
      </div>
      <div style="color: #333; line-height: 1.6;">
        ${escaped}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">
        You received this email from Sioux Falls Church of Christ.
        <a href="${BASE_URL}/settings" style="color: #E88B5F;">Manage your email preferences</a>
      </p>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subject, content, audience, listId } = body as {
      subject?: string;
      content?: string;
      audience?: Audience;
      listId?: string;
    };

    if (!subject?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Subject and content are required' },
        { status: 400 }
      );
    }

    const validAudiences: Audience[] = ['all', 'announcements', 'events', 'newsletter', 'list'];
    const chosenAudience = validAudiences.includes(audience ?? 'all') ? audience! : 'all';

    const adminDb = getAdminDb();
    let uniqueEmails: string[] = [];

    if (chosenAudience === 'list' && listId?.trim()) {
      const listDoc = await adminDb.collection('emailLists').doc(listId.trim()).get();
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

    const html = wrapInTemplate(content);

    for (const to of uniqueEmails) {
      await transporter.sendMail({
        from: 'SFCOC Information Hub <announcements@siouxfallschurchofchrist.org>',
        to,
        subject: subject.trim(),
        html,
      });
    }

    return NextResponse.json({
      success: true,
      recipientCount: uniqueEmails.length,
    });
  } catch (error) {
    console.error('Admin send-email error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
