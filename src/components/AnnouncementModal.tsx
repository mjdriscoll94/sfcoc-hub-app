'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { sendAnnouncementEmail, type EmailSubscriber } from '@/lib/email/emailService';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnnouncementModal({ isOpen, onClose }: AnnouncementModalProps) {
  const { userProfile } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('General');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setIsSending(true);
    setError('');

    try {
      // Create the announcement
      const announcement = {
        title,
        content,
        type,
        createdAt: new Date(),
        createdBy: {
          uid: userProfile.uid,
          displayName: userProfile.displayName || 'Anonymous',
        },
      };

      // Save to Firestore
      await addDoc(collection(db, 'announcements'), announcement);

      // Get all users who are subscribed to announcements
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('emailSubscriptions.announcements', '==', true))
      );

      const subscribers: EmailSubscriber[] = usersSnapshot.docs.map(doc => ({
        email: doc.data().email,
        name: doc.data().displayName,
        emailSubscriptions: doc.data().emailSubscriptions || {},
      }));

      // Send email to subscribers
      await sendAnnouncementEmail(subscribers, title, content);

      // Reset form and close modal
      setTitle('');
      setContent('');
      setType('General');
      onClose();
    } catch (err) {
      console.error('Error creating announcement:', err);
      setError('Failed to create announcement. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1f1f1f] rounded-lg max-w-2xl w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">New Announcement</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-white mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#ff7c54] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-white mb-1">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#ff7c54] focus:border-transparent"
            >
              <option>General</option>
              <option>Important</option>
              <option>Event</option>
              <option>Prayer Request</option>
            </select>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-white mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#ff7c54] focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-500/50 rounded-md">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-white hover:bg-white/5 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-4 py-2 bg-[#ff7c54] text-white rounded-md hover:bg-[#ff7c54]/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending...' : 'Send Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 