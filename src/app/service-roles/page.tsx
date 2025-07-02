'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ServiceRole, SERVICE_ROLES, ServiceAssignment } from '@/types/serviceRoles';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, addDoc, Timestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { format, nextSunday, addWeeks } from 'date-fns';
import { ROLE_PERMISSIONS } from '@/types/roles';

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
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'declined':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      case 'pending':
      case 'awaiting_confirmation':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
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
        <div className="text-center pb-12">
          <h1 className="text-3xl font-bold text-white mb-4">Sunday Service Roles List</h1>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-500/50 rounded-md p-4 text-red-600 dark:text-red-200">
            {error}
          </div>
        )}

        {loading && !weeks.length ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D6805F]"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {weeks.map((week, weekIndex) => (
              <div key={week.date.toISOString()} className="bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                <button
                  onClick={() => toggleWeek(weekIndex)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  <div className="flex items-center space-x-2">
                    {week.isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400 dark:text-white/60" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-white/60" />
                    )}
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {format(week.date, 'MMMM d, yyyy')}
                    </h3>
                  </div>
                  {week.isEditing && (
                    <span className="text-sm text-[#D6805F]">Unsaved changes</span>
                  )}
                </button>

                {week.isExpanded && (
                  <div className="mt-4">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Assigned To
                          </th>
                          <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-white/10">
                        {SERVICE_ROLES.map((role) => {
                          const assignment = week.assignments.find(a => a.role === role);
                          return (
                            <tr key={role}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {role}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {canAssignRoles ? (
                                  <select
                                    value={week.pendingAssignments[role] || ''}
                                    onChange={(e) => handleAssignmentChange(weekIndex, role, e.target.value || null)}
                                    className={`mt-1 block w-full sm:w-64 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-white/10 focus:outline-none focus:ring-[#D6805F] focus:border-[#D6805F] sm:text-sm rounded-md ${
                                      week.isEditing 
                                        ? 'bg-white dark:bg-white/5' 
                                        : 'bg-gray-50 dark:bg-white/5 cursor-not-allowed'
                                    } ${
                                      !week.isEditing && assignment && assignment.status && 'sm:hidden' // Hide colored select on desktop
                                    } ${
                                      !week.isEditing && assignment && assignment.status === 'accepted'
                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                        : !week.isEditing && assignment && assignment.status === 'declined'
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                        : !week.isEditing && assignment && (assignment.status === 'pending' || assignment.status === 'awaiting_confirmation')
                                        ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                                        : ''
                                    }`}
                                    disabled={!week.isEditing}
                                  >
                                    <option value="">Select a person</option>
                                    {users.map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.displayName || user.email}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="sm:block">
                                    <span className={`sm:inline ${assignment ? `sm:bg-transparent sm:text-gray-500 dark:sm:text-gray-400 px-2 py-1 rounded-full text-sm ${getStatusStyles(assignment.status)}` : ''}`}>
                                      {getUserName(assignment?.userId || week.pendingAssignments[role] || '')}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {assignment ? (
                                  <div className="flex items-center">
                                    {assignment.status === 'accepted' && (
                                      <>
                                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                        <span className="text-green-500">Accepted</span>
                                      </>
                                    )}
                                    {assignment.status === 'declined' && (
                                      <>
                                        <XCircle className="h-5 w-5 text-red-500 mr-2" />
                                        <span className="text-red-500">Declined</span>
                                      </>
                                    )}
                                    {assignment.status === 'awaiting_confirmation' && (
                                      <>
                                        <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                                        <span className="text-yellow-500">Awaiting confirmation</span>
                                      </>
                                    )}
                                    {assignment.status === 'pending' && (
                                      <>
                                        <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                                        <span className="text-yellow-500">Pending</span>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <span>Not assigned</span>
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
                              className="px-4 py-2 border border-gray-300 dark:border-white/10 text-sm font-medium rounded-md text-gray-700 dark:text-white bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D6805F]"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSave(weekIndex)}
                              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#D6805F] hover:bg-[#D6805F]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D6805F]"
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
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#D6805F] hover:bg-[#D6805F]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D6805F]"
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