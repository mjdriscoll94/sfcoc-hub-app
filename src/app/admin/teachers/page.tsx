'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TeacherAssignment, TeachingSchedule, Quarter, ClassType, AgeGroup, Teacher } from '@/types';
import { ROLE_PERMISSIONS } from '@/types/roles';
import TeacherForm from '@/components/TeacherForm';

const QUARTERS: Quarter[] = ['Fall', 'Winter', 'Spring', 'Summer'];
const SUNDAY_CLASSES: AgeGroup[] = ['Cradle Roll', 'Toddlers', 'Elementary A', 'Elementary B', 'Middle School', 'High School'];
const WEDNESDAY_CLASSES: AgeGroup[] = ['Toddlers', 'Elementary A', 'Elementary B', 'Middle School', 'High School'];
const DECORATOR_CLASSES: AgeGroup[] = ['Decorators'];

export default function TeacherManagement() {
  useEffect(() => {
    document.title = 'Teacher Management | Sioux Falls Church of Christ';
  }, []);

  const { userProfile } = useAuth();
  const [teachingSchedules, setTeachingSchedules] = useState<TeachingSchedule[]>([]);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ schoolYear: string; classType: ClassType; ageGroup: AgeGroup; quarter: Quarter } | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isHelper, setIsHelper] = useState(false);
  const [isSecondChoice, setIsSecondChoice] = useState(false);
  const [notes, setNotes] = useState('');
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const canEdit = userProfile && (userProfile.isAdmin || ROLE_PERMISSIONS[userProfile.role].canAssignServiceRoles);

  // Format phone number as (XXX) XXX-XXXX
  const formatPhoneNumber = (phone: string | undefined): string => {
    if (!phone) return 'Not provided';
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if we have a valid length
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Return as-is if not a standard 10-digit number
    return phone;
  };

  useEffect(() => {
    loadTeachingSchedule();
    loadTeachers();
  }, []);

  const loadTeachingSchedule = async () => {
    try {
      const schedulesRef = collection(db, 'teachingSchedules');
      const q = query(schedulesRef, orderBy('schoolYear', 'desc'));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const schedules = querySnapshot.docs.map(doc => {
          const scheduleData = doc.data() as TeachingSchedule;
          return {
            ...scheduleData,
            id: doc.id,
            assignments: scheduleData.assignments.map(assignment => ({
              ...assignment,
              assignedAt: assignment.assignedAt instanceof Date ? assignment.assignedAt : (assignment.assignedAt as any).toDate(),
              updatedAt: assignment.updatedAt instanceof Date ? assignment.updatedAt : (assignment.updatedAt as any).toDate()
            }))
          };
        });
        
        setTeachingSchedules(schedules);
        
        // Expand the most recent year by default
        if (schedules.length > 0) {
          setExpandedYears(new Set([schedules[0].schoolYear]));
        }
      } else {
        // Create default schedule for 2025-2026
        const defaultSchedule: TeachingSchedule = {
          id: '',
          schoolYear: '2025-2026',
          assignments: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setTeachingSchedules([defaultSchedule]);
        setExpandedYears(new Set(['2025-2026']));
      }
    } catch (error) {
      console.error('Error loading teaching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      console.log('Loading teachers from Firestore...');
      const teachersRef = collection(db, 'teachers');
      const q = query(teachersRef, where('isActive', '==', true), orderBy('lastName'));
      const querySnapshot = await getDocs(q);
      
      console.log('Found', querySnapshot.docs.length, 'teachers');
      
      const teachersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Teacher data:', { id: doc.id, ...data });
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        };
      }) as Teacher[];
      
      console.log('Processed teachers:', teachersData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error loading teachers:', error);
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('index')) {
          console.error('Missing Firestore index. Please deploy indexes using: firebase deploy --only firestore:indexes');
        } else if (error.message.includes('Firebase')) {
          console.error('Firebase configuration error. Please check your environment variables.');
        }
      }
    }
  };

  const toggleYear = (schoolYear: string) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(schoolYear)) {
        newSet.delete(schoolYear);
      } else {
        newSet.add(schoolYear);
      }
      return newSet;
    });
  };

  const createNewSchoolYear = async () => {
    if (!canEdit) return;
    
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const newSchoolYear = `${currentYear}-${nextYear}`;
    
    // Check if year already exists
    if (teachingSchedules.some(s => s.schoolYear === newSchoolYear)) {
      alert(`School year ${newSchoolYear} already exists.`);
      return;
    }
    
    try {
      const newSchedule: TeachingSchedule = {
        id: '',
        schoolYear: newSchoolYear,
        assignments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, 'teachingSchedules'), newSchedule);
      const scheduleWithId = { ...newSchedule, id: docRef.id };
      
      setTeachingSchedules(prev => [scheduleWithId, ...prev].sort((a, b) => b.schoolYear.localeCompare(a.schoolYear)));
      setExpandedYears(new Set([newSchoolYear]));
    } catch (error) {
      console.error('Error creating new school year:', error);
      alert('Failed to create new school year. Please try again.');
    }
  };

  const getSchedule = (schoolYear: string): TeachingSchedule | undefined => {
    return teachingSchedules.find(s => s.schoolYear === schoolYear);
  };

  const getAssignments = (schoolYear: string, classType: ClassType, ageGroup: AgeGroup, quarter: Quarter): TeacherAssignment[] => {
    const schedule = getSchedule(schoolYear);
    if (!schedule) return [];
    return schedule.assignments.filter(
      assignment => 
        assignment.classType === classType && 
        assignment.ageGroup === ageGroup && 
        assignment.quarter === quarter
    );
  };

  const handleEditCell = (schoolYear: string, classType: ClassType, ageGroup: AgeGroup, quarter: Quarter) => {
    if (!canEdit) return;
    
    setEditingCell({ schoolYear, classType, ageGroup, quarter });
    
    // Reset form for adding a new teacher
    setSelectedTeacherId('');
    setIsHelper(false);
    setIsSecondChoice(false);
    setNotes('');
  };

  const handleTeacherSave = async (teacher: Teacher) => {
    setTeachers(prev => {
      const existingIndex = prev.findIndex(t => t.id === teacher.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = teacher;
        return updated;
      } else {
        return [...prev, teacher];
      }
    });
    setShowTeacherForm(false);
    setEditingTeacher(null);
    
    // Reload teachers to ensure we have the latest data
    await loadTeachers();
  };

  const handleTeacherCancel = () => {
    setShowTeacherForm(false);
    setEditingTeacher(null);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setShowTeacherForm(true);
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    if (!canEdit) return;
    
    if (!confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
      return;
    }

    try {
      const teacherRef = doc(db, 'teachers', teacherId);
      await deleteDoc(teacherRef);
      
      // Remove from local state
      setTeachers(prev => prev.filter(t => t.id !== teacherId));
    } catch (error) {
      console.error('Error deleting teacher:', error);
      alert('Failed to delete teacher. Please try again.');
    }
  };

  const handleSaveAssignment = async () => {
    if (!editingCell || !userProfile || !selectedTeacherId) return;

    const schedule = getSchedule(editingCell.schoolYear);
    if (!schedule) return;

    try {
      const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
      const teacherName = selectedTeacher ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` : '';

      // Create new assignment (always add, never replace)
      const newAssignment = {
        id: Date.now().toString(),
        classType: editingCell.classType,
        ageGroup: editingCell.ageGroup,
        quarter: editingCell.quarter,
        teacherName: teacherName,
        isHelper,
        isSecondChoice,
        notes: notes.trim(),
        assignedBy: userProfile.uid,
        assignedAt: new Date(),
        updatedAt: new Date()
      };

      const updatedAssignments = [...schedule.assignments, newAssignment];
      const updatedSchedule = { ...schedule, assignments: updatedAssignments, updatedAt: new Date() };
      
      // Update in Firestore
      if (schedule.id) {
        const scheduleRef = doc(db, 'teachingSchedules', schedule.id);
        await updateDoc(scheduleRef, {
          assignments: updatedAssignments,
          updatedAt: new Date()
        });
      } else {
        // Create new schedule document
        const newSchedule = { ...updatedSchedule, createdAt: new Date() };
        const docRef = await addDoc(collection(db, 'teachingSchedules'), newSchedule);
        updatedSchedule.id = docRef.id;
      }

      // Update local state
      setTeachingSchedules(prev => prev.map(s => 
        s.schoolYear === editingCell.schoolYear ? updatedSchedule : s
      ));

      // Reset form but keep cell in edit mode
      setSelectedTeacherId('');
      setIsHelper(false);
      setIsSecondChoice(false);
      setNotes('');
    } catch (error) {
      console.error('Error saving assignment:', error);
    }
  };

  const handleDeleteAssignment = async (schoolYear: string, assignmentId: string) => {
    if (!canEdit) return;

    const schedule = getSchedule(schoolYear);
    if (!schedule) return;

    try {
      const updatedAssignments = schedule.assignments.filter(a => a.id !== assignmentId);
      const updatedSchedule = { ...schedule, assignments: updatedAssignments, updatedAt: new Date() };
      
      // Update in Firestore
      if (schedule.id) {
        const scheduleRef = doc(db, 'teachingSchedules', schedule.id);
        await updateDoc(scheduleRef, {
          assignments: updatedAssignments,
          updatedAt: new Date()
        });
      }

      // Update local state
      setTeachingSchedules(prev => prev.map(s => 
        s.schoolYear === schoolYear ? updatedSchedule : s
      ));
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setSelectedTeacherId('');
    setIsHelper(false);
    setIsSecondChoice(false);
    setNotes('');
  };

  const renderClassTable = (schoolYear: string, classType: ClassType, classes: AgeGroup[], title: string) => (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-charcoal mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-sm font-medium text-charcoal border-r border-gray-300">
                {classType === 'Decorators' ? 'Sunday' : 'Class'}
              </th>
              {QUARTERS.map(quarter => (
                <th key={quarter} className="px-4 py-2 text-center text-sm font-medium text-charcoal border-r border-gray-300">
                  {quarter}
                  <br />
                  <span className="text-xs text-gray-500">
                    {quarter === 'Fall' ? 'Sep-Nov' : 
                     quarter === 'Winter' ? 'Dec-Feb' :
                     quarter === 'Spring' ? 'March-May' : 'June-Aug'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.map(ageGroup => (
              <tr key={ageGroup} className="border-t border-gray-300">
                <td className="px-4 py-2 font-medium text-charcoal border-r border-gray-300">
                  {ageGroup}
                </td>
                {QUARTERS.map(quarter => {
                  const assignments = getAssignments(schoolYear, classType, ageGroup, quarter);
                  const isEditing = editingCell?.schoolYear === schoolYear &&
                                 editingCell?.classType === classType && 
                                 editingCell?.ageGroup === ageGroup && 
                                 editingCell?.quarter === quarter;
                  
                  return (
                    <td key={quarter} className="px-4 py-2 border-r border-gray-300 min-w-[180px] align-top">
                      <div className="space-y-2">
                        {/* Show existing assignments */}
                        {assignments.map((assignment) => (
                          <div key={assignment.id} className="bg-[#8FC4BC]/20 border-2 border-[#70A8A0] rounded p-2 text-left">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 text-sm">
                                <div className="font-medium text-[#2F3E46]">
                                  {assignment.teacherName}
                                  {assignment.isHelper && <span className="text-xs text-blue-600 ml-1">*</span>}
                                  {assignment.isSecondChoice && <span className="text-xs text-orange-600 ml-1">2nd</span>}
                                </div>
                                {assignment.notes && (
                                  <div className="text-xs text-[#5A6A74] mt-1">
                                    {assignment.notes}
                                  </div>
                                )}
                              </div>
                              {canEdit && (
                                <button
                                  onClick={() => handleDeleteAssignment(schoolYear, assignment.id)}
                                  className="text-red-600 hover:text-red-800 text-xs ml-2 font-bold"
                                  title="Remove teacher"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Add new teacher form */}
                        {isEditing ? (
                          <div className="space-y-2 border-2 border-primary rounded p-2 bg-primary/5">
                            <select
                              value={selectedTeacherId}
                              onChange={(e) => setSelectedTeacherId(e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-border rounded bg-card text-charcoal"
                              autoFocus
                            >
                              <option value="">Select a teacher</option>
                              {teachers.map(teacher => (
                                <option key={teacher.id} value={teacher.id}>
                                  {teacher.firstName} {teacher.lastName}
                                </option>
                              ))}
                            </select>
                            <div className="flex flex-col space-y-1">
                              <label className="flex items-center text-xs text-text">
                                <input
                                  type="checkbox"
                                  checked={isHelper}
                                  onChange={(e) => setIsHelper(e.target.checked)}
                                  className="mr-1"
                                />
                                Helper
                              </label>
                              <label className="flex items-center text-xs text-text">
                                <input
                                  type="checkbox"
                                  checked={isSecondChoice}
                                  onChange={(e) => setIsSecondChoice(e.target.checked)}
                                  className="mr-1"
                                />
                                2nd Choice
                              </label>
                            </div>
                            <input
                              type="text"
                              placeholder="Notes (optional)"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-border rounded bg-card text-charcoal"
                            />
                            <div className="flex space-x-1">
                              <button
                                onClick={handleSaveAssignment}
                                disabled={!selectedTeacherId}
                                className="flex-1 px-2 py-1 text-xs bg-[#E88B5F] text-white rounded hover:bg-[#D6714A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                Add
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="flex-1 px-2 py-1 text-xs bg-white text-black border-2 border-black rounded hover:bg-gray-100 transition-colors"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditCell(schoolYear, classType, ageGroup, quarter)}
                            className="w-full px-2 py-2 text-xs text-primary border border-primary/30 rounded hover:bg-primary/10 transition-colors"
                          >
                            + Add Teacher
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-charcoal mb-4">Teacher Management</h1>
        <p className="text-gray-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2 uppercase tracking-wide">
          Teacher's Calendar
        </h1>
        <p className="text-text/70 uppercase tracking-wide">
          Manage quarterly teaching assignments for Sunday classes, Wednesday classes, and decorators.
        </p>
      </div>

      {/* Teacher Management Section - Always Visible */}
      <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-text uppercase tracking-wide">Teacher Management</h2>
          <button
            onClick={() => setShowTeacherForm(true)}
            className="px-4 py-2 bg-primary text-on-primary rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus-ring uppercase tracking-wide"
          >
            Add New Teacher
          </button>
        </div>

        {showTeacherForm && (
          <div className="mb-6 p-4 bg-sage/5 rounded-lg border border-sage/20">
            <h3 className="text-lg font-medium text-text mb-4 uppercase tracking-wide">
              {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
            </h3>
            <TeacherForm
              teacher={editingTeacher}
              onSave={handleTeacherSave}
              onCancel={handleTeacherCancel}
              isEditing={!!editingTeacher}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-sage/20">
            <thead>
              <tr className="bg-sage/10">
                <th className="px-4 py-2 text-left text-sm font-medium text-text border-r border-sage/20 uppercase tracking-wide">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-text border-r border-sage/20 uppercase tracking-wide">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-text border-r border-sage/20 uppercase tracking-wide">
                  Phone
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-text border-r border-sage/20 uppercase tracking-wide">
                  Gender
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-text uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(teacher => (
                <tr key={teacher.id} className="border-t border-sage/20 hover:bg-sage/5">
                  <td className="px-4 py-2 font-medium text-text border-r border-sage/20">
                    {teacher.firstName} {teacher.lastName}
                  </td>
                  <td className="px-4 py-2 text-text/70 border-r border-sage/20">
                    {teacher.email}
                  </td>
                  <td className="px-4 py-2 text-text/70 border-r border-sage/20">
                    {formatPhoneNumber(teacher.phoneNumber)}
                  </td>
                  <td className="px-4 py-2 text-text/70 border-r border-sage/20">
                    {teacher.gender}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleEditTeacher(teacher)}
                        className="px-3 py-1 text-sm bg-[#E88B5F] text-white rounded hover:bg-[#D6714A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E88B5F] uppercase tracking-wide transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(teacher.id)}
                        className="px-3 py-1 text-sm bg-white text-red-600 border-2 border-red-600 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 uppercase tracking-wide transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text/50">
                    No teachers found. Add your first teacher to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* School Year Assignments - Collapsible */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-charcoal">Teaching Assignments by Year</h2>
          {canEdit && (
            <button
              onClick={createNewSchoolYear}
              className="px-4 py-2 bg-[#70A8A0] text-white font-semibold rounded-lg hover:bg-[#5A8A83] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#70A8A0] transition-colors"
            >
              + Create New School Year
            </button>
          )}
        </div>

        {teachingSchedules.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-sage/20">
            <p className="text-text/50">No school years found. Create your first school year to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {teachingSchedules.map((schedule) => {
              const isExpanded = expandedYears.has(schedule.schoolYear);
              
              return (
                <div key={schedule.schoolYear} className="bg-white rounded-lg overflow-hidden">
                  {/* Year Header - Clickable to expand/collapse */}
                  <button
                    onClick={() => toggleYear(schedule.schoolYear)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-sage/5 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <svg className="w-6 h-6 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                      <h3 className="text-xl font-bold text-charcoal">School Year {schedule.schoolYear}</h3>
                    </div>
                    <div className="text-sm text-text/50">
                      {schedule.assignments.length} {schedule.assignments.length === 1 ? 'assignment' : 'assignments'}
                    </div>
                  </button>

                  {/* Year Content - Collapsible */}
                  {isExpanded && (
                    <div className="px-6 pb-6">
                      <div className="mb-4 pt-2">
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-medium">*</span> Teacher's Helper</p>
                          <p><span className="font-medium">2nd</span> Second choice</p>
                        </div>
                      </div>

                      {renderClassTable(schedule.schoolYear, 'Sunday', SUNDAY_CLASSES, 'Sunday Classes')}
                      {renderClassTable(schedule.schoolYear, 'Wednesday', WEDNESDAY_CLASSES, 'Wednesday Classes')}
                      {renderClassTable(schedule.schoolYear, 'Decorators', DECORATOR_CLASSES, 'Sunday Decorators')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
