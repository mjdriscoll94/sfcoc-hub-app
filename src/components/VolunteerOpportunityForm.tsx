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
    <div className="fixed inset-0 z-[9999] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="volunteer-form-title">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 id="volunteer-form-title" className="text-2xl font-bold text-charcoal">Submit a volunteer opportunity</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-gray-100 hover:text-charcoal focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Close volunteer opportunity form"
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
            <p className="mt-1 text-sm text-info">Fields marked required must be completed.</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-error/10 border border-error/20 rounded-lg">
              <p className="text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-charcoal mb-2">
                Title <span aria-hidden="true">*</span><span className="sr-only"> (required)</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={100}
                className="min-h-11 w-full rounded-lg border border-border bg-white px-4 py-2 text-base text-charcoal focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., Church Cleanup Day"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-charcoal mb-2">
                Description <span aria-hidden="true">*</span><span className="sr-only"> (required)</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={5}
                maxLength={1000}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-charcoal resize-none"
                placeholder="Provide details about the volunteer opportunity..."
              />
              <p className="mt-1 text-xs text-text-muted">
                {formData.description.length}/1000 characters
              </p>
            </div>

            <div>
              <label htmlFor="dateTime" className="block text-sm font-medium text-charcoal mb-2">
                Event date and time <span aria-hidden="true">*</span><span className="sr-only"> (required)</span>
              </label>
              <input
                type="datetime-local"
                id="dateTime"
                name="dateTime"
                value={formData.dateTime}
                onChange={handleChange}
                required
                min={new Date().toISOString().slice(0, 16)}
                className="min-h-11 w-full rounded-lg border border-border bg-white px-4 py-2 text-base text-charcoal focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-charcoal mb-2">
                Location <span aria-hidden="true">*</span><span className="sr-only"> (required)</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                maxLength={200}
                className="min-h-11 w-full rounded-lg border border-border bg-white px-4 py-2 text-base text-charcoal focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., Church Building"
              />
            </div>

            <div>
              <label htmlFor="maxVolunteers" className="block text-sm font-medium text-charcoal mb-2">
                Number of volunteers needed <span aria-hidden="true">*</span><span className="sr-only"> (required)</span>
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
                className="min-h-11 w-full rounded-lg border border-border bg-white px-4 py-2 text-base text-charcoal focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-charcoal mb-2">
                Contact email <span aria-hidden="true">*</span><span className="sr-only"> (required)</span>
              </label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                required
                className="min-h-11 w-full rounded-lg border border-border bg-white px-4 py-2 text-base text-charcoal focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-charcoal mb-2">
                Contact phone <span className="font-normal text-text-muted">(optional)</span>
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                className="min-h-11 w-full rounded-lg border border-border bg-white px-4 py-2 text-base text-charcoal focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 flex-1 rounded-lg border-2 border-border px-4 py-2 font-semibold text-charcoal transition-colors hover:bg-bg-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="min-h-11 flex-1 rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
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

