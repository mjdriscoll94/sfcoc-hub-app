'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { addVolunteerOpportunity } from '@/lib/firebase/utils';

export default function NewVolunteerOpportunityPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
    maxVolunteers: '',
    status: 'open' as const
  });

  // Redirect if not admin
  if (!userProfile?.isAdmin) {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Convert date and time to timestamp
      const dateTime = new Date(formData.date + 'T' + formData.time);
      
      // Validate the date
      if (dateTime < new Date()) {
        throw new Error('Please select a future date and time');
      }

      await addVolunteerOpportunity({
        title: formData.title,
        description: formData.description,
        dateTime,
        location: formData.location,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || undefined,
        maxVolunteers: parseInt(formData.maxVolunteers, 10),
        status: formData.status,
        createdBy: {
          uid: userProfile.uid,
          displayName: userProfile.displayName || 'Admin'
        }
      });

      // Show success message and redirect
      router.push('/admin');
    } catch (error) {
      console.error('Error creating volunteer opportunity:', error);
      setError(error instanceof Error ? error.message : 'Failed to create volunteer opportunity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Volunteer Opportunity</h1>
      </div>

      <div className="bg-white dark:bg-white/5 rounded-lg p-6 border border-gray-200 dark:border-white/10">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-500/50 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-900 dark:text-white">
              Title
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white shadow-sm focus:border-[#ff7c54] focus:ring-[#ff7c54] sm:text-sm px-3 py-2"
              placeholder="e.g., Sunday Service Setup"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-900 dark:text-white">
              Description
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white shadow-sm focus:border-[#ff7c54] focus:ring-[#ff7c54] sm:text-sm px-3 py-2"
              placeholder="Describe what volunteers will be doing..."
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-900 dark:text-white">
                Date
              </label>
              <input
                type="date"
                id="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1 block w-full rounded-md bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white shadow-sm focus:border-[#ff7c54] focus:ring-[#ff7c54] sm:text-sm px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-900 dark:text-white">
                Time
              </label>
              <input
                type="time"
                id="time"
                required
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="mt-1 block w-full rounded-md bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white shadow-sm focus:border-[#ff7c54] focus:ring-[#ff7c54] sm:text-sm px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-900 dark:text-white">
              Location
            </label>
            <input
              type="text"
              id="location"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="mt-1 block w-full rounded-md bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white shadow-sm focus:border-[#ff7c54] focus:ring-[#ff7c54] sm:text-sm px-3 py-2"
              placeholder="e.g., Church Building"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-900 dark:text-white">
                Contact Email
              </label>
              <input
                type="email"
                id="contactEmail"
                required
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="mt-1 block w-full rounded-md bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white shadow-sm focus:border-[#ff7c54] focus:ring-[#ff7c54] sm:text-sm px-3 py-2"
                placeholder="contact@example.com"
              />
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-900 dark:text-white">
                Contact Phone (Optional)
              </label>
              <input
                type="tel"
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="mt-1 block w-full rounded-md bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white shadow-sm focus:border-[#ff7c54] focus:ring-[#ff7c54] sm:text-sm px-3 py-2"
                placeholder="(555) 555-5555"
              />
            </div>
          </div>

          <div>
            <label htmlFor="maxVolunteers" className="block text-sm font-medium text-gray-900 dark:text-white">
              Maximum Number of Volunteers
            </label>
            <input
              type="number"
              id="maxVolunteers"
              required
              min="1"
              value={formData.maxVolunteers}
              onChange={(e) => setFormData({ ...formData, maxVolunteers: e.target.value })}
              className="mt-1 block w-full rounded-md bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white shadow-sm focus:border-[#ff7c54] focus:ring-[#ff7c54] sm:text-sm px-3 py-2"
              placeholder="e.g., 5"
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-white bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff7c54]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[#ff7c54] hover:bg-[#e66e4a] active:bg-[#cc6242] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff7c54] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? 'Creating...' : 'Create Opportunity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 