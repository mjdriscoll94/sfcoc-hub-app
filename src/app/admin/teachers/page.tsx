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
  const { userProfile } = useAuth();
  const [teachingSchedule, setTeachingSchedule] = useState<TeachingSchedule | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ classType: ClassType; ageGroup: AgeGroup; quarter: Quarter } | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isHelper, setIsHelper] = useState(false);
  const [isSecondChoice, setIsSecondChoice] = useState(false);
  const [notes, setNotes] = useState('');
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const canEdit = userProfile && (userProfile.isAdmin || ROLE_PERMISSIONS[userProfile.role].canAssignServiceRoles);

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
        const scheduleData = querySnapshot.docs[0].data() as TeachingSchedule;
        setTeachingSchedule({
          ...scheduleData,
          id: querySnapshot.docs[0].id,
          assignments: scheduleData.assignments.map(assignment => ({
            ...assignment,
            assignedAt: assignment.assignedAt.toDate(),
            updatedAt: assignment.updatedAt.toDate()
          }))
        });
      } else {
        // Create default schedule for 2025-2026
        const defaultSchedule: TeachingSchedule = {
          id: '',
          schoolYear: '2025-2026',
          assignments: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setTeachingSchedule(defaultSchedule);
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

  const getAssignments = (classType: ClassType, ageGroup: AgeGroup, quarter: Quarter): TeacherAssignment[] => {
    if (!teachingSchedule) return [];
    return teachingSchedule.assignments.filter(
      assignment => 
        assignment.classType === classType && 
        assignment.ageGroup === ageGroup && 
        assignment.quarter === quarter
    );
  };

  const handleEditCell = (classType: ClassType, ageGroup: AgeGroup, quarter: Quarter) => {
    if (!canEdit) return;
    
    setEditingCell({ classType, ageGroup, quarter });
    
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

  const handleSaveAssignment = async () => {
    if (!editingCell || !teachingSchedule || !userProfile || !selectedTeacherId) return;

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

      const updatedAssignments = [...teachingSchedule.assignments, newAssignment];
      const updatedSchedule = { ...teachingSchedule, assignments: updatedAssignments, updatedAt: new Date() };
      setTeachingSchedule(updatedSchedule);
      
      // Update in Firestore
      if (teachingSchedule.id) {
        const scheduleRef = doc(db, 'teachingSchedules', teachingSchedule.id);
        await updateDoc(scheduleRef, {
          assignments: updatedAssignments,
          updatedAt: new Date()
        });
      } else {
        // Create new schedule document
        const newSchedule = { ...updatedSchedule, createdAt: new Date() };
        const docRef = await addDoc(collection(db, 'teachingSchedules'), newSchedule);
        setTeachingSchedule({ ...newSchedule, id: docRef.id });
      }

      // Reset form but keep cell in edit mode
      setSelectedTeacherId('');
      setIsHelper(false);
      setIsSecondChoice(false);
      setNotes('');
    } catch (error) {
      console.error('Error saving assignment:', error);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!teachingSchedule || !canEdit) return;

    try {
      const updatedAssignments = teachingSchedule.assignments.filter(a => a.id !== assignmentId);
      const updatedSchedule = { ...teachingSchedule, assignments: updatedAssignments, updatedAt: new Date() };
      setTeachingSchedule(updatedSchedule);
      
      // Update in Firestore
      if (teachingSchedule.id) {
        const scheduleRef = doc(db, 'teachingSchedules', teachingSchedule.id);
        await updateDoc(scheduleRef, {
          assignments: updatedAssignments,
          updatedAt: new Date()
        });
      }
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

  const renderClassTable = (classType: ClassType, classes: AgeGroup[], title: string) => (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-charcoal mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              <th className="px-4 py-2 text-left text-sm font-medium text-charcoal border-r border-gray-300 dark:border-gray-600">
                {classType === 'Decorators' ? 'Sunday' : 'Class'}
              </th>
              {QUARTERS.map(quarter => (
                <th key={quarter} className="px-4 py-2 text-center text-sm font-medium text-charcoal border-r border-gray-300 dark:border-gray-600">
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
              <tr key={ageGroup} className="border-t border-gray-300 dark:border-gray-600">
                <td className="px-4 py-2 font-medium text-charcoal border-r border-gray-300 dark:border-gray-600">
                  {ageGroup}
                </td>
                {QUARTERS.map(quarter => {
                  const assignments = getAssignments(classType, ageGroup, quarter);
                  const isEditing = editingCell?.classType === classType && 
                                 editingCell?.ageGroup === ageGroup && 
                                 editingCell?.quarter === quarter;
                  
                  return (
                    <td key={quarter} className="px-4 py-2 border-r border-gray-300 dark:border-gray-600 min-w-[180px] align-top">
                      <div className="space-y-2">
                        {/* Show existing assignments */}
                        {assignments.map((assignment) => (
                          <div key={assignment.id} className="bg-card border border-sage/20 rounded p-2 text-left">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 text-sm">
                                <div className="font-medium text-charcoal">
                                  {assignment.teacherName}
                                  {assignment.isHelper && <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">*</span>}
                                  {assignment.isSecondChoice && <span className="text-xs text-orange-600 dark:text-orange-400 ml-1">2</span>}
                                </div>
                                {assignment.notes && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {assignment.notes}
                                  </div>
                                )}
                              </div>
                              {canEdit && (
                                <button
                                  onClick={() => handleDeleteAssignment(assignment.id)}
                                  className="text-red-600 hover:text-red-800 text-xs ml-2"
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
                                className="flex-1 px-2 py-1 text-xs bg-success text-white rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Add
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="flex-1 px-2 py-1 text-xs bg-charcoal text-white rounded hover:opacity-90"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditCell(classType, ageGroup, quarter)}
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
        <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2 uppercase tracking-wide">
          Sioux Falls Church of Christ Teacher's Calendar {teachingSchedule?.schoolYear}
        </h1>
        <p className="text-text/70 uppercase tracking-wide">
          Manage quarterly teaching assignments for Sunday classes, Wednesday classes, and decorators.
        </p>
      </div>

      {/* Teacher Management Section */}
      <div className="mb-8 bg-card rounded-lg shadow-sm border border-sage/20 p-6">
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
          <table className="min-w-full bg-card border border-sage/20">
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
                    {teacher.phoneNumber || 'Not provided'}
                  </td>
                  <td className="px-4 py-2 text-text/70 border-r border-sage/20">
                    {teacher.gender}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleEditTeacher(teacher)}
                      className="px-3 py-1 text-sm bg-primary text-on-primary rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus-ring uppercase tracking-wide"
                    >
                      Edit
                    </button>
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

      <div className="mb-6">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p><span className="font-medium">*</span> Teacher's Helper</p>
          <p><span className="font-medium">2</span> Second choice</p>
        </div>
      </div>

      {renderClassTable('Sunday', SUNDAY_CLASSES, 'Sunday Classes')}
      {renderClassTable('Wednesday', WEDNESDAY_CLASSES, 'Wednesday Classes')}
      {renderClassTable('Decorators', DECORATOR_CLASSES, 'Sunday Decorators')}
    </div>
  );
}
