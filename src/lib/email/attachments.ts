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

function uploadFilename(entry: File | Blob): string {
  if (entry instanceof File && entry.name) return entry.name;
  return 'attachment';
}

function isAllowedUpload(entry: File | Blob): boolean {
  const name = uploadFilename(entry);
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (BLOCKED_EXTENSIONS.has(ext)) return false;
  const type = entry.type;
  if (type && !type.startsWith('application/octet-stream')) {
    const ok =
      type.startsWith('image/') ||
      type === 'application/pdf' ||
      type.startsWith('text/') ||
      type.includes('officedocument') ||
      type === 'application/msword' ||
      type === 'application/zip' ||
      type === 'application/x-zip-compressed';
    if (!ok) return false;
  }
  return true;
}

function isFormUpload(entry: FormDataEntryValue): entry is File | Blob {
  return entry instanceof Blob && entry.size > 0;
}

/** Parse and validate `attachments` fields from multipart form data. */
export async function attachmentsFromFormData(formData: FormData): Promise<EmailAttachment[]> {
  const files = formData.getAll('attachments').filter(isFormUpload);

  if (files.length > MAX_EMAIL_ATTACHMENTS) {
    throw new Error(`You can attach at most ${MAX_EMAIL_ATTACHMENTS} files.`);
  }

  const out: EmailAttachment[] = [];
  let totalBytes = 0;

  for (const file of files) {
    const name = uploadFilename(file);
    if (!isAllowedUpload(file)) {
      throw new Error(`File type not allowed: ${name}`);
    }
    if (file.size > MAX_ATTACHMENT_BYTES_PER_FILE) {
      throw new Error(`File too large (max ${MAX_ATTACHMENT_BYTES_PER_FILE / (1024 * 1024)} MB each): ${name}`);
    }
    totalBytes += file.size;
    if (totalBytes > MAX_ATTACHMENT_BYTES_TOTAL) {
      throw new Error(`Total attachment size exceeds ${MAX_ATTACHMENT_BYTES_TOTAL / (1024 * 1024)} MB.`);
    }
    const buf = Buffer.from(await file.arrayBuffer());
    out.push({
      filename: safeFilename(name),
      contentType: file.type || 'application/octet-stream',
      content: buf,
    });
  }

  return out;
}
