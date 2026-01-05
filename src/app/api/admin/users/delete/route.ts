import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    // Initialize admin
    const { app } = initAdmin();
    const auth = getAuth(app);

    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete from Firestore
    await adminDb.collection('users').doc(uid).delete();

    // Delete from Firebase Auth
    try {
      await auth.deleteUser(uid);
    } catch (authError: any) {
      // If user doesn't exist in Auth, that's okay - just log it
      if (authError.code !== 'auth/user-not-found') {
        console.error('Error deleting user from Auth:', authError);
        throw authError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
