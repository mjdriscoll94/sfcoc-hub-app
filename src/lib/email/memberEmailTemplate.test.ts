import { describe, expect, it } from 'vitest';
import { wrapMemberEmailHtml } from './memberEmailTemplate';
import {
  appendUnsubscribeFooter,
  isOptionalBroadcastEmail,
  unsubscribeHeaders,
} from './broadcastEmail';

describe('member broadcast email controls', () => {
  const unsubscribeUrl = 'https://app.example.com/unsubscribe/opaque-token';

  it('includes preferences and a visible unsubscribe link in the member template', () => {
    const html = wrapMemberEmailHtml('Church update', { unsubscribeUrl });

    expect(html).toContain('/settings');
    expect(html).toContain(unsubscribeUrl);
    expect(html).toContain('Unsubscribe from church emails');
  });

  it('adds one-click unsubscribe headers', () => {
    expect(unsubscribeHeaders(unsubscribeUrl)).toEqual({
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });

  it('distinguishes optional broadcasts from transactional messages', () => {
    expect(isOptionalBroadcastEmail('announcements')).toBe(true);
    expect(isOptionalBroadcastEmail('prayer')).toBe(true);
    expect(isOptionalBroadcastEmail('password-reset')).toBe(false);
    expect(isOptionalBroadcastEmail('welcome')).toBe(false);
  });

  it('adds an unsubscribe footer to legacy formatted emails', () => {
    const html = appendUnsubscribeFooter('<p>Update</p>', unsubscribeUrl);
    expect(html).toContain(unsubscribeUrl);
    expect(html).toContain('Essential account and security messages');
  });
});
