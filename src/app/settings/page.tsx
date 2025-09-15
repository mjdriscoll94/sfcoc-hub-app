'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const { userProfile, user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const [localSubscriptions, setLocalSubscriptions] = useState({
    announcements: true,
    events: true,
    newsletter: true,
    prayerRequests: false,
    praiseReports: false
  });

  // Initialize local state from userProfile and localStorage
  useEffect(() => {
    if (!user) {
      console.log('Settings: No user found, redirecting to signin');
      router.push('/auth/signin');
      return;
    }

    // Load notification preferences from localStorage
    const storedPreferences = localStorage.getItem('notificationPreferences');
    if (storedPreferences) {
      const preferences = JSON.parse(storedPreferences);
      setLocalSubscriptions(prev => ({
        ...prev,
        prayerRequests: preferences.prayerRequests || false,
        praiseReports: preferences.praiseReports || false
      }));
    }

    if (userProfile?.emailSubscriptions) {
      console.log('Settings: Updating local subscriptions from profile:', userProfile.emailSubscriptions);
      setLocalSubscriptions(prev => ({
        ...prev,
        announcements: userProfile.emailSubscriptions.announcements || prev.announcements,
        events: userProfile.emailSubscriptions.events || prev.events,
        newsletter: userProfile.emailSubscriptions.newsletter || prev.newsletter,
        prayerRequests: prev.prayerRequests,
        praiseReports: prev.praiseReports
      }));
    }
  }, [userProfile, user, router]);

  const handleSubscriptionChange = async (type: keyof typeof localSubscriptions, value: boolean) => {
    try {
      if (!user) {
        console.error('Settings: No user found when trying to update subscriptions');
        return;
      }

      setIsSaving(true);
      setError('');
      setSuccessMessage('');

      const newSubscriptions = {
        ...localSubscriptions,
        [type]: value
      };

      setLocalSubscriptions(newSubscriptions);

      // Update localStorage for notification preferences
      if (type === 'prayerRequests' || type === 'praiseReports') {
        const storedPreferences = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
        localStorage.setItem('notificationPreferences', JSON.stringify({
          ...storedPreferences,
          [type]: value
        }));
      }

      // Update Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        emailSubscriptions: newSubscriptions,
        updatedAt: new Date()
      });

      setSuccessMessage('Settings updated successfully');
      console.log('Settings: Subscription updated successfully:', { type, value });
    } catch (err) {
      console.error('Settings: Error updating subscription:', err);
      setError('Failed to update settings. Please try again.');
      // Revert local state on error
      setLocalSubscriptions(userProfile?.emailSubscriptions || localSubscriptions);
    } finally {
      setIsSaving(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-900 dark:text-white">Loading...</p>
      </div>
    );
  }

  console.log('Current local subscriptions:', localSubscriptions);
  console.log('Current profile subscriptions:', userProfile.emailSubscriptions);

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Settings</h1>
        </div>

        {/* Settings Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <Link
              href="/settings"
              className="text-primary border-b-2 border-primary pb-2 font-medium"
            >
              Notifications
            </Link>
            <Link
              href="/settings/appearance"
              className="text-text/70 hover:text-text border-b-2 border-transparent pb-2 font-medium transition-colors"
            >
              Appearance
            </Link>
          </nav>
        </div>

        {/* Role Information */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-text mb-4">Account Role</h2>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              userProfile.role === 'admin' ? 'bg-primary text-on-primary' :
              userProfile.role === 'organizer' ? 'bg-secondary text-on-secondary' :
              'bg-muted text-text/60'
            }`}>
              {userProfile.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : 'User'}
            </div>
            <p className="text-sm text-text/70">
              {userProfile.role === 'admin' ? 'Full access to all features and administrative controls' :
               userProfile.role === 'organizer' ? 'Can manage service roles and access member directory' :
               userProfile.role === 'member' ? 'Can access member directory and participate in church activities' :
               'Basic access to church information and features'}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="space-y-6">
            {/* Email Subscriptions */}
            <div>
              <h2 className="text-lg font-medium text-text mb-4">Email Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="announcements" className="text-text font-medium">
                    Announcements
                  </label>
                  <p className="text-text/70 text-sm">
                    Receive emails about new church announcements
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="announcements"
                    checked={localSubscriptions.announcements}
                    onChange={(e) => handleSubscriptionChange('announcements', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer-focus:ring-2 peer-focus:ring-primary peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="prayerRequests" className="text-text font-medium">
                    Prayer Requests
                  </label>
                  <p className="text-text/70 text-sm">
                    Receive notifications for new prayer requests
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="prayerRequests"
                    checked={localSubscriptions.prayerRequests}
                    onChange={(e) => handleSubscriptionChange('prayerRequests', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer-focus:ring-2 peer-focus:ring-primary peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="praiseReports" className="text-text font-medium">
                    Praise Reports
                  </label>
                  <p className="text-text/70 text-sm">
                    Receive notifications for new praise reports
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="praiseReports"
                    checked={localSubscriptions.praiseReports}
                    onChange={(e) => handleSubscriptionChange('praiseReports', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer-focus:ring-2 peer-focus:ring-primary peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="events" className="text-text font-medium">
                    Events
                  </label>
                  <p className="text-text/70 text-sm">
                    Receive emails about upcoming church events
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="events"
                    checked={localSubscriptions.events}
                    onChange={(e) => handleSubscriptionChange('events', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer-focus:ring-2 peer-focus:ring-primary peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="newsletter" className="text-text font-medium">
                    Newsletter
                  </label>
                  <p className="text-text/70 text-sm">
                    Receive our weekly church newsletter
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="newsletter"
                    checked={localSubscriptions.newsletter}
                    onChange={(e) => handleSubscriptionChange('newsletter', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer-focus:ring-2 peer-focus:ring-primary peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>
          </div>

            {/* Status Messages */}
            {successMessage && (
              <div className="p-4 bg-success/10 border border-success/20 rounded-md">
                <p className="text-success">{successMessage}</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-md">
                <p className="text-error">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 