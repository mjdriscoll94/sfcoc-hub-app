'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/AuthContext';
import { subscribeToNotifications, unsubscribeFromNotifications, isPushNotificationSupported } from '@/lib/notifications/pushNotifications';
import { BellIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import RichTextContent from '@/components/RichTextContent';
import { Timestamp } from 'firebase/firestore';
import { UserProfile } from '@/types';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'Weekly' | 'KFC' | 'General' | 'Youth' | 'Young Adult';
  createdAt: Timestamp;
  createdBy: {
    uid: string;
    displayName: string;
  };
}

interface UserProfileUpdate {
  notificationsEnabled: boolean;
}

const ANNOUNCEMENT_TYPES = ['All', 'Weekly', 'KFC', 'General', 'Youth', 'Young Adult'] as const;
type FilterType = typeof ANNOUNCEMENT_TYPES[number];

export default function AnnouncementsPage() {
  useEffect(() => {
    document.title = 'Announcements | Sioux Falls Church of Christ';
  }, []);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [expandedAnnouncements, setExpandedAnnouncements] = useState<Set<string>>(new Set());
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<FilterType>('All');
  const { userProfile, updateUserProfile } = useAuth();
  const [notificationSupport, setNotificationSupport] = useState<{
    supported: boolean;
    reason: string;
    isIOS: boolean;
    isPWA: boolean;
    shouldPromptPWA: boolean;
  }>({ supported: false, reason: '', isIOS: false, isPWA: false, shouldPromptPWA: false });

  useEffect(() => {
    const checkSupport = async () => {
      const support = await isPushNotificationSupported();
      setNotificationSupport(support);
    };
    checkSupport();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcementData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(announcementData);
    });

    return () => unsubscribe();
  }, []);

  const filteredAnnouncements = announcements.filter(announcement => 
    selectedType === 'All' || announcement.type === selectedType
  );

  const toggleExpand = (id: string) => {
    setExpandedAnnouncements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSubscriptionToggle = async () => {
    if (isSubscribing || !userProfile) return;
    setIsSubscribing(true);
    setError(null);

    try {
      if (userProfile.notificationsEnabled) {
        await unsubscribeFromNotifications(async (update: Partial<UserProfile>) => {
          await updateUserProfile({ ...userProfile, ...update });
        });
      } else {
        // Check if we need to request permission first
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            throw new Error('Please allow notifications in your browser settings to enable this feature.');
          }
        } else if (Notification.permission === 'denied') {
          throw new Error('Notifications are blocked. Please enable them in your browser settings.');
        }
        
        await subscribeToNotifications(async (update: Partial<UserProfile>) => {
          await updateUserProfile({ ...userProfile, ...update });
        });
      }
    } catch (error) {
      console.error('Subscription error:', error);
      // Extract the most user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to update notification settings';
      setError(errorMessage);
      
      // Ensure the profile is updated to reflect the failed state
      if (userProfile && !userProfile.notificationsEnabled) {
        try {
          await updateUserProfile({ ...userProfile, notificationsEnabled: false });
        } catch (profileError) {
          console.error('Failed to update profile after error:', profileError);
        }
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Weekly':
        return 'bg-info/20 text-info';
      case 'KFC':
        return 'bg-error/20 text-error';
      case 'Youth':
        return 'bg-success/20 text-success';
      case 'Young Adult':
        return 'bg-secondary/20 text-secondary';
      case 'General':
      default:
        return 'bg-muted text-text';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Notification Support Message */}
        {!notificationSupport.supported && notificationSupport.shouldPromptPWA && (
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-warning">Please use this app from your home screen to enable notifications.</p>
          </div>
        )}

        {/* Announcements Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-text uppercase tracking-wide">Announcements</h2>
          <div className="flex items-center space-x-4">
            {error && (
              <p className="text-sm text-error bg-error/10 px-3 py-1 rounded-md">
                {error}
              </p>
            )}
            {userProfile && notificationSupport.supported && (
              <button
                onClick={handleSubscriptionToggle}
                onTouchStart={(e) => e.preventDefault()}
                disabled={isSubscribing}
                type="button"
                title={userProfile.notificationsEnabled ? "Unsubscribe from notifications" : "Subscribe to notifications"}
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-md transition-colors uppercase tracking-wide ${
                  userProfile.notificationsEnabled
                    ? 'bg-error hover:opacity-90 active:opacity-80'
                    : 'bg-primary hover:opacity-90 active:opacity-80'
                } text-on-primary touch-manipulation`}
              >
                {isSubscribing ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
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
                  <div className="flex items-center gap-1">
                    <BellIcon className="h-5 w-5" />
                    {!userProfile.notificationsEnabled && (
                      <PlusIcon className="h-4 w-4" />
                    )}
                  </div>
                )}
                <span className="sr-only">
                  {userProfile.notificationsEnabled
                    ? "Unsubscribe from notifications"
                    : "Subscribe to notifications"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          {ANNOUNCEMENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors uppercase tracking-wide ${
                selectedType === type
                  ? type === 'All'
                    ? 'bg-primary text-on-primary'
                    : getTypeColor(type)
                  : 'bg-muted text-text/60 hover:bg-sage/5'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Announcements List */}
        <div className="space-y-6">
          {filteredAnnouncements.map((announcement) => {
            const isExpanded = expandedAnnouncements.has(announcement.id);
            return (
              <div
                key={announcement.id}
                id={announcement.id}
                className="bg-card rounded-lg shadow-sm overflow-hidden border border-sage/20"
              >
                <button
                  onClick={() => toggleExpand(announcement.id)}
                  className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-text">
                      {announcement.title}
                    </h3>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                          announcement.type
                        )}`}
                      >
                        {announcement.type}
                      </span>
                      {isExpanded ? (
                        <ChevronUpIcon className="h-5 w-5 text-text/40" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-text/40" />
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-text/60">
                    Posted by {announcement.createdBy.displayName} •{' '}
                    {announcement.createdAt?.toDate().toLocaleDateString()}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-6 pb-6">
                    <div className="pt-4 border-t border-sage/20">
                      <RichTextContent content={announcement.content} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredAnnouncements.length === 0 && (
            <p className="text-text/50 text-center py-8">
              {selectedType === 'All' 
                ? 'No announcements yet.'
                : `No ${selectedType} announcements available.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 