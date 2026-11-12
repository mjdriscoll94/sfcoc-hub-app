import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { sendAnnouncementEmail, type EmailSubscriber } from '@/lib/email/emailService';

export async function POST(request: Request) {
  try {
    const { announcement } = await request.json();

    if (!announcement) {
      return NextResponse.json(
        { error: 'Announcement data is required' },
        { status: 400 }
      );
    }

    // Get all users who have subscribed to announcements
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('emailSubscriptions.announcements', '==', true));
    const querySnapshot = await getDocs(q);

    const subscribers = querySnapshot.docs
      .map((document): EmailSubscriber => {
        const data = document.data();
        return {
          email: String(data.email || ''),
          name: data.displayName ? String(data.displayName) : undefined,
          emailSubscriptions: data.emailSubscriptions || {
            announcements: true,
            events: false,
            newsletter: false,
          },
        };
      })
      .filter((subscriber) => subscriber.email);

    if (subscribers.length === 0) {
      return NextResponse.json(
        { message: 'No subscribed users found' },
        { status: 200 }
      );
    }

    // Send the announcement email
    const subject = String(announcement.title || 'Church announcement');
    const content = String(announcement.content || '');
    const result = await sendAnnouncementEmail(subscribers, subject, content);

    if (result && !result.success) {
      return NextResponse.json(
        { error: 'Failed to send announcement email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      recipientCount: subscribers.length
    });
  } catch (error) {
    console.error('Error sending announcement email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
