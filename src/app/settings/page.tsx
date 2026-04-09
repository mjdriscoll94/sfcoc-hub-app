'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ROLE_DISPLAY_NAMES } from '@/types/roles';

function userHasEmailPassword(): boolean {
  const u = auth.currentUser;
  if (!u?.email) return false;
  return u.providerData.some((p) => p.providerId === 'password');
}

function passwordChangeErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : '';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Current password is incorrect.';
  }
  if (code === 'auth/weak-password') {
    return 'Choose a stronger password (at least 6 characters).';
  }
  if (code === 'auth/requires-recent-login') {
    return 'Please sign out, sign in again, then try changing your password.';
  }
  return 'Could not update password. Try again.';
}

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

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    const u = auth.currentUser;
    if (!u?.email) {
      setPwError('Not signed in.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      const credential = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, credential);
      await updatePassword(u, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPwSuccess('Password updated successfully.');
    } catch (err) {
      setPwError(passwordChangeErrorMessage(err));
    } finally {
      setPwSaving(false);
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

        {userHasEmailPassword() && (
          <div className="bg-card border border-sage/20 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-text mb-2 uppercase tracking-wide">Password</h2>
            <p className="text-sm text-text/70 mb-4">
              Change the password you use to sign in with this email address. If you don&apos;t remember your current
              password, use{' '}
              <Link href="/auth/forgot-password" className="text-primary font-medium hover:opacity-80">
                forgot password
              </Link>{' '}
              instead.
            </p>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-text mb-1">
                  Current password
                </label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full rounded-md border border-sage/20 bg-bg px-3 py-2 text-text focus:ring-primary focus:border-primary sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="new-password-settings" className="block text-sm font-medium text-text mb-1">
                  New password
                </label>
                <input
                  id="new-password-settings"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="block w-full rounded-md border border-sage/20 bg-bg px-3 py-2 text-text focus:ring-primary focus:border-primary sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="confirm-new-password" className="block text-sm font-medium text-text mb-1">
                  Confirm new password
                </label>
                <input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  minLength={6}
                  className="block w-full rounded-md border border-sage/20 bg-bg px-3 py-2 text-text focus:ring-primary focus:border-primary sm:text-sm"
                  required
                />
              </div>
              {pwError && (
                <div className="p-3 rounded-md bg-error/10 border border-error/20 text-sm text-error">{pwError}</div>
              )}
              {pwSuccess && (
                <div className="p-3 rounded-md bg-success/10 border border-success/20 text-sm text-success">
                  {pwSuccess}
                </div>
              )}
              <button
                type="submit"
                disabled={pwSaving}
                className="px-4 py-2 rounded-md text-on-primary bg-primary text-sm font-semibold uppercase tracking-wide hover:opacity-90 disabled:opacity-50"
              >
                {pwSaving ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        )}

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