'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RespondToAssignmentPage() {
  useEffect(() => {
    document.title = 'Respond to Assignment | Sioux Falls Church of Christ';
  }, []);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const assignmentId = searchParams.get('id');
  const action = searchParams.get('action');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [assignmentDetails, setAssignmentDetails] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!assignmentId || !action) {
      setError('Invalid request: Missing assignment ID or action');
      setLoading(false);
      return;
    }

    if (action !== 'accept' && action !== 'decline') {
      setError('Invalid action');
      setLoading(false);
      return;
    }

    // Allow responding with or without login (participants use email link and may not have an account)
    handleResponse();
  }, [user, authLoading, assignmentId, action]);

  const handleResponse = async () => {
    if (!assignmentId || !action) return;

    try {
      setLoading(true);
      setError(null);

      // First get assignment details
      const assignmentRef = doc(db, 'serviceAssignments', assignmentId);
      const assignmentDoc = await getDoc(assignmentRef);

      if (!assignmentDoc.exists()) {
        setError('Assignment not found');
        setLoading(false);
        return;
      }

      const assignment = assignmentDoc.data();
      setAssignmentDetails({
        role: assignment.role,
        date: assignment.date?.toDate?.() || new Date(),
        status: assignment.status
      });

      // Check if already responded
      if (assignment.status === 'accepted' || assignment.status === 'declined') {
        setError(`This assignment has already been ${assignment.status}`);
        setLoading(false);
        return;
      }

      // Assignees are always from service role participants; anyone with the link can respond (no login required)
      const response = await fetch('/api/service-roles/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignmentId, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update assignment');
      }

      setSuccess(true);
    } catch (err) {
      console.error('Error responding to assignment:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-coral animate-spin mx-auto mb-4" />
          <p className="text-text-light">Processing your response...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="max-w-md w-full">
        {success ? (
          <div className="bg-card rounded-lg border border-border shadow-lg p-8 text-center">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              action === 'accept' ? 'bg-success-bg' : 'bg-error-bg'
            }`}>
              {action === 'accept' ? (
                <CheckCircle className="h-10 w-10 text-success" />
              ) : (
                <XCircle className="h-10 w-10 text-error" />
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-charcoal mb-2">
              {action === 'accept' ? 'Assignment Accepted!' : 'Assignment Declined'}
            </h1>
            
            {assignmentDetails && (
              <div className="bg-bg-secondary rounded-lg p-4 my-4 text-left">
                <p className="text-sm text-text-light mb-1">Role</p>
                <p className="font-semibold text-charcoal mb-3">{assignmentDetails.role}</p>
                
                <p className="text-sm text-text-light mb-1">Date</p>
                <p className="font-semibold text-charcoal">
                  {format(assignmentDetails.date, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            )}
            
            <p className="text-text-light mb-6">
              {action === 'accept' 
                ? 'Thank you for accepting this service role! We appreciate your willingness to serve.' 
                : 'Your response has been recorded. If you have any concerns, please contact the church office.'}
            </p>
            
            <div className="space-y-3">
              <Link
                href="/service-roles"
                className="block w-full px-6 py-3 bg-coral text-white font-semibold rounded-lg hover:bg-coral-dark transition-colors text-center"
              >
                View All Assignments
              </Link>
              <Link
                href="/"
                className="block w-full px-6 py-3 border-2 border-border text-charcoal font-semibold rounded-lg hover:bg-bg-secondary transition-colors text-center"
              >
                Go to Home
              </Link>
            </div>
          </div>
        ) : error ? (
          <div className="bg-card rounded-lg border border-error shadow-lg p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-error-bg flex items-center justify-center mb-4">
              <XCircle className="h-10 w-10 text-error" />
            </div>
            
            <h1 className="text-2xl font-bold text-charcoal mb-2">
              Unable to Process Response
            </h1>
            
            <p className="text-error mb-6">
              {error}
            </p>
            
            {assignmentDetails && (
              <div className="bg-bg-secondary rounded-lg p-4 my-4 text-left">
                <p className="text-sm text-text-light mb-1">Role</p>
                <p className="font-semibold text-charcoal mb-3">{assignmentDetails.role}</p>
                
                <p className="text-sm text-text-light mb-1">Date</p>
                <p className="font-semibold text-charcoal">
                  {format(assignmentDetails.date, 'EEEE, MMMM d, yyyy')}
                </p>
                
                {assignmentDetails.status && (
                  <>
                    <p className="text-sm text-text-light mb-1 mt-3">Current Status</p>
                    <p className={`font-semibold capitalize ${
                      assignmentDetails.status === 'accepted' ? 'text-success' : 'text-error'
                    }`}>
                      {assignmentDetails.status}
                    </p>
                  </>
                )}
              </div>
            )}
            
            <div className="space-y-3">
              <Link
                href="/service-roles"
                className="block w-full px-6 py-3 bg-coral text-white font-semibold rounded-lg hover:bg-coral-dark transition-colors text-center"
              >
                View Service Roles
              </Link>
              <Link
                href="/"
                className="block w-full px-6 py-3 border-2 border-border text-charcoal font-semibold rounded-lg hover:bg-bg-secondary transition-colors text-center"
              >
                Go to Home
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

