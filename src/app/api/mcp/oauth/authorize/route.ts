import { authorize, getOAuthConfig, parseAuthorizationRequest } from '@/lib/mcp/auth';
import { escapeHtml } from '@/lib/mcp/html';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function page(parameters: URLSearchParams, error?: string) {
  const config = getOAuthConfig();
  const hidden = Array.from(parameters.entries())
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
    .join('');
  return new Response(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authorize Church Directory</title>
<style>body{font:16px system-ui;background:#f7f7f5;color:#202020;margin:0}.card{max-width:480px;margin:10vh auto;background:white;padding:2rem;border-radius:12px;box-shadow:0 8px 30px #0001}label,input,button{display:block;width:100%;box-sizing:border-box}input{padding:.75rem;margin:.5rem 0 1.25rem}button{padding:.8rem;background:#1f4f3b;color:white;border:0;border-radius:6px}.error{color:#a00}</style></head>
<body><main class="card"><h1>Authorize Church Directory</h1><p>ChatGPT is requesting access to research the private directory and create review-only evidence, proposals, and candidates. It cannot directly change canonical congregation records.</p>
${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}<form method="post" action="${escapeHtml(config.baseUrl)}/api/mcp/oauth/authorize">${hidden}<label for="password">Administrator password</label><input id="password" name="password" type="password" required autocomplete="current-password"><button type="submit">Authorize ChatGPT</button></form></main></body></html>`, {
    status: error ? 403 : 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

export function GET(request: Request) {
  try {
    const parameters = new URL(request.url).searchParams;
    parseAuthorizationRequest(parameters);
    return page(parameters);
  } catch {
    return new Response('Invalid OAuth authorization request', { status: 400 });
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const parameters = new URLSearchParams();
  for (const [name, value] of Array.from(form.entries())) {
    if (typeof value === 'string' && name !== 'password') parameters.append(name, value);
  }
  try {
    const redirect = await authorize(parameters, String(form.get('password') ?? ''));
    return Response.redirect(redirect, 303);
  } catch (error) {
    if (error instanceof Error && error.message === 'access_denied') {
      return page(parameters, 'Authorization was denied. Check the administrator password.');
    }
    return new Response('Invalid OAuth authorization request', { status: 400 });
  }
}
