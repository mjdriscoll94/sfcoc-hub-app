'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ServiceAssignment } from '@/types/serviceRoles';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, orderBy, where, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  id: string;
  displayName: string | null;
  email: string | null;
}

export default function ServiceHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ServiceAssignment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const fetchedUsers = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserProfile[];
        setUsers(fetchedUsers);

        // Fetch all past assignments (before today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const assignmentsRef = collection(db, 'serviceAssignments');
        const q = query(
          assignmentsRef,
          where('date', '<', Timestamp.fromDate(today)),
          orderBy('date', 'desc')
        );

        const assignmentsSnapshot = await getDocs(q);
        const fetchedAssignments = assignmentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate?.() || new Date(),
            assignedAt: data.assignedAt?.toDate?.() || new Date(),
            respondedAt: data.respondedAt?.toDate?.()
          } as ServiceAssignment;
        });

        setAssignments(fetchedAssignments);
      } catch (err) {
        console.error('Failed to fetch service history:', err);
        setError('Failed to load service history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.displayName || user?.email || 'Unknown User';
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-error" />;
      case 'awaiting_confirmation':
      case 'pending':
        return <Clock className="h-5 w-5 text-warning" />;
      default:
        return null;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'accepted':
        return <span className="text-success font-semibold">Accepted</span>;
      case 'declined':
        return <span className="text-error font-semibold">Declined</span>;
      case 'awaiting_confirmation':
        return <span className="text-warning font-semibold">Awaiting Confirmation</span>;
      case 'pending':
        return <span className="text-warning font-semibold">Pending</span>;
      default:
        return <span className="text-text-muted">Unknown</span>;
    }
  };

  // Get unique roles for filter
  const uniqueRoles = Array.from(new Set(assignments.map(a => a.role))).sort();

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    if (filterStatus !== 'all' && assignment.status !== filterStatus) return false;
    if (filterRole !== 'all' && assignment.role !== filterRole) return false;
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/service-roles"
              className="inline-flex items-center text-coral hover:text-coral-dark mb-4 font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Service Roles
            </Link>
            <h1 className="text-3xl font-bold text-charcoal">Service History</h1>
            <p className="mt-2 text-text-light">
              View past Sunday service role assignments
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-error-bg border border-error rounded-md p-4 text-error">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-6 shadow">
          <h2 className="text-lg font-semibold text-charcoal mb-4">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral bg-card text-charcoal"
              >
                <option value="all">All Statuses</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="awaiting_confirmation">Awaiting Confirmation</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Role
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-coral bg-card text-charcoal"
              >
                <option value="all">All Roles</option>
                {uniqueRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-gradient-to-r from-coral/5 to-sage/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Status
                  </th>
                  <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-semibold text-charcoal uppercase tracking-wider">
                    Assigned Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                      No service history found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-bg-secondary transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-charcoal">
                        {format(assignment.date, 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal">
                        <span className="px-3 py-1 rounded-full bg-coral/10 text-coral font-medium">
                          {assignment.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                        {getUserName(assignment.userId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(assignment.status)}
                          {getStatusText(assignment.status)}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-text-muted">
                        {format(assignment.assignedAt, 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        {filteredAssignments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg border border-border p-4 shadow">
              <div className="text-sm text-text-light">Total Assignments</div>
              <div className="text-2xl font-bold text-charcoal mt-1">
                {filteredAssignments.length}
              </div>
            </div>
            <div className="bg-success-bg rounded-lg border border-success p-4 shadow">
              <div className="text-sm text-success">Accepted</div>
              <div className="text-2xl font-bold text-success mt-1">
                {filteredAssignments.filter(a => a.status === 'accepted').length}
              </div>
            </div>
            <div className="bg-error-bg rounded-lg border border-error p-4 shadow">
              <div className="text-sm text-error">Declined</div>
              <div className="text-2xl font-bold text-error mt-1">
                {filteredAssignments.filter(a => a.status === 'declined').length}
              </div>
            </div>
            <div className="bg-warning-bg rounded-lg border border-warning p-4 shadow">
              <div className="text-sm text-warning">Pending</div>
              <div className="text-2xl font-bold text-warning mt-1">
                {filteredAssignments.filter(a => a.status === 'awaiting_confirmation' || a.status === 'pending').length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

