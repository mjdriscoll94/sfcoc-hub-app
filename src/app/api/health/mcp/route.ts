import { getDatabase } from '@/lib/mcp/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await getDatabase().query('SELECT 1 AS healthy');
    return Response.json({ status: 'ok', service: 'church-directory-mcp' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ status: 'unavailable', service: 'church-directory-mcp' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
