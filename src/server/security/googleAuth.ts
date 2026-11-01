import { OAuth2Client } from 'google-auth-library';
import type { NextFunction, Request, Response } from 'express';
import { securityService } from './securityService.js';

export interface GoogleAuthenticatedUser {
  subject: string;
  email: string;
  hostedDomain: string | null;
}

export interface AuthenticatedRequest extends Request {
  authenticatedUser?: GoogleAuthenticatedUser;
}

type VerifyGoogleToken = (token: string, audience: string) => Promise<GoogleAuthenticatedUser>;

interface GoogleAuthMiddlewareOptions {
  enabled: () => boolean;
  clientId: () => string | undefined;
  allowedDomain: () => string | undefined;
  allowedEmails?: () => string | undefined;
  verifyToken: VerifyGoogleToken;
}

const googleClient = new OAuth2Client();

export async function verifyGoogleIdToken(token: string, audience: string): Promise<GoogleAuthenticatedUser> {
  const ticket = await googleClient.verifyIdToken({ idToken: token, audience });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new Error('Google identity token is missing a verified email identity.');
  }
  return { subject: payload.sub, email: payload.email.toLowerCase(), hostedDomain: payload.hd?.toLowerCase() || null };
}

export function createGoogleAuthMiddleware(options: GoogleAuthMiddlewareOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const publicEndpoint = req.method === 'GET' && (req.path === '/health' || req.path === '/auth/config');
    if (publicEndpoint || !options.enabled()) {
      next();
      return;
    }

    const clientId = options.clientId()?.trim();
    const allowedDomain = options.allowedDomain()?.trim().toLowerCase();
    const allowedEmails = (options.allowedEmails?.() || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (!clientId || (!allowedDomain && allowedEmails.length === 0)) {
      res.status(503).json({ error: 'Google authentication is enabled but its client ID or account allowlist is not configured.' });
      return;
    }

    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      res.status(401).json({ error: 'A valid Google sign-in is required.' });
      return;
    }

    void options.verifyToken(match[1], clientId).then((user) => {
      const emailAllowed = allowedEmails.includes(user.email.trim().toLowerCase());
      const domainAllowed = Boolean(allowedDomain && user.hostedDomain?.toLowerCase() === allowedDomain);
      if (!emailAllowed && !domainAllowed) {
        securityService.logAudit({
          eventType: 'SECURITY_AUTH_FAILURE',
          workspaceId: 'default_ws',
          userId: 'anonymous',
          ipAddress: req.ip,
          details: { path: req.path, method: req.method, reason: 'workspace_domain_not_allowed' },
        });
        res.status(403).json({ error: 'This Google Workspace domain is not allowed.' });
        return;
      }
      (req as AuthenticatedRequest).authenticatedUser = user;
      next();
    }).catch(() => {
      securityService.logAudit({
        eventType: 'SECURITY_AUTH_FAILURE',
        workspaceId: 'default_ws',
        userId: 'anonymous',
        ipAddress: req.ip,
        details: { path: req.path, method: req.method },
      });
      res.setHeader('WWW-Authenticate', 'Bearer');
      res.status(401).json({ error: 'Google sign-in could not be verified.' });
    });
  };
}

export const googleApiAuthMiddleware = createGoogleAuthMiddleware({
  enabled: () => process.env.ENABLE_AUTH === 'true',
  clientId: () => process.env.GOOGLE_CLIENT_ID,
  allowedDomain: () => process.env.GOOGLE_ALLOWED_DOMAIN,
  allowedEmails: () => process.env.GOOGLE_ALLOWED_EMAILS,
  verifyToken: verifyGoogleIdToken,
});
