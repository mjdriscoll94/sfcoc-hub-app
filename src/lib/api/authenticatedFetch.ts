import { auth } from '@/lib/firebase/config';

export async function authenticatedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in again to continue.');
  const token = await user.getIdToken();
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
}

export async function authenticatedJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data as T;
}
