'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ServiceRole, SERVICE_ROLES, ServiceAssignment } from '@/types/serviceRoles';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, addDoc, Timestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { format, nextSunday, addWeeks } from 'date-fns';
import { ROLE_PERMISSIONS } from '@/types/roles';
import Link from 'next/link';

interface UserProfile {
  id: string;
  displayName: string | null;
  email: string | null;
}

interface RoleAssignment {
  role: ServiceRole;
  userId: string | null;
}

interface WeekData {
  date: Date;
  assignments: ServiceAssignment[];
  pendingAssignments: Record<ServiceRole, string | null>;
  isEditing: boolean;
  isExpanded: boolean;
}

export default function ServiceRolesPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [weeks, setWeeks] = useState<WeekData[]>([]);

  // Update permission check to handle both role-based and legacy permissions
  const canAssignRoles = userProfile && (
    userProfile.isAdmin || // Legacy admin check
    (userProfile.role && ROLE_PERMISSIONS[userProfile.role]?.canAssignServiceRoles) // New role check
  );

  // Initialize weeks data
  useEffect(() => {
    const firstSunday = nextSunday(new Date());
    const initialWeeks: WeekData[] = Array.from({ length: 4 }, (_, i) => {
      const initialPendingAssignments = SERVICE_ROLES.reduce((acc, role) => ({
        ...acc,
        [role]: null
      }), {} as Record<ServiceRole, string | null>);

      return {
        date: addWeeks(firstSunday, i),
        assignments: [],
        pendingAssignments: initialPendingAssignments,
        isEditing: false,
        isExpanded: i === 0 // Only first week is expanded by default
      };
    });
    setWeeks(initialWeeks);
  }, []);

  // Fetch users and assignments when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        // Fetch users if can assign roles
        if (canAssignRoles) {
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          const fetchedUsers = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as UserProfile[];
          setUsers(fetchedUsers);
        }

        // Fetch assignments for all weeks
        const firstSunday = weeks[0]?.date;
        const lastSunday = weeks[weeks.length - 1]?.date;

        if (!firstSunday || !lastSunday) return;

        const startDate = new Date(firstSunday);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(lastSunday);
        endDate.setHours(23, 59, 59, 999);

        const assignmentsRef = collection(db, 'serviceAssignments');
        const q = query(
          assignmentsRef,
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<=', Timestamp.fromDate(endDate))
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

        // Group assignments by week and update state
        setWeeks(prevWeeks => 
          prevWeeks.map(week => {
            const weekAssignments = fetchedAssignments.filter(assignment => {
              const assignmentDate = new Date(assignment.date);
              const weekDate = new Date(week.date);
              return assignmentDate.getDate() === weekDate.getDate() &&
                     assignmentDate.getMonth() === weekDate.getMonth() &&
                     assignmentDate.getFullYear() === weekDate.getFullYear();
            });

            const pendingAssignments = SERVICE_ROLES.reduce((acc, role) => {
              const assignment = weekAssignments.find(a => a.role === role);
              return { ...acc, [role]: assignment?.userId || null };
            }, {} as Record<ServiceRole, string | null>);

            return {
              ...week,
              assignments: weekAssignments,
              pendingAssignments
            };
          })
        );
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, canAssignRoles, weeks[0]?.date]);

  const handleAssignmentChange = (weekIndex: number, role: ServiceRole, userId: string | null) => {
    if (!canAssignRoles) return;

    setWeeks(prevWeeks => 
      prevWeeks.map((week, index) => 
        index === weekIndex
          ? {
              ...week,
              pendingAssignments: {
                ...week.pendingAssignments,
                [role]: userId
              }
            }
          : week
      )
    );
  };

  const handleSave = async (weekIndex: number) => {
    if (!user || !canAssignRoles) return;

    try {
      setLoading(true);
      setError(null);

      const week = weeks[weekIndex];
      if (!week) return;

      // Delete all existing assignments for this week
      await Promise.all(
        week.assignments.map(assignment => 
          deleteDoc(doc(db, 'serviceAssignments', assignment.id))
        )
      );

      // Create new assignments for all non-null pending assignments
      const newAssignments = await Promise.all(
        Object.entries(week.pendingAssignments).map(async ([role, userId]) => {
          if (!userId) return null;

          const newAssignment = {
            date: Timestamp.fromDate(week.date),
            role: role as ServiceRole,
            userId,
            status: 'awaiting_confirmation',
            assignedBy: user.uid,
            assignedAt: Timestamp.fromDate(new Date()),
          };

          const docRef = await addDoc(collection(db, 'serviceAssignments'), newAssignment);
          return {
            ...newAssignment,
            id: docRef.id,
            date: week.date,
            assignedAt: new Date()
          } as ServiceAssignment;
        })
      );

      // Update local state
      setWeeks(prevWeeks =>
        prevWeeks.map((w, index) =>
          index === weekIndex
            ? {
                ...w,
                assignments: newAssignments.filter((a): a is ServiceAssignment => a !== null),
                isEditing: false
              }
            : w
        )
      );
    } catch (error) {
      console.error('Failed to save assignments:', error);
      setError('Failed to save assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = (weekIndex: number) => {
    setWeeks(prevWeeks =>
      prevWeeks.map((week, index) =>
        index === weekIndex
          ? {
              ...week,
              isEditing: false,
              pendingAssignments: week.assignments.reduce((acc, assignment) => ({
                ...acc,
                [assignment.role]: assignment.userId
              }), { ...week.pendingAssignments })
            }
          : week
      )
    );
  };

  const toggleWeek = (weekIndex: number) => {
    setWeeks(prevWeeks =>
      prevWeeks.map((week, index) =>
        index === weekIndex
          ? { ...week, isExpanded: !week.isExpanded }
          : week
      )
    );
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.displayName || user?.email || 'Unknown User';
  };

  const getStatusStyles = (status?: string) => {
    switch(status) {
      case 'accepted':
        return 'bg-success-bg text-success';
      case 'declined':
        return 'bg-error-bg text-error';
      case 'pending':
      case 'awaiting_confirmation':
        return 'bg-warning-bg text-warning';
      default:
        return '';
    }
  };

  if (authLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <div className="pb-12">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-charcoal">Sunday Service Roles List</h1>
            <Link
              href="/service-roles/history"
              className="inline-flex items-center px-6 py-3 border-2 border-[#70A8A0] text-sm font-semibold rounded-lg text-white bg-[#70A8A0] hover:bg-[#5A8A83] shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#70A8A0]"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Service History
            </Link>
          </div>
        </div>
        
        {error && (
          <div className="bg-error-bg border border-error rounded-md p-4 text-error">
            {error}
          </div>
        )}

        {loading && !weeks.length ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {weeks.map((week, weekIndex) => (
              <div key={week.date.toISOString()} className="bg-card rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => toggleWeek(weekIndex)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-bg-secondary transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {week.isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-text-muted" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-text-muted" />
                    )}
                    <h3 className="text-lg font-medium text-charcoal">
                      {format(week.date, 'MMMM d, yyyy')}
                    </h3>
                  </div>
                  {week.isEditing && (
                    <span className="text-sm text-coral">Unsaved changes</span>
                  )}
                </button>

                {week.isExpanded && (
                  <div className="mt-4">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-gradient-to-r from-coral/5 to-sage/5">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-charcoal uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-charcoal uppercase tracking-wider">
                            Assigned To
                          </th>
                          <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-bold text-charcoal uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {SERVICE_ROLES.map((role) => {
                          const assignment = week.assignments.find(a => a.role === role);
                          return (
                            <tr key={role}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-charcoal">
                                {role}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-charcoal">
                                {canAssignRoles && week.isEditing ? (
                                  <select
                                    value={week.pendingAssignments[role] || ''}
                                    onChange={(e) => handleAssignmentChange(weekIndex, role, e.target.value || null)}
                                    className="mt-1 block w-full sm:w-64 pl-3 pr-10 py-2 text-base text-charcoal border-border bg-card focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                                  >
                                    <option value="">Select a person</option>
                                    {users.map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.displayName || user.email}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div>
                                    {assignment?.userId || week.pendingAssignments[role] ? (
                                      <span className="text-charcoal font-semibold">
                                        {getUserName(assignment?.userId || week.pendingAssignments[role] || '')}
                                      </span>
                                    ) : (
                                      <span className="text-text-muted italic">Not assigned</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-charcoal">
                                {assignment ? (
                                  <div className="flex items-center">
                                    {assignment.status === 'accepted' && (
                                      <>
                                        <CheckCircle className="h-5 w-5 text-success mr-2" />
                                        <span className="text-success font-semibold">Accepted</span>
                                      </>
                                    )}
                                    {assignment.status === 'declined' && (
                                      <>
                                        <XCircle className="h-5 w-5 text-error mr-2" />
                                        <span className="text-error font-semibold">Declined</span>
                                      </>
                                    )}
                                    {assignment.status === 'awaiting_confirmation' && (
                                      <>
                                        <Clock className="h-5 w-5 text-warning mr-2" />
                                        <span className="text-warning font-semibold">Awaiting confirmation</span>
                                      </>
                                    )}
                                    {assignment.status === 'pending' && (
                                      <>
                                        <Clock className="h-5 w-5 text-warning mr-2" />
                                        <span className="text-warning font-semibold">Pending</span>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-text-muted">Not assigned</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {canAssignRoles && (
                      <div className="mt-4 flex justify-end space-x-3 p-4 sm:px-6">
                        {week.isEditing ? (
                          <>
                            <button
                              onClick={() => handleCancel(weekIndex)}
                              className="px-6 py-3 border-2 border-charcoal text-sm font-semibold rounded-lg text-charcoal bg-white hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-charcoal"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSave(weekIndex)}
                              className="px-6 py-3 border-2 border-[#E88B5F] text-sm font-bold rounded-lg text-white bg-[#E88B5F] hover:bg-[#D6714A] shadow-lg hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E88B5F]"
                            >
                              Save Changes
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              const updatedWeeks = [...weeks];
                              updatedWeeks[weekIndex] = {
                                ...updatedWeeks[weekIndex],
                                isEditing: true,
                                pendingAssignments: updatedWeeks[weekIndex].assignments.reduce((acc, assignment) => ({
                                  ...acc,
                                  [assignment.role]: assignment.userId
                                }), { ...updatedWeeks[weekIndex].pendingAssignments })
                              };
                              setWeeks(updatedWeeks);
                            }}
                            className="px-6 py-3 border-2 border-[#E88B5F] text-sm font-bold rounded-lg text-white bg-[#E88B5F] hover:bg-[#D6714A] shadow-lg hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E88B5F]"
                          >
                            Edit Assignments
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 