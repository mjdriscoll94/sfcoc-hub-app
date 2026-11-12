import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { getAdminDb } from '@/lib/firebase/admin';
import { RequestAuthorizationError, requireAdministrator } from '@/lib/auth/requestAuthorization';
import { prayerUpdateFromDocument, toMillis } from '@/lib/prayer/server';

export const dynamic = 'force-dynamic';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 42;

function pdfText(value: unknown): string {
  return String(value ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '?');
}

function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of pdfText(text).split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function formatDate(value: unknown): string {
  return new Date(toMillis(value)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Chicago',
  });
}

export async function GET(request: Request) {
  try {
    await requireAdministrator(request);
    const url = new URL(request.url);
    const includeConfidential = url.searchParams.get('includeConfidential') === 'true';
    const includePendingRejected = url.searchParams.get('includePendingRejected') === 'true';
    const db = getAdminDb();
    const snapshot = await db.collection('prayerPraise').orderBy('dateCreated', 'desc').get();
    const requests = snapshot.docs.filter((document) => {
      const data = document.data();
      if (data.type !== 'prayer') return false;
      if (!includeConfidential && data.isAdminOnly === true) return false;
      if (!includePendingRejected && data.approvalStatus !== 'approved') return false;
      return true;
    });
    const requestsWithUpdates = await Promise.all(requests.map(async (document) => ({
      document,
      updates: (await document.ref.collection('updates').orderBy('createdAt', 'asc').get()).docs.map(prayerUpdateFromDocument),
    })));

    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page: PDFPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;
    let pageNumber = 0;

    const addPage = () => {
      if (pageNumber > 0) page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageNumber += 1;
      y = PAGE_HEIGHT - MARGIN;
      page.drawText('Prayer Request Archive', { x: MARGIN, y, size: 18, font: bold, color: rgb(0.2, 0.26, 0.29) });
      page.drawText(`Page ${pageNumber}`, { x: PAGE_WIDTH - MARGIN - 45, y: 24, size: 8, font: regular, color: rgb(0.4, 0.45, 0.48) });
      y -= 28;
    };

    const ensureSpace = (height: number) => {
      if (y - height < MARGIN) addPage();
    };

    const drawLines = (text: string, font: PDFFont, size: number, color = rgb(0.2, 0.26, 0.29), indent = 0) => {
      const lines = wrapText(text, font, size, PAGE_WIDTH - (MARGIN * 2) - indent);
      for (const line of lines) {
        ensureSpace(size + 5);
        page.drawText(line, { x: MARGIN + indent, y, size, font, color });
        y -= size + 4;
      }
    };

    addPage();
    drawLines(`Generated ${formatDate(Date.now())} | ${requests.length} request${requests.length === 1 ? '' : 's'}`, regular, 9, rgb(0.4, 0.45, 0.48));
    y -= 8;

    for (const { document, updates } of requestsWithUpdates) {
      const data = document.data();
      ensureSpace(95);
      page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 0.6, color: rgb(0.82, 0.78, 0.72) });
      y -= 14;
      drawLines(String(data.title ?? 'Prayer request'), bold, 13);
      const author = data.isAnonymous === true ? 'Anonymous' : String(data.author?.name ?? 'Member');
      drawLines(`${formatDate(data.dateCreated)} | ${String(data.status ?? 'active').toUpperCase()} | ${author} | Prayed: ${Number(data.prayerCount ?? 0)}`, regular, 9, rgb(0.4, 0.45, 0.48));
      if (data.approvalStatus !== 'approved') drawLines(`Approval: ${String(data.approvalStatus)}`, bold, 9, rgb(0.65, 0.2, 0.16));
      if (data.isAdminOnly === true) drawLines('CONFIDENTIAL - ADMIN ONLY', bold, 9, rgb(0.65, 0.2, 0.16));
      y -= 3;
      drawLines(String(data.description ?? ''), regular, 10);

      if (updates.length > 0) {
        y -= 5;
        drawLines(`Updates (${updates.length})`, bold, 10);
        for (const update of updates) {
          drawLines(`${formatDate(update.createdAt)}${update.edited ? ' (Edited)' : ''} - ${update.authorName}`, bold, 8, rgb(0.35, 0.4, 0.42), 12);
          drawLines(update.text, regular, 9, rgb(0.25, 0.3, 0.32), 12);
          y -= 3;
        }
      }
      y -= 10;
    }

    if (requests.length === 0) drawLines('No prayer requests matched the selected export options.', regular, 11);
    const bytes = await pdf.save();
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="prayer-request-archive-${date}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    const status = error instanceof RequestAuthorizationError ? error.status : 500;
    if (status === 500) console.error('Prayer request export error:', error);
    return NextResponse.json({ error: status === 500 ? 'We couldn’t create the prayer request export.' : error instanceof Error ? error.message : 'Request failed.' }, { status });
  }
}
