import { SendRawEmailCommand, SESClient } from '@aws-sdk/client-ses';
import MailComposer from 'nodemailer/lib/mail-composer';
import type { EmailAttachment } from '@/lib/email/attachments';

function extractSourceEmail(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim();
}

/** Build a complete RFC 822 message with attachments (nodemailer handles MIME boundaries and base64). */
export async function buildMimeMessage(options: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string[];
  attachments: EmailAttachment[];
}): Promise<Buffer> {
  const composer = new MailComposer({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    ...(options.replyTo?.length ? { replyTo: options.replyTo.join(', ') } : {}),
    attachments: options.attachments.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
    })),
  });

  const message = await composer.compile().build();
  return Buffer.isBuffer(message) ? message : Buffer.from(message);
}

export async function sendRawMailViaSES(
  sesClient: SESClient,
  options: {
    from: string;
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string[];
    attachments: EmailAttachment[];
  }
): Promise<{ messageId: string }> {
  const toAddresses = Array.from(new Set(Array.isArray(options.to) ? options.to : [options.to]));
  if (toAddresses.length === 0) {
    throw new Error('At least one recipient is required');
  }

  const sourceEmail = extractSourceEmail(options.from);
  let lastMessageId = '';

  for (const to of toAddresses) {
    const raw = await buildMimeMessage({
      from: options.from,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      attachments: options.attachments,
    });

    const command = new SendRawEmailCommand({
      Source: sourceEmail,
      Destinations: [to],
      RawMessage: { Data: new Uint8Array(raw) },
    });
    const response = await sesClient.send(command);
    if (response.MessageId) lastMessageId = response.MessageId;
  }

  return { messageId: lastMessageId };
}
