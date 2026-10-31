'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ServiceRole, SERVICE_ROLES, ServiceAssignment, type ServiceRoleParticipant } from '@/types/serviceRoles';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, addDoc, Timestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, UserPlus } from 'lucide-react';
import { format, nextSunday, addWeeks } from 'date-fns';
import { ROLE_PERMISSIONS } from '@/types/roles';
import Link from 'next/link';
import { RequiredFieldIndicator, RequiredFieldsNote } from '@/components/forms/FieldRequirement';

interface WeekData {
  date: Date;
  assignments: ServiceAssignment[];
  pendingAssignments: Record<ServiceRole, string | null>;
  isEditing: boolean;
  isExpanded: boolean;
}

function AssignmentStatus({ status }: { status?: ServiceAssignment['status'] }) {
  if (status === 'accepted') {
    return <span className="inline-flex items-center gap-2 font-semibold text-success"><CheckCircle aria-hidden="true" className="h-5 w-5" />Accepted</span>;
  }
  if (status === 'declined') {
    return <span className="inline-flex items-center gap-2 font-semibold text-error"><XCircle aria-hidden="true" className="h-5 w-5" />Declined</span>;
  }
  if (status === 'awaiting_confirmation') {
    return <span className="inline-flex items-center gap-2 font-semibold text-warning"><Clock aria-hidden="true" className="h-5 w-5" />Awaiting confirmation</span>;
  }
  if (status === 'pending') {
    return <span className="inline-flex items-center gap-2 font-semibold text-warning"><Clock aria-hidden="true" className="h-5 w-5" />Pending</span>;
  }
  return <span className="text-text-muted">Not assigned</span>;
}

