'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

interface VolunteerOpportunityFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function VolunteerOpportunityForm({ onClose, onSuccess }: VolunteerOpportunityFormProps) {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dateTime: '',
    location: '',
    contactEmail: userProfile?.email || '',
    contactPhone: '',
    maxVolunteers: 1,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxVolunteers' ? parseInt(value) || 1 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !userProfile) {
      setError('You must be signed in to create a volunteer opportunity');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert datetime string to Date object
      const dateTime = new Date(formData.dateTime);
      
      if (dateTime < new Date()) {
        setError('Event date must be in the future');
        setLoading(false);
        return;
      }

      const docData = {
        title: formData.title,
        description: formData.description,
        dateTime: Timestamp.fromDate(dateTime),
        location: formData.location,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || null,
        maxVolunteers: formData.maxVolunteers,
        currentVolunteers: 0,
        volunteers: [],
        status: 'open',
        approvalStatus: 'pending', // Requires admin approval
        createdBy: {
          uid: userProfile.uid,
          displayName: userProfile.displayName || user.email || 'Anonymous'
        },
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'volunteerOpportunities'), docData);
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating volunteer opportunity:', err);
      setError(err instanceof Error ? err.message : 'Failed to create volunteer opportunity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] isolate">
      <div className="absolute inset-0 bg-black/50 z-[1]" onClick={onClose}></div>
      <div className="absolute inset-0 flex items-center justify-center p-4 z-[2] pointer-events-none">
        <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-charcoal">Submit Volunteer Opportunity</h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-charcoal transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-4 bg-info/10 border border-info/20 rounded-lg">
            <p className="text-sm text-info">
              Your volunteer opportunity will be reviewed by an administrator before being published.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-error/10 border border-error/20 rounded-lg">
              <p className="text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-charcoal mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={100}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-charcoal"
                placeholder="e.g., Church Cleanup Day"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-charcoal mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={5}
                maxLength={1000}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-charcoal resize-none"
                placeholder="Provide details about the volunteer opportunity..."
              />
              <p className="mt-1 text-xs text-text-muted">
                {formData.description.length}/1000 characters
              </p>
            </div>

            <div>
              <label htmlFor="dateTime" className="block text-sm font-medium text-charcoal mb-2">
                Event Date & Time *
              </label>
              <input
                type="datetime-local"
                id="dateTime"
                name="dateTime"
                value={formData.dateTime}
                onChange={handleChange}
                required
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-charcoal mb-2">
                Location *
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                maxLength={200}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-charcoal"
                placeholder="e.g., Church Building"
              />
            </div>

            <div>
              <label htmlFor="maxVolunteers" className="block text-sm font-medium text-charcoal mb-2">
                Number of Volunteers Needed *
              </label>
              <input
                type="number"
                id="maxVolunteers"
                name="maxVolunteers"
                value={formData.maxVolunteers}
                onChange={handleChange}
                required
                min={1}
                max={100}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-charcoal mb-2">
                Contact Email *
              </label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-charcoal"
              />
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-charcoal mb-2">
                Contact Phone (Optional)
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-charcoal"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border-2 border-border rounded-lg text-charcoal hover:bg-bg-secondary transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}

