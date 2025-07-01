'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/AuthContext';

interface AnnouncementFormProps {
  onSuccess?: () => void;
}

export default function AnnouncementForm({ onSuccess }: AnnouncementFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.isAdmin) {
      setError('Only admins can create announcements');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const announcementData = {
        title,
        content,
        priority,
        createdAt: serverTimestamp(),
        createdBy: {
          uid: userProfile.uid,
          displayName: userProfile.displayName || 'Admin',
        },
        notificationSent: false,
      };

      const docRef = await addDoc(collection(db, 'announcements'), announcementData);

      // Trigger push notification
      try {
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: 'announcements',
            notification: {
              title: `New Announcement: ${title}`,
              body: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
              url: `/announcements#${docRef.id}`,
              data: {
                announcementId: docRef.id,
                priority
              }
            }
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to send push notification:', errorData);
        }
      } catch (notificationError) {
        console.error('Error sending push notification:', notificationError);
      }

      setTitle('');
      setContent('');
      setPriority('low');
      onSuccess?.();
    } catch (error) {
      console.error('Error creating announcement:', error);
      setError('Failed to create announcement. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 p-6 rounded-lg">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-white">
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 block w-full rounded-md bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-coral focus:ring-coral sm:text-sm"
          placeholder="Announcement title"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-white">
          Content
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          className="mt-1 block w-full rounded-md bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-coral focus:ring-coral sm:text-sm"
          placeholder="Announcement content"
        />
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-white">
          Priority
        </label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
          className="mt-1 block w-full rounded-md bg-white/10 border border-white/20 text-white focus:border-coral focus:ring-coral sm:text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-coral hover:bg-coral/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coral disabled:opacity-50"
        >
          {isLoading ? (
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            'Create Announcement'
          )}
        </button>
      </div>
    </form>
  );
} 