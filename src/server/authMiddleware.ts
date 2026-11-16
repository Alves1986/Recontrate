import type express from 'express';
import {
  AuthService,
  type AuthenticatedUserSession,
  type UserRole,
} from '../services/authService';

declare global {
  namespace Express {
    interface Request {
      authSession?: AuthenticatedUserSession;
    }
  }
}

export function securityHeadersMiddleware(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  next();
}

export function extractBearerOrCookieToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('confiare_session='));
    if (match) {
      return decodeURIComponent(match.split('=')[1] || '');
    }
  }
  return null;
}

export function requireAuth(authService = new AuthService()): express.RequestHandler {
  return async (req, res, next) => {
    const token = extractBearerOrCookieToken(req);
    if (!token) {
      res.status(401).json({
        ok: false,
        error: 'Autenticação obrigatória para acessar esta rota.',
        redirectTo: '/entrar',
      });
      return;
    }

    try {
      const session = await authService.verifySessionToken(token);
      req.authSession = session;
      next();
    } catch (err) {
      const msg = (err as Error).message || 'Sessão inválida';
      const isSuspended = msg.toLowerCase().includes('suspensa');
      res.status(isSuspended ? 403 : 401).json({
        ok: false,
        error: msg,
        redirectTo: '/entrar',
      });
    }
  };
}

export function requireRole(
  allowedRoles: UserRole[],
  authService = new AuthService()
): express.RequestHandler {
  const baseAuth = requireAuth(authService);
  return (req, res, next) => {
    baseAuth(req, res, () => {
      const session = req.authSession;
      if (!session) {
        res.status(401).json({
          ok: false,
          error: 'Sessão não encontrada.',
          redirectTo: '/entrar',
        });
        return;
      }

      const hasAllowedRole =
        allowedRoles.includes(session.activeRole) ||
        session.roles.some((r) => allowedRoles.includes(r));

      if (!hasAllowedRole) {
        res.status(403).json({
          ok: false,
          error: `Acesso negado: esta área exige papel [${allowedRoles.join(', ')}], mas seu papel ativo é "${session.activeRole}".`,
          redirectTo: session.redirectTo,
        });
        return;
      }

      next();
    });
  };
}
