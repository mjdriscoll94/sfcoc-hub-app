export const MAX_EMAIL_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES_PER_FILE = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_BYTES_TOTAL = 8 * 1024 * 1024;

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'com',
  'msi',
  'scr',
  'js',
  'jar',
  'vbs',
  'ps1',
  'sh',
  'app',
]);

function safeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, '_').replace(/[^\w.\- ()[\]]+/g, '_').trim();
  return base.slice(0, 200) || 'attachment';
}

function isAllowedFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (BLOCKED_EXTENSIONS.has(ext)) return false;
  if (file.type && !file.type.startsWith('application/octet-stream')) {
    const ok =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      file.type.startsWith('text/') ||
      file.type.includes('officedocument') ||
      file.type === 'application/msword' ||
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed';
    if (!ok) return false;
  }
  return true;
}

/** Parse and validate `attachments` fields from multipart form data. */
export async function attachmentsFromFormData(formData: FormData): Promise<EmailAttachment[]> {
  const files = formData
    .getAll('attachments')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length > MAX_EMAIL_ATTACHMENTS) {
    throw new Error(`You can attach at most ${MAX_EMAIL_ATTACHMENTS} files.`);
  }

  const out: EmailAttachment[] = [];
  let totalBytes = 0;

  for (const file of files) {
    if (!isAllowedFile(file)) {
      throw new Error(`File type not allowed: ${file.name}`);
    }
    if (file.size > MAX_ATTACHMENT_BYTES_PER_FILE) {
      throw new Error(`File too large (max ${MAX_ATTACHMENT_BYTES_PER_FILE / (1024 * 1024)} MB each): ${file.name}`);
    }
    totalBytes += file.size;
    if (totalBytes > MAX_ATTACHMENT_BYTES_TOTAL) {
      throw new Error(`Total attachment size exceeds ${MAX_ATTACHMENT_BYTES_TOTAL / (1024 * 1024)} MB.`);
    }
    const buf = Buffer.from(await file.arrayBuffer());
    out.push({
      filename: safeFilename(file.name),
      contentType: file.type || 'application/octet-stream',
      content: buf,
    });
  }

  return out;
}
