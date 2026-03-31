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
}

/**
 * Send email via Amazon SES. Replaces the previous Resend/nodemailer transporter.
 * Uses the same interface (from, to, subject, html) so existing callers work unchanged.
 */
export async function sendMailViaSES(options: SendMailOptions): Promise<{ messageId: string }> {
  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];
  if (toAddresses.length === 0) {
    throw new Error('At least one recipient is required');
  }
  // SES allows up to 50 destinations per call
  const chunkSize = 50;
  let lastMessageId = '';
  for (let i = 0; i < toAddresses.length; i += chunkSize) {
    const chunk = toAddresses.slice(i, i + chunkSize);
    const command = new SendEmailCommand({
      Source: options.from,
      Destination: { ToAddresses: chunk },
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
    });
  },
  verify: async () => {
    // No-op for SES; credentials are validated on first send.
  },
};
