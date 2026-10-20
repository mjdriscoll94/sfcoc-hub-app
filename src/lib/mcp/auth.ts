import 'server-only';

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AuthInfo } from '@modelcontextprotocol/server';
import { getDatabase } from './db';

const SUPPORTED_SCOPES = ['directory:read', 'directory:write'] as const;

interface OAuthConfig {
  baseUrl: string;
  resource: string;
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  adminPassword: string;
  tokenSecret: string;
}

interface TokenPayload {
  iss: string;
  aud: string;
  sub: string;
  client_id: string;
  scope: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

interface AuthorizationRequest {
  responseType: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  resource: string;
  scopes: string[];
}

function env(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getOAuthConfig(): OAuthConfig {
  const baseUrl = env('MCP_BASE_URL').replace(/\/$/, '');
  const tokenSecret = env('MCP_TOKEN_SECRET');
  if (tokenSecret.length < 32) throw new Error('MCP_TOKEN_SECRET must be at least 32 characters');
  return {
    baseUrl,
    resource: `${baseUrl}/mcp`,
    clientId: env('MCP_OAUTH_CLIENT_ID'),
    clientSecret: env('MCP_OAUTH_CLIENT_SECRET'),
    redirectUris: env('MCP_OAUTH_REDIRECT_URIS').split(',').map((value) => value.trim()),
    adminPassword: env('MCP_AUTH_PASSWORD'),
    tokenSecret,
  };
}

function base64url(value: Buffer | string) {
  return Buffer.from(value).toString('base64url');
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('base64url');
}

function constantTimeEqual(actual: string, expected: string) {
  const left = createHash('sha256').update(actual).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

function signToken(payload: TokenPayload, secret: string) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string, expectedType: TokenPayload['type'], config: OAuthConfig) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expected = createHmac('sha256', config.tokenSecret)
    .update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (!constantTimeEqual(parts[2], expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.type !== expectedType || payload.exp <= now || payload.iss !== config.baseUrl ||
        payload.aud !== config.resource || payload.client_id !== config.clientId) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseScopes(scope: string | null) {
  const requested = scope ? scope.split(/\s+/).filter(Boolean) : [...SUPPORTED_SCOPES];
  if (!requested.length || requested.some((item) => !SUPPORTED_SCOPES.includes(item as typeof SUPPORTED_SCOPES[number]))) {
    throw new Error('invalid_scope');
  }
  return Array.from(new Set(requested));
}

export function parseAuthorizationRequest(values: URLSearchParams): AuthorizationRequest {
  const config = getOAuthConfig();
  const request = {
    responseType: values.get('response_type') ?? '',
    clientId: values.get('client_id') ?? '',
    redirectUri: values.get('redirect_uri') ?? '',
    codeChallenge: values.get('code_challenge') ?? '',
    codeChallengeMethod: values.get('code_challenge_method') ?? '',
    state: values.get('state') ?? '',
    resource: values.get('resource') ?? config.resource,
    scopes: parseScopes(values.get('scope')),
  };
  if (request.responseType !== 'code' || request.clientId !== config.clientId ||
      !config.redirectUris.includes(request.redirectUri) || request.codeChallengeMethod !== 'S256' ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(request.codeChallenge) || request.resource !== config.resource) {
    throw new Error('invalid_request');
  }
  return request;
}

export async function authorize(values: URLSearchParams, password: string) {
  const config = getOAuthConfig();
  const request = parseAuthorizationRequest(values);
  if (!constantTimeEqual(password, config.adminPassword)) throw new Error('access_denied');

  const code = randomBytes(32).toString('base64url');
  await getDatabase().query(
    `INSERT INTO mcp_oauth_authorization_codes
       (code_hash, client_id, redirect_uri, code_challenge, resource, scopes, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, now() + interval '5 minutes')`,
    [sha256(code), request.clientId, request.redirectUri, request.codeChallenge,
      request.resource, request.scopes],
  );
  const redirect = new URL(request.redirectUri);
  redirect.searchParams.set('code', code);
  if (request.state) redirect.searchParams.set('state', request.state);
  return redirect;
}

function getClientCredentials(request: Request, values: URLSearchParams) {
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authorization.slice(6), 'base64').toString();
      const separator = decoded.indexOf(':');
      return [decodeURIComponent(decoded.slice(0, separator)), decodeURIComponent(decoded.slice(separator + 1))];
    } catch { return ['', '']; }
  }
  return [values.get('client_id') ?? '', values.get('client_secret') ?? ''];
}

