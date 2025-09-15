'use client';

import { useState } from 'react';
import { collection, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Teacher } from '@/types';

interface TeacherFormProps {
  teacher?: Teacher | null;
  onSave: (teacher: Teacher) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function TeacherForm({ teacher, onSave, onCancel, isEditing = false }: TeacherFormProps) {
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
          createdBy: 'system' // This would be replaced with actual user ID in real implementation
        };
        const docRef = await addDoc(collection(db, 'teachers'), newTeacher);
        onSave({ ...newTeacher, id: docRef.id });
      }
    } catch (err) {
      console.error('Error saving teacher:', err);
      setError('Failed to save teacher. Please try again.');
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
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            First Name *
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D6805F] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter first name"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D6805F] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter last name"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D6805F] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter email address"
        />
      </div>

      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D6805F] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter phone number (optional)"
        />
      </div>

      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Gender
        </label>
        <select
          id="gender"
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D6805F] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="Prefer not to say">Prefer not to say</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D6805F]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-[#D6805F] border border-transparent rounded-md hover:bg-[#c57355] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D6805F] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : (isEditing ? 'Update Teacher' : 'Add Teacher')}
        </button>
      </div>
    </form>
  );
}
