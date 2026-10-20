import { protectedResourceMetadata } from '@/lib/mcp/auth';

export const dynamic = 'force-dynamic';

export function GET() {
  try {
    return Response.json(protectedResourceMetadata(), {
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  } catch {
    return Response.json({ error: 'OAuth metadata unavailable' }, { status: 503 });
  }
}
