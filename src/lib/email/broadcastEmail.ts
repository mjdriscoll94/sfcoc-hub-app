import { createUnsubscribeToken } from './unsubscribeToken';

const OPTIONAL_BROADCAST_TYPES = new Set([
  'announcements',
  'events',
  'newsletter',
  'prayer',
  'praise',
]);

export function isOptionalBroadcastEmail(type: string): boolean {
  return OPTIONAL_BROADCAST_TYPES.has(type.trim().toLowerCase());
}

export function getPublicAppUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'https://app.siouxfallschurchofchrist.org';
  const withProtocol = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
  return withProtocol.replace(/\/$/, '');
}

export function createUnsubscribeUrl(email: string): string {
  const token = createUnsubscribeToken(email);
  return `${getPublicAppUrl()}/unsubscribe/${encodeURIComponent(token)}`;
}

export function unsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/** Adds the visible opt-out link to older formatted templates that already contain their own footer. */
export function appendUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  return `${html}
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 18px auto 0; padding-top: 14px; border-top: 1px solid #eeeeee; color: #666666; font-size: 12px; line-height: 1.5;">
      Don’t want optional church emails?
      <a href="${unsubscribeUrl}" style="color: #B9471F; text-decoration: underline;">Unsubscribe from church emails</a>.
      Essential account and security messages may still be sent.
    </div>
  `;
}
