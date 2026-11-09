import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const TOKEN_VERSION = 'v1';
const IV_BYTES = 12;

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

export function emailSuppressionId(email: string): string {
  return createHash('sha256').update(normalizeEmailAddress(email)).digest('hex');
}

function resolveSecret(secret?: string): string {
  const value = secret ?? process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!value || value.length < 32) {
    throw new Error('EMAIL_UNSUBSCRIBE_SECRET must be at least 32 characters long');
  }
  return value;
}

function encryptionKey(secret?: string): Buffer {
  return createHash('sha256').update(resolveSecret(secret)).digest();
}

/** Creates an encrypted capability token. The recipient address is not visible in the URL. */
export function createUnsubscribeToken(email: string, secret?: string): string {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) throw new Error('An email address is required');

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  const payload = Buffer.from(JSON.stringify({ email: normalizedEmail }), 'utf8');
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    authTag.toString('base64url'),
  ].join('.');
}

/** Returns null for malformed, forged, or unreadable tokens without leaking why validation failed. */
export function readUnsubscribeToken(token: string, secret?: string): string | null {
  try {
    const [version, encodedIv, encodedPayload, encodedAuthTag, extra] = token.split('.');
    if (
      version !== TOKEN_VERSION ||
      !encodedIv ||
      !encodedPayload ||
      !encodedAuthTag ||
      extra !== undefined
    ) {
      return null;
    }

    const iv = Buffer.from(encodedIv, 'base64url');
    const encrypted = Buffer.from(encodedPayload, 'base64url');
    const authTag = Buffer.from(encodedAuthTag, 'base64url');
    if (iv.length !== IV_BYTES || authTag.length !== 16 || encrypted.length === 0) return null;

    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8')) as { email?: unknown };
    if (typeof parsed.email !== 'string') return null;

    const normalizedEmail = normalizeEmailAddress(parsed.email);
    return normalizedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ? normalizedEmail
      : null;
  } catch {
    return null;
  }
}
