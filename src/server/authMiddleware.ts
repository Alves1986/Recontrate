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

export function isCompactJwt(token?: string | null): boolean {
  return Boolean(token && token.split('.').length === 3 && token.length > 20);
}

export function extractAuthTokenCandidates(req: express.Request): string[] {
  const rawCandidates: string[] = [];

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer && bearer !== 'undefined' && bearer !== 'null') {
      rawCandidates.push(bearer);
    }
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('confiare_session='));
    if (match) {
      const cookieVal = decodeURIComponent(match.split('=')[1] || '').trim();
      if (cookieVal && cookieVal !== 'undefined' && cookieVal !== 'null') {
        rawCandidates.push(cookieVal);
      }
    }
  }

  const deduped = Array.from(new Set(rawCandidates));
  return deduped.sort((a, b) => Number(isCompactJwt(b)) - Number(isCompactJwt(a)));
}

export function extractBearerOrCookieToken(req: express.Request): string | null {
  return extractAuthTokenCandidates(req)[0] ?? null;
}

export function requireAuth(authService = new AuthService()): express.RequestHandler {
  return async (req, res, next) => {
    const candidates = extractAuthTokenCandidates(req);
    if (candidates.length === 0) {
      res.status(401).json({
        ok: false,
        error: 'Autenticação obrigatória para acessar esta rota.',
        redirectTo: '/entrar',
      });
      return;
    }

    let lastErr: Error | null = null;
    for (const token of candidates) {
      try {
        const session = await authService.verifySessionToken(token);
        req.authSession = session;
        next();
        return;
      } catch (err) {
        lastErr = err as Error;
        if (lastErr.message?.toLowerCase().includes('suspensa')) {
          break;
        }
      }
    }

    const rawMsg = lastErr?.message || 'Sessão inválida';
    const isSuspended = rawMsg.toLowerCase().includes('suspensa');
    res.status(isSuspended ? 403 : 401).json({
      ok: false,
      error: isSuspended
        ? rawMsg
        : 'Sua sessão expirou ou é inválida. Faça login novamente para continuar.',
      redirectTo: '/entrar',
    });
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
