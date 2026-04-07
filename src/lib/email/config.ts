import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const DEFAULT_MAILBOX = 'announcements@siouxfallschurchofchrist.org';

/** Announcement broadcasts (`/api/email`). Override with `EMAIL_FROM` or `SES_FROM`. */
export function getEmailFromAnnouncements(): string {
  const v = process.env.EMAIL_FROM || process.env.SES_FROM;
  if (v?.trim()) return v.trim();
  return `SFCoC Announcements <${DEFAULT_MAILBOX}>`;
}

/** Admin and account-status mail. Override with `EMAIL_FROM_INFORMATION_HUB`, or fall back to `EMAIL_FROM` / `SES_FROM`. */
export function getEmailFromInformationHub(): string {
  const v =
    process.env.EMAIL_FROM_INFORMATION_HUB || process.env.EMAIL_FROM || process.env.SES_FROM;
  if (v?.trim()) return v.trim();
  return `SFCOC Information Hub <${DEFAULT_MAILBOX}>`;
}

/** Service-role assignment emails. Override with `EMAIL_FROM_SERVICE_ROLES`. */
export function getEmailFromServiceRoles(): string {
  const v = process.env.EMAIL_FROM_SERVICE_ROLES;
  if (v?.trim()) return v.trim();
  return `SFCoC Service Roles <${DEFAULT_MAILBOX}>`;
}

const region = process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1';

const sesClient = new SESClient({
  region,
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

export interface SendMailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Overrides `EMAIL_REPLY_TO` for this message only. */
  replyTo?: string | string[];
}

/** Single address for replies (must be verified in SES if different from From domain rules apply). */
function getReplyToAddresses(override?: string | string[]): string[] | undefined {
  const rawList = override !== undefined
    ? (Array.isArray(override) ? override : [override])
    : process.env.EMAIL_REPLY_TO?.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) ?? [];
  const valid = rawList.filter((a) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a));
  if (valid.length === 0) return undefined;
  // SES SendEmail allows multiple Reply-To; one is enough for a single office inbox.
  return [valid[0]];
}

/**
 * Send email via Amazon SES. Replaces the previous Resend/nodemailer transporter.
 * Sends **one message per recipient** so recipients never see each other’s addresses
 * (Reply-All cannot reach the whole list). Optional Reply-To from `EMAIL_REPLY_TO` or `replyTo`.
 */
export async function sendMailViaSES(options: SendMailOptions): Promise<{ messageId: string }> {
  const toAddresses = [...new Set(Array.isArray(options.to) ? options.to : [options.to])];
  if (toAddresses.length === 0) {
    throw new Error('At least one recipient is required');
  }
  const replyToAddresses = getReplyToAddresses(options.replyTo);

  let lastMessageId = '';
  for (const addr of toAddresses) {
    const command = new SendEmailCommand({
      Source: options.from,
      Destination: { ToAddresses: [addr] },
      ...(replyToAddresses ? { ReplyToAddresses: replyToAddresses } : {}),
      Message: {
        Subject: { Data: options.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: options.html, Charset: 'UTF-8' },
          ...(options.text ? { Text: { Data: options.text, Charset: 'UTF-8' } } : {}),
        },
      },
    });
    const response = await sesClient.send(command);
    if (response.MessageId) lastMessageId = response.MessageId;
  }
  return { messageId: lastMessageId };
}

/** Transporter-compatible object for drop-in replacement of nodemailer transporter. */
export const transporter = {
  sendMail: async (options: SendMailOptions & { response?: string }) => {
    return sendMailViaSES({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });
  },
  verify: async () => {
    // No-op for SES; credentials are validated on first send.
  },
};
