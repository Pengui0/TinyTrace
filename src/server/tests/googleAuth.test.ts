import type { NextFunction, Request, Response } from 'express';
import { createGoogleAuthMiddleware } from '../security/googleAuth.js';
import type { AuthenticatedRequest } from '../security/googleAuth.js';

interface MiddlewareResult {
  statusCode: number;
  body?: unknown;
  nextCalled: boolean;
  request: AuthenticatedRequest;
}

async function invokeMiddleware(
  middleware: ReturnType<typeof createGoogleAuthMiddleware>,
  options: { method?: string; path?: string; headers?: Record<string, string> } = {}
): Promise<MiddlewareResult> {
  const headers = options.headers || {};
  const request = {
    method: options.method || 'GET',
    path: options.path || '/api/data',
    headers,
    ip: '127.0.0.1',
    get(name: string) { return headers[name.toLowerCase()]; },
  } as unknown as AuthenticatedRequest;
  const result: MiddlewareResult = { statusCode: 200, nextCalled: false, request };
  const response = {
    setHeader() { return this; },
    status(code: number) { result.statusCode = code; return this; },
    json(body: unknown) { result.body = body; return this; },
  } as unknown as Response;
  await new Promise<void>((resolve) => {
    const next = (() => { result.nextCalled = true; resolve(); }) as NextFunction;
    middleware(request as Request, response, next);
    setTimeout(resolve, 0);
  });
  return result;
}

export async function runGoogleAuthTests(): Promise<{ success: boolean; assertionsPassed: number; assertionsFailed: number; logs: string[] }> {
  let assertionsPassed = 0;
  let assertionsFailed = 0;
  const logs: string[] = [];
  const assert = (condition: boolean, description: string) => {
    if (condition) { assertionsPassed++; logs.push(`[PASS] ${description}`); }
    else { assertionsFailed++; logs.push(`[FAIL] ${description}`); }
  };
  const middleware = createGoogleAuthMiddleware({
    enabled: () => true,
    clientId: () => 'tinytrace-test-client.apps.googleusercontent.com',
    allowedDomain: () => 'example.org',
    verifyToken: async (token, audience) => {
      assert(audience === 'tinytrace-test-client.apps.googleusercontent.com', 'Token verifier receives the configured OAuth audience');
      if (token === 'invalid') throw new Error('invalid token');
      return {
        subject: 'google-user-123',
        email: 'reviewer@example.org',
        hostedDomain: token === 'wrong-domain' ? 'attacker.example' : 'example.org',
      };
    },
  });

  const missing = await invokeMiddleware(middleware, {
    method: 'POST', path: '/api/reports/export',
    headers: { authorization: '', 'x-workspace-id': 'default_ws' },
  });
  assert(missing.statusCode === 401 && !missing.nextCalled, 'A forged workspace header cannot replace a Google bearer token');

  const accepted = await invokeMiddleware(middleware, {
    method: 'POST', path: '/api/reports/export', headers: { authorization: 'Bearer valid' },
  });
  assert(accepted.nextCalled && accepted.request.authenticatedUser?.subject === 'google-user-123', 'Valid Google identity is attached to the request');

  const wrongDomain = await invokeMiddleware(middleware, {
    method: 'GET', path: '/api/data', headers: { authorization: 'Bearer wrong-domain' },
  });
  assert(wrongDomain.statusCode === 403 && !wrongDomain.nextCalled, 'Other Google Workspace domains are denied');

  const invalid = await invokeMiddleware(middleware, {
    method: 'GET', path: '/api/data', headers: { authorization: 'Bearer invalid' },
  });
  assert(invalid.statusCode === 401 && !invalid.nextCalled, 'Rejected Google tokens cannot reach API handlers');

  const missingConfig = createGoogleAuthMiddleware({
    enabled: () => true, clientId: () => undefined, allowedDomain: () => 'example.org',
    verifyToken: async () => { throw new Error('Must not be called'); },
  });
  const unavailable = await invokeMiddleware(missingConfig, { method: 'GET', path: '/api/data' });
  assert(unavailable.statusCode === 503, 'Auth fails closed when server OAuth configuration is missing');

  const publicHealth = await invokeMiddleware(middleware, { method: 'GET', path: '/health' });
  assert(publicHealth.nextCalled, 'Health endpoint stays public for platform readiness probes');

  const disabled = createGoogleAuthMiddleware({
    enabled: () => false, clientId: () => undefined, allowedDomain: () => undefined,
    verifyToken: async () => { throw new Error('Must not be called'); },
  });
  const localDevelopment = await invokeMiddleware(disabled, { method: 'POST', path: '/api/data' });
  assert(localDevelopment.nextCalled, 'Local development stays available when app auth is disabled');

  return { success: assertionsFailed === 0, assertionsPassed, assertionsFailed, logs };
}
