import { createMcpHandler } from '@modelcontextprotocol/server';
import { authenticateMcpRequest, getOAuthConfig, oauthChallenge } from '@/lib/mcp/auth';
import { createDirectoryMcpServer } from '@/lib/mcp/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = createMcpHandler(() => createDirectoryMcpServer(), {
  legacy: 'stateless',
  responseMode: 'auto',
  onerror: (error) => console.error('MCP protocol error', error.message),
});

function validateRequestSource(request: Request) {
  const config = getOAuthConfig();
  const expectedHost = new URL(config.baseUrl).host;
  const actualHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (actualHost && actualHost.split(',')[0].trim() !== expectedHost) return false;

  const origin = request.headers.get('origin');
  if (!origin) return true;
  const allowed = new Set([
    new URL(config.baseUrl).origin,
    ...(process.env.MCP_ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean),
  ]);
  return allowed.has(origin);
}

async function serve(request: Request) {
  try {
    if (!validateRequestSource(request)) {
      return Response.json({ error: 'Forbidden request source' }, { status: 403 });
    }
    const authInfo = authenticateMcpRequest(request);
    if (!authInfo) {
      return Response.json({ error: 'OAuth authorization required' }, {
        status: 401,
        headers: { 'WWW-Authenticate': oauthChallenge(), 'Cache-Control': 'no-store' },
      });
    }
    return handler.fetch(request, { authInfo });
  } catch (error) {
    console.error('MCP endpoint configuration error', error instanceof Error ? error.message : 'Unknown error');
    return Response.json({ error: 'MCP endpoint is unavailable' }, { status: 503 });
  }
}

export const GET = serve;
export const POST = serve;
export const DELETE = serve;
