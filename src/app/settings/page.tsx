'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ROLE_DISPLAY_NAMES } from '@/types/roles';

export default function SettingsPage() {
  useEffect(() => {
    document.title = 'Settings | Sioux Falls Church of Christ';
  }, []);

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

  // Sync local state from userProfile (source of truth from Firestore) so mobile and desktop match
  useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    if (userProfile?.emailSubscriptions) {
      const subs = userProfile.emailSubscriptions;
      setLocalSubscriptions({
        announcements: subs.announcements ?? true,
        events: subs.events ?? true,
        newsletter: subs.newsletter ?? true,
        prayerRequests: subs.prayerRequests ?? false,
        praiseReports: subs.praiseReports ?? false
      });
      return;
    }

    // Fallback: load prayer/praise from localStorage only before profile has loaded
    const storedPreferences = localStorage.getItem('notificationPreferences');
    if (storedPreferences) {
      const preferences = JSON.parse(storedPreferences);
      setLocalSubscriptions(prev => ({
        ...prev,
        prayerRequests: preferences.prayerRequests ?? false,
        praiseReports: preferences.praiseReports ?? false
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
        <p className="text-charcoal">Loading...</p>
      </div>
    );
  }

  console.log('Current local subscriptions:', localSubscriptions);
  console.log('Current profile subscriptions:', userProfile.emailSubscriptions);

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text uppercase tracking-wide">Settings</h1>
        </div>

        {/* Settings Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <Link
              href="/settings"
              className="text-primary border-b-2 border-primary pb-2 font-medium uppercase tracking-wide"
            >
              Notifications
            </Link>
          </nav>
        </div>

        {/* Role Information */}
        <div className="bg-card border border-sage/20 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-text mb-4 uppercase tracking-wide">Account Role</h2>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              userProfile.role === 'admin' ? 'bg-primary text-on-primary' :
              userProfile.role === 'organizer' ? 'bg-secondary text-on-secondary' :
              userProfile.role === 'lifeGroupOrganizer' ? 'bg-[#7A9B82] text-white' :
              'bg-muted text-text/60'
            }`}>
              {userProfile.role ? ROLE_DISPLAY_NAMES[userProfile.role] ?? userProfile.role : 'User'}
            </div>
            <p className="text-sm text-text/70">
              {userProfile.role === 'admin' ? 'Full access to all features and administrative controls' :
               userProfile.role === 'organizer' ? 'Can manage service roles, announcements, volunteer opportunities, and access member directory' :
               userProfile.role === 'lifeGroupOrganizer' ? 'Can manage life groups and access member directory' :
               userProfile.role === 'lifeGroupLeader' ? 'Can access life group leader resources and member directory' :
               userProfile.role === 'member' ? 'Can access member directory and participate in church activities' :
               'Basic access to church information and features'}
            </p>
          </div>
        </div>

        <div className="bg-card border border-sage/20 rounded-lg p-6">
          <div className="space-y-6">
            {/* Email Subscriptions */}
            <div>
              <h2 className="text-lg font-medium text-text mb-4 uppercase tracking-wide">Email Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <label htmlFor="announcements" className="text-text font-medium block">
                    Announcements
                  </label>
                  <p className="text-text/70 text-sm mt-0.5">
                    Receive emails about new church announcements
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    id="announcements"
                    checked={localSubscriptions.announcements}
                    onChange={(e) => handleSubscriptionChange('announcements', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 rounded-full transition-colors duration-200 ease-in-out relative peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FF6B6B] peer-focus:ring-offset-2 ${
                    localSubscriptions.announcements ? 'bg-[#FF6B6B]' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      localSubscriptions.announcements ? 'translate-x-7' : 'translate-x-0'
                    }`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <label htmlFor="prayerRequests" className="text-text font-medium block">
                    Prayer Requests
                  </label>
                  <p className="text-text/70 text-sm mt-0.5">
                    Receive notifications for new prayer requests
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    id="prayerRequests"
                    checked={localSubscriptions.prayerRequests}
                    onChange={(e) => handleSubscriptionChange('prayerRequests', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 rounded-full transition-colors duration-200 ease-in-out relative peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FF6B6B] peer-focus:ring-offset-2 ${
                    localSubscriptions.prayerRequests ? 'bg-[#FF6B6B]' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      localSubscriptions.prayerRequests ? 'translate-x-7' : 'translate-x-0'
                    }`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <label htmlFor="praiseReports" className="text-text font-medium block">
                    Praise Reports
                  </label>
                  <p className="text-text/70 text-sm mt-0.5">
                    Receive notifications for new praise reports
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    id="praiseReports"
                    checked={localSubscriptions.praiseReports}
                    onChange={(e) => handleSubscriptionChange('praiseReports', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 rounded-full transition-colors duration-200 ease-in-out relative peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FF6B6B] peer-focus:ring-offset-2 ${
                    localSubscriptions.praiseReports ? 'bg-[#FF6B6B]' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      localSubscriptions.praiseReports ? 'translate-x-7' : 'translate-x-0'
                    }`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <label htmlFor="events" className="text-text font-medium block">
                    Events
                  </label>
                  <p className="text-text/70 text-sm mt-0.5">
                    Receive emails about upcoming church events
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    id="events"
                    checked={localSubscriptions.events}
                    onChange={(e) => handleSubscriptionChange('events', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 rounded-full transition-colors duration-200 ease-in-out relative peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FF6B6B] peer-focus:ring-offset-2 ${
                    localSubscriptions.events ? 'bg-[#FF6B6B]' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      localSubscriptions.events ? 'translate-x-7' : 'translate-x-0'
                    }`}></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <label htmlFor="newsletter" className="text-text font-medium block">
                    Newsletter
                  </label>
                  <p className="text-text/70 text-sm mt-0.5">
                    Receive our weekly church newsletter
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    id="newsletter"
                    checked={localSubscriptions.newsletter}
                    onChange={(e) => handleSubscriptionChange('newsletter', e.target.checked)}
                    disabled={isSaving}
                    className="sr-only peer"
                  />
                  <div className={`w-14 h-7 rounded-full transition-colors duration-200 ease-in-out relative peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FF6B6B] peer-focus:ring-offset-2 ${
                    localSubscriptions.newsletter ? 'bg-[#FF6B6B]' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      localSubscriptions.newsletter ? 'translate-x-7' : 'translate-x-0'
                    }`}></div>
                  </div>
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