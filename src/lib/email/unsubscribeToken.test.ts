import { describe, expect, it } from 'vitest';
import {
  createUnsubscribeToken,
  emailSuppressionId,
  normalizeEmailAddress,
  readUnsubscribeToken,
} from './unsubscribeToken';

const SECRET = 'test-only-secret-that-is-longer-than-thirty-two-characters';

describe('unsubscribe tokens', () => {
  it('normalizes an address and decrypts a valid opaque token', () => {
    const token = createUnsubscribeToken('  Member@Example.COM ', SECRET);

    expect(token).not.toContain('Member');
    expect(token).not.toContain('example.com');
    expect(readUnsubscribeToken(token, SECRET)).toBe('member@example.com');
  });

  it('rejects a modified token', () => {
    const token = createUnsubscribeToken('member@example.com', SECRET);
    const parts = token.split('.');
    const middle = Math.floor(parts[2].length / 2);
    parts[2] = `${parts[2].slice(0, middle)}${parts[2][middle] === 'A' ? 'B' : 'A'}${parts[2].slice(middle + 1)}`;

    expect(readUnsubscribeToken(parts.join('.'), SECRET)).toBeNull();
  });

  it('uses a stable case-insensitive suppression id', () => {
    expect(normalizeEmailAddress(' MEMBER@example.com ')).toBe('member@example.com');
    expect(emailSuppressionId('Member@Example.com')).toBe(
      emailSuppressionId(' member@example.COM ')
    );
  });
});