function tokenPair(scopes: string[], config: OAuthConfig) {
  const now = Math.floor(Date.now() / 1000);
  const common = {
    iss: config.baseUrl, aud: config.resource, sub: 'directory-administrator',
    client_id: config.clientId, scope: scopes.join(' '), iat: now,
  };
  return {
    access_token: signToken({ ...common, exp: now + 3600, type: 'access' }, config.tokenSecret),
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: signToken({ ...common, exp: now + 30 * 24 * 3600, type: 'refresh' }, config.tokenSecret),
    scope: scopes.join(' '),
  };
}

export async function exchangeToken(request: Request, values: URLSearchParams) {
  const config = getOAuthConfig();
  const [clientId, clientSecret] = getClientCredentials(request, values);
  if (clientId !== config.clientId || !constantTimeEqual(clientSecret, config.clientSecret)) {
    throw new Error('invalid_client');
  }

  if (values.get('grant_type') === 'refresh_token') {
    const payload = verifyToken(values.get('refresh_token') ?? '', 'refresh', config);
    if (!payload) throw new Error('invalid_grant');
    return tokenPair(payload.scope.split(' '), config);
  }
  if (values.get('grant_type') !== 'authorization_code') throw new Error('unsupported_grant_type');

  const code = values.get('code') ?? '';
  const redirectUri = values.get('redirect_uri') ?? '';
  const resource = values.get('resource') ?? config.resource;
  const verifierChallenge = sha256(values.get('code_verifier') ?? '');
  const rows = await getDatabase().query<{
    client_id: string; redirect_uri: string; code_challenge: string; resource: string; scopes: string[];
  }>(
    `UPDATE mcp_oauth_authorization_codes SET consumed_at = now()
     WHERE code_hash = $1 AND client_id = $2 AND redirect_uri = $3 AND resource = $4
       AND code_challenge = $5 AND consumed_at IS NULL AND expires_at > now()
     RETURNING client_id, redirect_uri, code_challenge, resource, scopes`,
    [sha256(code), clientId, redirectUri, resource, verifierChallenge],
  );
  const grant = rows[0];
  if (!grant) throw new Error('invalid_grant');
  return tokenPair(grant.scopes, config);
}

export function authenticateMcpRequest(request: Request): AuthInfo | null {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const config = getOAuthConfig();
  const token = authorization.slice(7);
  const payload = verifyToken(token, 'access', config);
  if (!payload) return null;
  return {
    token,
    clientId: payload.client_id,
    scopes: payload.scope.split(' '),
    expiresAt: payload.exp,
    resource: new URL(payload.aud),
    extra: { subject: payload.sub },
  };
}

export function oauthChallenge() {
  const config = getOAuthConfig();
  return `Bearer resource_metadata="${config.baseUrl}/.well-known/oauth-protected-resource", scope="${SUPPORTED_SCOPES.join(' ')}"`;
}

export function protectedResourceMetadata() {
  const config = getOAuthConfig();
  return {
    resource: config.resource,
    authorization_servers: [config.baseUrl],
    scopes_supported: SUPPORTED_SCOPES,
    resource_documentation: `${config.baseUrl}/#mcp-server`,
  };
}

export function authorizationServerMetadata() {
  const config = getOAuthConfig();
  return {
    issuer: config.baseUrl,
    authorization_endpoint: `${config.baseUrl}/api/mcp/oauth/authorize`,
    token_endpoint: `${config.baseUrl}/api/mcp/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: SUPPORTED_SCOPES,
  };
}
