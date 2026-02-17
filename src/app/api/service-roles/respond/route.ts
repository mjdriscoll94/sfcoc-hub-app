import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const adminDb = getAdminDb();
    const { assignmentId, action, userId } = await request.json();

    console.log('Received respond request:', { assignmentId, action, userId });

    if (!assignmentId || !action || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Get the assignment using admin SDK
    const assignmentDoc = await adminDb.collection('serviceAssignments').doc(assignmentId).get();

    if (!assignmentDoc.exists) {
      console.error('Assignment not found:', assignmentId);
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const assignmentData = assignmentDoc.data();

    // Verify the user is the one assigned
    if (assignmentData?.userId !== userId) {
      console.error('Unauthorized: user mismatch', { expected: assignmentData?.userId, actual: userId });
      return NextResponse.json(
        { error: 'Unauthorized: You can only respond to your own assignments' },
        { status: 403 }
      );
    }

    // Check if assignment has already been responded to
    if (assignmentData?.status === 'accepted' || assignmentData?.status === 'declined') {
      console.log('Assignment already responded to:', assignmentData?.status);
      return NextResponse.json(
        { error: 'This assignment has already been responded to' },
        { status: 400 }
      );
    }

    // Update the assignment status using admin SDK
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    await adminDb.collection('serviceAssignments').doc(assignmentId).update({
      status: newStatus,
      respondedAt: admin.firestore.Timestamp.now()
    });

    console.log('Assignment updated successfully:', { assignmentId, newStatus });

    return NextResponse.json({ 
      success: true,
      status: newStatus,
      message: `Assignment ${newStatus} successfully`
    });
  } catch (error) {
    console.error('Error responding to service assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update assignment', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

