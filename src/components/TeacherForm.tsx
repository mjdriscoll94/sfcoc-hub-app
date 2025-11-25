'use client';

import { useState } from 'react';
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Teacher } from '@/types';
import { useAuth } from '@/lib/auth/AuthContext';

interface TeacherFormProps {
  teacher?: Teacher | null;
  onSave: (teacher: Teacher) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function TeacherForm({ teacher, onSave, onCancel, isEditing = false }: TeacherFormProps) {
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState({
    firstName: teacher?.firstName || '',
    lastName: teacher?.lastName || '',
    email: teacher?.email || '',
    phoneNumber: teacher?.phoneNumber || '',
    gender: teacher?.gender || 'Male' as Teacher['gender'],
    preferHelper: teacher?.preferHelper || false,
    preferMainTeacher: teacher?.preferMainTeacher || false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile) {
      setError('You must be logged in to save teachers.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if email already exists (only for new teachers)
      if (!isEditing) {
        const teachersRef = collection(db, 'teachers');
        const q = query(teachersRef, where('email', '==', formData.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          setError('A teacher with this email address already exists.');
          setLoading(false);
          return;
        }
      }

      const teacherData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim() || undefined,
        gender: formData.gender,
        preferHelper: formData.preferHelper,
        preferMainTeacher: formData.preferMainTeacher,
        updatedAt: new Date(),
        isActive: true
      };

      if (isEditing && teacher) {
        // Update existing teacher
        const teacherRef = doc(db, 'teachers', teacher.id);
        await updateDoc(teacherRef, teacherData);
        onSave({ ...teacher, ...teacherData });
      } else {
        // Create new teacher
        const newTeacher = {
          ...teacherData,
          createdAt: new Date(),
          createdBy: userProfile.uid
        };
        console.log('Creating new teacher with data:', newTeacher);
        const docRef = await addDoc(collection(db, 'teachers'), newTeacher);
        console.log('Teacher created with ID:', docRef.id);
        onSave({ ...newTeacher, id: docRef.id });
      }
    } catch (err) {
      console.error('Error saving teacher:', err);
      
      // Check if it's a Firebase configuration error
      if (err instanceof Error && err.message.includes('Firebase')) {
        setError('Firebase is not configured. Please check your environment variables.');
      } else if (err instanceof Error && err.message.includes('permission')) {
        setError('You do not have permission to save teachers. Please contact an administrator.');
      } else {
        setError('Failed to save teacher. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-text mb-1">
            First Name *
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-text focus-ring"
            placeholder="Enter first name"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-text mb-1">
            Last Name *
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-text focus-ring"
            placeholder="Enter last name"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-text focus-ring"
          placeholder="Enter email address"
        />
      </div>

      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-text mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-text focus-ring"
          placeholder="Enter phone number (optional)"
        />
      </div>

      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-text mb-1">
          Gender
        </label>
        <select
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-text focus-ring"
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text mb-2">
          Teaching Preferences
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="preferMainTeacher"
              checked={formData.preferMainTeacher}
              onChange={handleChange}
              className="h-4 w-4 text-[#E88B5F] border-border rounded focus:ring-2 focus:ring-[#E88B5F]"
            />
            <span className="ml-2 text-sm text-text">Prefers Main Teacher role</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="preferHelper"
              checked={formData.preferHelper}
              onChange={handleChange}
              className="h-4 w-4 text-[#E88B5F] border-border rounded focus:ring-2 focus:ring-[#E88B5F]"
            />
            <span className="ml-2 text-sm text-text">Prefers Teacher's Helper role</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-md">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-text bg-card border border-border rounded-md hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus-ring"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-[#E88B5F] border border-transparent rounded-md hover:bg-[#D6714A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E88B5F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : (isEditing ? 'Update Teacher' : 'Add Teacher')}
        </button>
      </div>
    </form>
  );
}
