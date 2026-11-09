import { describe, expect, it } from 'vitest';
import { getSignInErrorMessage, INVALID_SIGN_IN_MESSAGE } from './signInError';

describe('getSignInErrorMessage', () => {
  it.each([
    'auth/invalid-credential',
    'auth/invalid-email',
    'auth/user-disabled',
    'auth/user-not-found',
    'auth/wrong-password',
  ])('uses the same safe message for %s', (code) => {
    expect(getSignInErrorMessage({ code })).toBe(INVALID_SIGN_IN_MESSAGE);
  });

  it('does not expose a raw authentication error message', () => {
    const rawMessage = 'There is no user record corresponding to this identifier.';
    expect(getSignInErrorMessage({ code: 'auth/user-not-found', message: rawMessage })).not.toContain(rawMessage);
  });

  it('gives useful guidance for rate limits without confirming an account', () => {
    expect(getSignInErrorMessage({ code: 'auth/too-many-requests' })).toContain('Wait a few minutes');
  });

  it('gives useful guidance for a network failure', () => {
    expect(getSignInErrorMessage({ code: 'auth/network-request-failed' })).toContain('internet connection');
  });

  it('allows an approval status after valid credentials have authenticated', () => {
    expect(getSignInErrorMessage({ code: 'auth/account-pending' })).toContain('waiting for approval');
  });

  it('uses a generic fallback for unknown errors', () => {
    expect(getSignInErrorMessage(new Error('Sensitive internal detail'))).toBe(
      'We couldn’t sign you in right now. Try again in a moment.'
    );
  });
});
