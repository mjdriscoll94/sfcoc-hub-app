'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TeacherAssignment, TeachingSchedule, Quarter, ClassType, AgeGroup } from '@/types';
import { ROLE_PERMISSIONS } from '@/types/roles';

const QUARTERS: Quarter[] = ['Fall', 'Winter', 'Spring', 'Summer'];
const SUNDAY_CLASSES: AgeGroup[] = ['Cradle Roll', 'Toddlers', 'Elementary A', 'Elementary B', 'Middle School', 'High School'];
const WEDNESDAY_CLASSES: AgeGroup[] = ['Toddlers', 'Elementary A', 'Elementary B', 'Middle School', 'High School'];
const DECORATOR_CLASSES: AgeGroup[] = ['Decorators'];

export default function TeacherManagement() {
  const { userProfile } = useAuth();
  const [teachingSchedule, setTeachingSchedule] = useState<TeachingSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ classType: ClassType; ageGroup: AgeGroup; quarter: Quarter } | null>(null);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [isHelper, setIsHelper] = useState(false);
  const [isSecondChoice, setIsSecondChoice] = useState(false);
  const [notes, setNotes] = useState('');

  const canEdit = userProfile && (userProfile.isAdmin || ROLE_PERMISSIONS[userProfile.role].canAssignServiceRoles);

  useEffect(() => {
    loadTeachingSchedule();
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

  const getAssignment = (classType: ClassType, ageGroup: AgeGroup, quarter: Quarter): TeacherAssignment | null => {
    if (!teachingSchedule) return null;
    return teachingSchedule.assignments.find(
      assignment => 
        assignment.classType === classType && 
        assignment.ageGroup === ageGroup && 
        assignment.quarter === quarter
    ) || null;
  };

  const handleEditCell = (classType: ClassType, ageGroup: AgeGroup, quarter: Quarter) => {
    if (!canEdit) return;
    
    const assignment = getAssignment(classType, ageGroup, quarter);
    setEditingCell({ classType, ageGroup, quarter });
    setNewTeacherName(assignment?.teacherName || '');
    setIsHelper(assignment?.isHelper || false);
    setIsSecondChoice(assignment?.isSecondChoice || false);
    setNotes(assignment?.notes || '');
  };

  const handleSaveAssignment = async () => {
    if (!editingCell || !teachingSchedule || !userProfile) return;

    try {
      const assignmentData = {
        classType: editingCell.classType,
        ageGroup: editingCell.ageGroup,
        quarter: editingCell.quarter,
        teacherName: newTeacherName.trim(),
        isHelper,
        isSecondChoice,
        notes: notes.trim(),
        assignedBy: userProfile.uid,
        assignedAt: new Date(),
        updatedAt: new Date()
      };

      if (newTeacherName.trim()) {
        // Update or create assignment
        const existingAssignment = getAssignment(editingCell.classType, editingCell.ageGroup, editingCell.quarter);
        
        if (existingAssignment) {
          // Update existing assignment
          const updatedAssignments = teachingSchedule.assignments.map(assignment =>
            assignment.id === existingAssignment.id
              ? { ...assignmentData, id: existingAssignment.id, assignedAt: existingAssignment.assignedAt }
              : assignment
          );
          
          const updatedSchedule = { ...teachingSchedule, assignments: updatedAssignments, updatedAt: new Date() };
          setTeachingSchedule(updatedSchedule);
          
          // Update in Firestore
          const scheduleRef = doc(db, 'teachingSchedules', teachingSchedule.id);
          await updateDoc(scheduleRef, {
            assignments: updatedAssignments,
            updatedAt: new Date()
          });
        } else {
          // Create new assignment
          const newAssignment = { ...assignmentData, id: Date.now().toString() };
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
        }
      } else {
        // Remove assignment if teacher name is empty
        const updatedAssignments = teachingSchedule.assignments.filter(
          assignment => !(
            assignment.classType === editingCell.classType &&
            assignment.ageGroup === editingCell.ageGroup &&
            assignment.quarter === editingCell.quarter
          )
        );
        
        const updatedSchedule = { ...teachingSchedule, assignments: updatedAssignments, updatedAt: new Date() };
        setTeachingSchedule(updatedSchedule);
        
        // Update in Firestore
        const scheduleRef = doc(db, 'teachingSchedules', teachingSchedule.id);
        await updateDoc(scheduleRef, {
          assignments: updatedAssignments,
          updatedAt: new Date()
        });
      }

      setEditingCell(null);
      setNewTeacherName('');
      setIsHelper(false);
      setIsSecondChoice(false);
      setNotes('');
    } catch (error) {
      console.error('Error saving assignment:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setNewTeacherName('');
    setIsHelper(false);
    setIsSecondChoice(false);
    setNotes('');
  };

  const renderClassTable = (classType: ClassType, classes: AgeGroup[], title: string) => (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                {classType === 'Decorators' ? 'Sunday' : 'Class'}
              </th>
              {QUARTERS.map(quarter => (
                <th key={quarter} className="px-4 py-2 text-center text-sm font-medium text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
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
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-white border-r border-gray-300 dark:border-gray-600">
                  {ageGroup}
                </td>
                {QUARTERS.map(quarter => {
                  const assignment = getAssignment(classType, ageGroup, quarter);
                  const isEditing = editingCell?.classType === classType && 
                                 editingCell?.ageGroup === ageGroup && 
                                 editingCell?.quarter === quarter;
                  
                  return (
                    <td key={quarter} className="px-4 py-2 text-center border-r border-gray-300 dark:border-gray-600 min-w-[120px]">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={newTeacherName}
                            onChange={(e) => setNewTeacherName(e.target.value)}
                            placeholder="Teacher name"
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            autoFocus
                          />
                          <div className="flex flex-col space-y-1">
                            <label className="flex items-center text-xs">
                              <input
                                type="checkbox"
                                checked={isHelper}
                                onChange={(e) => setIsHelper(e.target.checked)}
                                className="mr-1"
                              />
                              Helper
                            </label>
                            <label className="flex items-center text-xs">
                              <input
                                type="checkbox"
                                checked={isSecondChoice}
                                onChange={(e) => setIsSecondChoice(e.target.checked)}
                                className="mr-1"
                              />
                              2nd Choice
                            </label>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={handleSaveAssignment}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            assignment ? 'bg-white dark:bg-gray-800' : 'bg-yellow-100 dark:bg-yellow-900/20'
                          }`}
                          onClick={() => handleEditCell(classType, ageGroup, quarter)}
                        >
                          {assignment ? (
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {assignment.teacherName}
                                {assignment.isHelper && <span className="text-xs text-blue-600 dark:text-blue-400"> *</span>}
                                {assignment.isSecondChoice && <span className="text-xs text-orange-600 dark:text-orange-400"> 2</span>}
                              </div>
                              {assignment.notes && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {assignment.notes}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                              {canEdit ? 'Click to assign' : 'open'}
                            </div>
                          )}
                        </div>
                      )}
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Teacher Management</h1>
        <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Sioux Falls Church of Christ Teacher's Calendar {teachingSchedule?.schoolYear}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage quarterly teaching assignments for Sunday classes, Wednesday classes, and decorators.
        </p>
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