export default function ServiceRolesPage() {
  useEffect(() => {
    document.title = 'Service Roles | Sioux Falls Church of Christ';
  }, []);

  const { user, userProfile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ServiceRoleParticipant[]>([]);
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [addParticipantName, setAddParticipantName] = useState('');
  const [addParticipantEmail, setAddParticipantEmail] = useState('');
  const [addParticipantRoles, setAddParticipantRoles] = useState<ServiceRole[]>([]);
  const [addParticipantSaving, setAddParticipantSaving] = useState(false);
  const [addParticipantError, setAddParticipantError] = useState<string | null>(null);
  const firstWeekDate = weeks[0]?.date;
  const lastWeekDate = weeks[weeks.length - 1]?.date;

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
        // Fetch service role participants (dropdown list) if can assign roles
        if (canAssignRoles) {
          const participantsRef = collection(db, 'serviceRoleParticipants');
          const participantsSnapshot = await getDocs(participantsRef);
          const fetchedParticipants = participantsSnapshot.docs.map(d => ({
            id: d.id,
            name: d.data().name ?? '',
            email: d.data().email ?? '',
            rolePreferences: (d.data().rolePreferences as ServiceRole[]) ?? []
          })) as ServiceRoleParticipant[];
          setParticipants(fetchedParticipants.sort((a, b) => a.name.localeCompare(b.name)));
        }

        // Fetch assignments for all weeks
        const firstSunday = firstWeekDate;
        const lastSunday = lastWeekDate;

        if (!firstSunday || !lastSunday) {
          setLoading(false);
          return;
        }

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
  }, [user, canAssignRoles, firstWeekDate, lastWeekDate]);

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
      setSuccessMessage(null);

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
          
          // Send email notification to the assigned user
          try {
            await fetch('/api/service-roles/send-assignment-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                assignmentId: docRef.id,
                userId,
                role,
                date: week.date.toISOString(),
              }),
            });
            console.log(`Email sent for assignment: ${role} to user ${userId}`);
          } catch (emailError) {
            console.error('Failed to send assignment email:', emailError);
            // Don't fail the whole operation if email fails
          }
          
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
      setSuccessMessage(`Assignments for ${format(week.date, 'MMMM d, yyyy')} were saved.`);
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

  const getParticipantName = (participantId: string) => {
    const p = participants.find(x => x.id === participantId);
    return p ? (p.name || p.email || 'Unknown') : 'Unknown';
  };

  const toggleAddParticipantRole = (role: ServiceRole) => {
    setAddParticipantRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addParticipantName.trim() || !addParticipantEmail.trim()) {
      setAddParticipantError('Name and email are required.');
      return;
    }
    setAddParticipantError(null);
    setAddParticipantSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'serviceRoleParticipants'), {
        name: addParticipantName.trim(),
        email: addParticipantEmail.trim().toLowerCase(),
        rolePreferences: addParticipantRoles,
      });
      setParticipants(prev => [...prev, {
        id: docRef.id,
        name: addParticipantName.trim(),
        email: addParticipantEmail.trim().toLowerCase(),
        rolePreferences: addParticipantRoles,
      }].sort((a, b) => a.name.localeCompare(b.name)));
      setAddParticipantName('');
      setAddParticipantEmail('');
      setAddParticipantRoles([]);
      setShowAddParticipant(false);
    } catch (err) {
      console.error('Failed to add participant:', err);
      setAddParticipantError('Failed to add person. Please try again.');
    } finally {
      setAddParticipantSaving(false);
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
        <header>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-3xl font-bold text-charcoal">Sunday Service Roles</h1>
              <p className="mt-2 max-w-2xl text-text-light">View assignments for the next four Sundays and see whether each person has responded.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {canAssignRoles && (
                <button
                  type="button"
                  onClick={() => setShowAddParticipant(true)}
                  className="inline-flex min-h-11 items-center rounded-lg border-2 border-charcoal bg-white px-4 py-2 text-sm font-semibold text-charcoal transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-charcoal focus:ring-offset-2"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add person
                </button>
              )}
              <Link
                href="/service-roles/history"
                className="inline-flex min-h-11 items-center rounded-lg border-2 border-[#70A8A0] bg-[#70A8A0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#5A8A83] focus:outline-none focus:ring-2 focus:ring-[#70A8A0] focus:ring-offset-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Past assignments
              </Link>
            </div>
          </div>
        </header>

        {canAssignRoles && showAddParticipant && (
          <div className="bg-white rounded-lg border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-charcoal mb-4">Add person to assignment list</h2>
            <form onSubmit={handleAddParticipant} className="space-y-4">
              <RequiredFieldsNote />
              <div>
                <label htmlFor="add-name" className="block text-sm font-medium text-charcoal mb-1">Name<RequiredFieldIndicator /></label>
                <input
                  id="add-name"
                  type="text"
                  value={addParticipantName}
                  onChange={(e) => setAddParticipantName(e.target.value)}
                  required
                  className="block min-h-11 w-full max-w-md rounded-md border border-border bg-card px-3 py-2 text-base text-charcoal focus:border-primary focus:ring-primary"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label htmlFor="add-email" className="block text-sm font-medium text-charcoal mb-1">Email<RequiredFieldIndicator /></label>
                <input
                  id="add-email"
                  type="email"
                  value={addParticipantEmail}
                  onChange={(e) => setAddParticipantEmail(e.target.value)}
                  required
                  className="block min-h-11 w-full max-w-md rounded-md border border-border bg-card px-3 py-2 text-base text-charcoal focus:border-primary focus:ring-primary"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-charcoal mb-2">Role preferences (optional)</span>
                <div className="flex flex-wrap gap-3">
                  {SERVICE_ROLES.map((role) => (
                    <label key={role} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addParticipantRoles.includes(role)}
                        onChange={() => toggleAddParticipantRole(role)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-charcoal">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
              {addParticipantError && (
                <p className="text-sm text-error">{addParticipantError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={addParticipantSaving}
                  className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {addParticipantSaving ? 'Adding…' : 'Add person'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddParticipant(false);
                    setAddParticipantError(null);
                    setAddParticipantName('');
                    setAddParticipantEmail('');
                    setAddParticipantRoles([]);
                  }}
                  className="px-4 py-2 border border-border text-charcoal text-sm font-semibold rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-charcoal"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div role="alert" className="bg-error-bg border border-error rounded-md p-4 text-error">
            {error}
          </div>
        )}

        {successMessage && (
          <div role="status" className="rounded-md border border-success bg-success-bg p-4 text-success">
            {successMessage}
          </div>
        )}

        {loading && !weeks.length ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {weeks.map((week, weekIndex) => (
              <div key={week.date.toISOString()} className="bg-white rounded-lg border border-border overflow-hidden">
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
                                    aria-label={`Person assigned to ${role}`}
                                    value={week.pendingAssignments[role] || ''}
                                    onChange={(e) => handleAssignmentChange(weekIndex, role, e.target.value || null)}
                                    className="mt-1 block w-full sm:w-64 pl-3 pr-10 py-2 text-base text-charcoal border-border bg-card focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                                  >
                                    <option value="">Select a person</option>
                                    {participants.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name || p.email}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div>
                                    {assignment?.userId || week.pendingAssignments[role] ? (
                                      <span className="text-charcoal font-semibold">
                                        {getParticipantName(assignment?.userId || week.pendingAssignments[role] || '')}
                                      </span>
                                    ) : (
                                      <span className="text-text-muted italic">Not assigned</span>
                                    )}
                                    <div className="mt-2 sm:hidden">
                                      <AssignmentStatus status={assignment?.status} />
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-charcoal">
                                <AssignmentStatus status={assignment?.status} />
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
                              Save assignments
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
                            Edit assignments
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
