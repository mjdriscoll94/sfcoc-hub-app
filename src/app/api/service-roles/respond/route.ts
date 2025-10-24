import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { assignmentId, action, userId } = await request.json();

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

    // Get the assignment
    const assignmentRef = doc(db, 'serviceAssignments', assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);

    if (!assignmentDoc.exists()) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const assignmentData = assignmentDoc.data();

    // Verify the user is the one assigned
    if (assignmentData.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only respond to your own assignments' },
        { status: 403 }
      );
    }

    // Check if assignment has already been responded to
    if (assignmentData.status === 'accepted' || assignmentData.status === 'declined') {
      return NextResponse.json(
        { error: 'This assignment has already been responded to' },
        { status: 400 }
      );
    }

    // Update the assignment status
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    await updateDoc(assignmentRef, {
      status: newStatus,
      respondedAt: Timestamp.fromDate(new Date())
    });

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

