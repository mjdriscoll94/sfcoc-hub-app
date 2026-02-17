'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

interface PrayerRequestFormProps {
  onSubmit: (data: {
    type: 'prayer' | 'praise';
    title: string;
    description: string;
    isAnonymous: boolean;
    isAdminOnly: boolean;
  }) => void;
  onSuccess?: () => void;
}

export default function PrayerRequestForm({ onSubmit, onSuccess }: PrayerRequestFormProps) {
  const { userProfile } = useAuth();
  const [formData, setFormData] = useState({
    type: 'prayer' as 'prayer' | 'praise',
    title: '',
    description: '',
    isAnonymous: false,
    isAdminOnly: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      await onSubmit(formData);
      
      // Show different messages based on user role
      if (userProfile?.isAdmin) {
        setSubmitMessage({ 
          type: 'success', 
          text: 'Your prayer request has been posted.' 
        });
      } else {
        setSubmitMessage({ 
          type: 'info', 
          text: 'Your prayer request has been submitted for approval. It will be visible once approved by an admin.' 
        });
      }

      // Reset form
      setFormData({
        type: 'prayer',
        title: '',
        description: '',
        isAnonymous: false,
        isAdminOnly: false,
      });

      // Call success callback if provided
      onSuccess?.();
    } catch (error) {
      setSubmitMessage({ 
        type: 'error', 
        text: 'Failed to submit prayer request. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitMessage && (
        <div
          className="rounded-lg p-4 text-sm"
          style={{
            backgroundColor:
              submitMessage.type === 'success'
                ? 'var(--success-bg)'
                : submitMessage.type === 'info'
                  ? 'var(--info-bg)'
                  : 'var(--error-bg)',
            color:
              submitMessage.type === 'success'
                ? 'var(--success)'
                : submitMessage.type === 'info'
                  ? 'var(--info)'
                  : 'var(--error)',
          }}
        >
          <p>{submitMessage.text}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-text">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'prayer' | 'praise' })}
          className="mt-1 block w-full rounded-md border bg-card text-text placeholder:text-text-muted px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          style={{ borderColor: 'var(--border)' }}
        >
          <option value="prayer">Prayer Request</option>
          <option value="praise">Praise Report</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text">Title</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="mt-1 block w-full rounded-md border bg-card text-text placeholder:text-text-muted px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          style={{ borderColor: 'var(--border)' }}
          placeholder={formData.type === 'prayer'
            ? "e.g., Healing for my grandmother"
            : "e.g., Answered prayer for new job"}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text">Description</label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border bg-card text-text placeholder:text-text-muted px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          style={{ borderColor: 'var(--border)' }}
          placeholder={formData.type === 'prayer'
            ? "Please share the details of your prayer request. What specifically would you like others to pray for?"
            : "Share how God has blessed you or answered your prayers. Your testimony can encourage others!"}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="anonymous"
            checked={formData.isAnonymous}
            onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
          />
          <label htmlFor="anonymous" className="ml-2 block text-sm text-text">
            Submit anonymously
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="adminOnly"
            checked={formData.isAdminOnly}
            onChange={(e) => setFormData({ ...formData, isAdminOnly: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
          />
          <label htmlFor="adminOnly" className="ml-2 block text-sm text-text">
            Only admins can see this request
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md text-sm font-medium text-on-primary bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
} 