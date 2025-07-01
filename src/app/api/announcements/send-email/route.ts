import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { sendAnnouncementEmail } from '@/lib/email/emailService';

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

    const subscribedEmails = querySnapshot.docs
      .map(doc => doc.data().email)
      .filter(Boolean); // Remove any undefined or null emails

    if (subscribedEmails.length === 0) {
      return NextResponse.json(
        { message: 'No subscribed users found' },
        { status: 200 }
      );
    }

    // Send the announcement email
    const result = await sendAnnouncementEmail(subscribedEmails, announcement);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send announcement email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      recipientCount: subscribedEmails.length
    });
  } catch (error) {
    console.error('Error sending announcement email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 