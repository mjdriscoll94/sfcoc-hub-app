import { exchangeToken } from '@/lib/mcp/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const token = await exchangeToken(request, new URLSearchParams(body));
    return Response.json(token, { headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'invalid_request';
    const safeCode = ['invalid_client', 'invalid_grant', 'unsupported_grant_type'].includes(code)
      ? code : 'invalid_request';
    return Response.json({ error: safeCode }, {
      status: safeCode === 'invalid_client' ? 401 : 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
