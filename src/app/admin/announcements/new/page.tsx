'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import RichTextEditor from '@/components/RichTextEditor';
import { sendAnnouncementEmail, type EmailSubscriber } from '@/lib/email/emailService';
import BackButton from '@/components/BackButton';

type AnnouncementType = 'Weekly' | 'KFC' | 'General' | 'Youth' | 'Young Adult';

// Define TipTap document type
type TipTapContent = {
  type: string;
  content: Array<{
    type: string;
    attrs?: { level?: number };
    content?: Array<{ type: string; text: string }>;
  }>;
};

export default function NewAnnouncementPage() {
  useEffect(() => {
    document.title = 'New Announcement | Sioux Falls Church of Christ';
  }, []);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<string | TipTapContent>('');
  const [type, setType] = useState<AnnouncementType>('General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [userProfile, router]);

  if (!userProfile) {
    return null; // Or a loading spinner
  }

  const sendNotification = async (announcement: { title: string; content: string; type: string }) => {
    try {
      // Strip HTML tags for notification body
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = announcement.content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      
      // Truncate content for notification
      const truncatedContent = plainText.length > 100 
        ? plainText.substring(0, 97) + '...'
        : plainText;

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: 'announcements',
          notification: {
            title: `New ${announcement.type}: ${announcement.title}`,
            body: truncatedContent,
            url: '/announcements',
          },
        }),
      });

      if (!response.ok) {
        console.error('Failed to send notification:', await response.text());
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowSuccess(false);
    setIsSubmitting(true);

    try {
      // Create the announcement data
      const announcementData = {
        title,
        content: typeof content === 'string' ? content.trim() : JSON.stringify(content),
        type,
        createdAt: serverTimestamp(),
        createdBy: {
          uid: userProfile.uid,
          displayName: userProfile.displayName || 'Unknown'
        }
      };

      // Create the announcement
      const docRef = await addDoc(collection(db, 'announcements'), announcementData);
      console.log('Created announcement with ID:', docRef.id);

      // Get all users who are subscribed to announcements
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), where('emailSubscriptions.announcements', '==', true))
      );

      console.log('Found subscribed users:', usersSnapshot.docs.length);

      const subscribers: EmailSubscriber[] = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Subscriber data:', {
          email: data.email,
          name: data.displayName,
          subscriptions: data.emailSubscriptions,
        });
        return {
          email: data.email,
          name: data.displayName,
          emailSubscriptions: data.emailSubscriptions || {},
        };
      });

      if (subscribers.length === 0) {
        console.log('No subscribers found for announcements');
      } else {
        console.log(`Attempting to send email to ${subscribers.length} subscribers`);
      }

      try {
        // Send email to subscribers
        const emailContent = typeof content === 'string' ? content : JSON.stringify(content);
        const emailResult = await sendAnnouncementEmail(subscribers, title, emailContent);
        console.log('Email sending result:', emailResult);
      } catch (emailError) {
        console.error('Error sending announcement email:', emailError);
      }

      // Send push notification
      await sendNotification({
        title,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        type
      });

      // Show success message
      setShowSuccess(true);

      // Wait a moment before redirecting
      setTimeout(() => {
        router.push('/admin');
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error('Error creating announcement:', error);
      setError('Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center">
        <BackButton className="mr-4" />
        <h1 className="text-3xl font-bold text-charcoal">New Announcement</h1>
      </div>
      <div className="bg-card rounded-lg p-6 border-2 border-border shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-200 p-3 rounded-md">
              {error}
            </div>
          )}

          {showSuccess && (
            <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-500/50 text-green-600 dark:text-green-200 p-3 rounded-md">
              Announcement created successfully! Redirecting...
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-charcoal">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 text-charcoal shadow-sm focus:border-coral focus:ring-coral sm:text-sm px-4 py-2"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-charcoal">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as AnnouncementType)}
              className="mt-1 block w-full rounded-md bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 text-charcoal shadow-sm focus:border-coral focus:ring-coral sm:text-sm px-4 py-2"
            >
              <option value="General">General</option>
              <option value="KFC">KFC</option>
              <option value="Weekly">Weekly</option>
              <option value="Young Adult">Young Adult</option>
              <option value="Youth">Youth</option>
            </select>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-charcoal mb-1">
              Content
            </label>
            <RichTextEditor content={content} onChange={setContent} />
          </div>

          {/* Templates Section */}
          <div>
            <h2 className="text-sm font-medium text-charcoal mb-2">Templates</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const template = {
                    type: 'doc',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Church Family,' }]
                      },
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '\u200B' }]
                      },
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Here are some things to keep in mind this week:' }]
                      },
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '\u200B' }]
                      },
                      {
                        type: 'heading',
                        attrs: { level: 2 },
                        content: [{ type: 'text', text: 'Birthdays and Anniversaries:' }]
                      },
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '\u200B' }]
                      },
                      {
                        type: 'heading',
                        attrs: { level: 2 },
                        content: [{ type: 'text', text: 'Announcements:' }]
                      },
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: '\u200B' }]
                      }
                    ]
                  };
                  
                  // Set content first, then type
                  setContent(template);
                  requestAnimationFrame(() => {
                    setType('Weekly');
                  });
                }}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-md text-charcoal"
              >
                Weekly Announcement
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-white bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coral"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || showSuccess}
              className="px-4 py-2 text-sm font-medium text-white bg-[#ff7c54] hover:bg-[#e66e4a] active:bg-[#cc6242] rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff7c54] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? 'Creating...' : 'Create Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 