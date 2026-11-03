export const INVALID_SIGN_IN_MESSAGE =
  'We couldn’t sign you in with that email and password. Check both and try again, or reset your password.';

type ErrorWithCode = {
  code?: unknown;
};

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return String((error as ErrorWithCode).code ?? '');
}

export function getSignInErrorMessage(error: unknown): string {
  const code = errorCode(error);

  switch (code) {
    case 'auth/account-pending':
      return 'Your member access request is still waiting for approval. Please try again after an administrator approves it.';
    case 'auth/account-rejected':
      return 'Your member access request was not approved. Contact the church office if you need help.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Wait a few minutes, then try again or reset your password.';
    case 'auth/network-request-failed':
      return 'We couldn’t reach the sign-in service. Check your internet connection and try again.';
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-disabled':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return INVALID_SIGN_IN_MESSAGE;
    default:
      return 'We couldn’t sign you in right now. Try again in a moment.';
  }
}
