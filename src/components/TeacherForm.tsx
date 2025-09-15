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
    gender: teacher?.gender || 'Prefer not to say' as Teacher['gender']
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
          <option value="Prefer not to say">Prefer not to say</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
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
          className="px-4 py-2 text-sm font-medium text-on-primary bg-primary border border-transparent rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
        >
          {loading ? 'Saving...' : (isEditing ? 'Update Teacher' : 'Add Teacher')}
        </button>
      </div>
    </form>
  );
}
