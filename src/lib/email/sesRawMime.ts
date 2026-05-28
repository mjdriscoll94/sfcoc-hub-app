import { SendRawEmailCommand, SESClient } from '@aws-sdk/client-ses';
import type { EmailAttachment } from '@/lib/email/attachments';

function formatFromHeader(from: string): string {
  const m = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) {
    const name = m[1].trim().replace(/^["']|["']$/g, '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${name}" <${m[2].trim()}>`;
  }
  return from.trim();
}

function extractSourceEmail(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim();
}

function encodeHeaderValue(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const b64 = Buffer.from(value, 'utf8').toString('base64');
  return `=?UTF-8?B?${b64}?=`;
}

function base64MimeLines(buffer: Buffer): string {
  const b64 = buffer.toString('base64');
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 76) {
    lines.push(b64.slice(i, i + 76));
  }
  return lines.join('\r\n');
}

function foldHeaderLine(name: string, value: string): string {
  return `${name}: ${value}`;
}

export function buildMimeMessage(options: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string[];
  attachments: EmailAttachment[];
}): Buffer {
  const mixedBoundary = `mixed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const altBoundary = `alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const textBody = options.text ?? options.html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  const lines: string[] = [
    'MIME-Version: 1.0',
    foldHeaderLine('From', formatFromHeader(options.from)),
    foldHeaderLine('To', options.to),
    foldHeaderLine('Subject', encodeHeaderValue(options.subject)),
  ];

  if (options.replyTo?.length) {
    lines.push(foldHeaderLine('Reply-To', options.replyTo.join(', ')));
  }

  lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`, '', `--${mixedBoundary}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`, '', `--${altBoundary}`);
  lines.push('Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: quoted-printable', '', textBody, '');
  lines.push(`--${altBoundary}`);
  lines.push('Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: quoted-printable', '', options.html, '');
  lines.push(`--${altBoundary}--`, '');

  for (const att of options.attachments) {
    lines.push(`--${mixedBoundary}`);
    lines.push(
      `Content-Type: ${att.contentType}; name="${att.filename.replace(/"/g, '\\"')}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${att.filename.replace(/"/g, '\\"')}"`,
      '',
      base64MimeLines(att.content),
      ''
    );
  }

  lines.push(`--${mixedBoundary}--`, '');
  return Buffer.from(lines.join('\r\n'), 'utf8');
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
  const toAddresses = [...new Set(Array.isArray(options.to) ? options.to : [options.to])];
  if (toAddresses.length === 0) {
    throw new Error('At least one recipient is required');
  }

  const sourceEmail = extractSourceEmail(options.from);
  let lastMessageId = '';

  for (const to of toAddresses) {
    const raw = buildMimeMessage({
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
      RawMessage: { Data: raw },
    });
    const response = await sesClient.send(command);
    if (response.MessageId) lastMessageId = response.MessageId;
  }

  return { messageId: lastMessageId };
}
