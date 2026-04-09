import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase/admin';

/**
 * Real password-reset URL (Firebase action link). Use this in app-sent email only — not in the browser.
 */
export async function createFirebasePasswordResetLink(email: string): Promise<string> {
  const auth = getAuth(getAdminApp());
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const normalized = base.replace(/\/$/, '');
  return auth.generatePasswordResetLink(email.trim(), {
    url: `${normalized}/auth/signin`,
    handleCodeInApp: false,
  });
}
