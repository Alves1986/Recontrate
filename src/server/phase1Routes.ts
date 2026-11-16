import express from 'express';
import { z } from 'zod';
import { ensureSchemaAndSeed, neonEnv, pool } from '../db/index';
import { withRlsContext } from '../db/rls';
import {
  AuthService,
  sanitizeUserText,
} from '../services/authService';
import { MarketplaceDataService } from '../services/marketplaceDataService';
import {
  requireAuth,
  requireRole,
  securityHeadersMiddleware,
} from './authMiddleware';

const authService = new AuthService();
const marketplaceService = new MarketplaceDataService();

// Basic rate limiter for auth endpoints
const authRateMap = new Map<string, { count: number; resetAt: number }>();
function authRateLimit(maxPerMinute = 40): express.RequestHandler {
  return (req, res, next) => {
    const key = `${req.path}:${req.ip || 'local'}`;
    const now = Date.now();
    const entry = authRateMap.get(key);
    if (!entry || now > entry.resetAt) {
      authRateMap.set(key, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > maxPerMinute) {
      res.status(429).json({
        ok: false,
        error: 'Muitas tentativas. Aguarde 1 minuto antes de tentar novamente.',
      });
      return;
    }
    next();
  };
}

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  role: z.enum(['cliente', 'prestador']),
  alsoEnableSecondRole: z.boolean().optional(),
  category: z.string().optional(),
  lgpdConsent: z.boolean(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  resetToken: z.string().min(6),
  newPassword: z.string().min(8),
});

const OnboardingSchema = z.object({
  phone: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  category: z.string().optional(),
  bio: z.string().optional(),
  yearsExperience: z.number().int().min(0).optional(),
});

const SwitchRoleSchema = z.object({
  targetRole: z.enum(['cliente', 'prestador', 'padrinho', 'admin']),
  enableIfMissing: z.boolean().optional(),
});

const CreateServiceRequestSchema = z.object({
  categoryName: z.string().min(2),
  problemTitle: z.string().min(4),
  description: z.string().min(6),
  neighborhood: z.string().min(2),
  city: z.string().default('São Paulo, SP'),
  urgency: z.enum(['Hoje', 'Amanhã', 'Esta semana', 'Flexível']).default('Hoje'),
  preferredTime: z.string().default('Comercial'),
  estimatedBudget: z.string().optional(),
  lgpdContactConsent: z.boolean().default(true),
  customerPhone: z.string().optional(),
});

const SubmitReviewSchema = z.object({
  providerProfileId: z.string().min(2),
  serviceRequestId: z.string().uuid().optional(),
  neighborhood: z.string().default('Pinheiros'),
  serviceTitle: z.string().min(3),
  qualidade: z.number().int().min(1).max(5),
  pontualidade: z.number().int().min(1).max(5),
  comunicacao: z.number().int().min(1).max(5),
  organizacao: z.number().int().min(1).max(5),
  wouldRecommend: z.boolean().default(true),
  comment: z.string().min(4),
});

const RepeatRequestSchema = z.object({
  providerProfileId: z.string().min(2),
  categoryName: z.string().min(2),
  serviceType: z.string().min(3),
  desiredDate: z.string().min(2),
  urgency: z.string().default('Esta semana'),
  notes: z.string().optional(),
  lgpdShareConsent: z.boolean().default(true),
  customerPhone: z.string().optional(),
});

const SubstituteReferralSchema = z.object({
  customerUserId: z.string().uuid(),
  repeatRequestId: z.string().uuid().optional(),
  substituteProviderIds: z.array(z.string().min(2)),
  reasonCategory: z.string().min(3),
  customNote: z.string().min(4),
  serviceContext: z.string().min(3),
  neighborhood: z.string().default('Pinheiros'),
  urgency: z.string().default('Hoje'),
  clientConsentShared: z.boolean(),
});

const MentorshipSchema = z.object({
  menteeProviderId: z.string().min(2),
  mentorCode: z.string().min(3),
});

const UploadVerificationDocSchema = z.object({
  documentType: z.enum([
    'rg_cnh',
    'comprovante_endereco',
    'certificado_tecnico',
  ]),
  label: z.string().min(3),
  contentBase64OrText: z.string().min(4),
  contentType: z.string().optional(),
});

export function createPhase1Router(): express.Router {
  const router = express.Router();
  router.use(securityHeadersMiddleware);

  // =========================================================================
  // 1. PUBLIC ENDPOINTS (Anonymous visitors — Only public showcase & categories)
  // =========================================================================
  router.get('/public/categories', async (_req, res) => {
    try {
      await ensureSchemaAndSeed();
      const { rows } = await pool.query(
        `SELECT id, slug, name, short_desc, avg_response_min, verified_count
         FROM categories
         WHERE active = true
         ORDER BY name ASC`
      );
      res.json({ ok: true, categories: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.get('/public/providers', async (req, res) => {
    try {
      await ensureSchemaAndSeed();
      const category = req.query.category
        ? String(req.query.category)
        : undefined;
      const params: unknown[] = [];
      let whereClause = `WHERE deleted_at IS NULL`;
      if (category && category !== 'Todas') {
        params.push(category);
        whereClause += ` AND category = $1`;
      }

      // Public query omits private verification documents and raw WhatsApp before consent
      const { rows } = await pool.query(
        `SELECT id, COALESCE(slug, id) AS slug, name, category, city, neighborhoods,
                years_experience, bio, plan_slug, rating_avg, reviews_count,
                completed_jobs, response_time_minutes, response_rate_percent,
                is_verified, is_top_region, is_mentor, available_today
         FROM provider_profiles
         ${whereClause}
         ORDER BY rating_avg DESC`,
        params
      );
      res.json({ ok: true, providers: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.get('/public/providers/:slug', async (req, res) => {
    try {
      await ensureSchemaAndSeed();
      const { slug } = req.params;
      const { rows } = await pool.query(
        `SELECT id, COALESCE(slug, id) AS slug, name, category, city, neighborhoods,
                years_experience, bio, plan_slug, rating_avg, reviews_count,
                completed_jobs, response_time_minutes, response_rate_percent,
                is_verified, is_top_region, is_mentor, available_today
         FROM provider_profiles
         WHERE (slug = $1 OR id = $1) AND deleted_at IS NULL
         LIMIT 1`,
        [slug]
      );
      if (rows.length === 0) {
        res
          .status(404)
          .json({ ok: false, error: 'Profissional não encontrado.' });
        return;
      }

      const provider = rows[0];
      const { rows: reviewRows } = await pool.query(
        `SELECT id, client_name_display, neighborhood, service_title, rating, comment, created_at
         FROM reviews
         WHERE provider_profile_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [provider.id]
      );

      res.json({
        ok: true,
        provider: {
          ...provider,
          reviews: reviewRows,
        },
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  // =========================================================================
  // 2. AUTHENTICATION ENDPOINTS (Neon Auth + JWT + Role Redirects)
  // =========================================================================
  router.post('/auth/register', authRateLimit(25), async (req, res) => {
    try {
      const parsed = RegisterSchema.parse(req.body);
      const result = await authService.registerUser({
        ...parsed,
        ipAddress: req.ip,
      });

      res.cookie('confiare_session', result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        ok: true,
        ...result,
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/auth/verify-email', authRateLimit(30), async (req, res) => {
    try {
      const token = z.string().min(6).parse(req.body?.verificationToken);
      const verified = await authService.verifyEmail(token);
      res.json({ ok: true, user: verified });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/auth/login', authRateLimit(30), async (req, res) => {
    try {
      const parsed = LoginSchema.parse(req.body);
      const result = await authService.loginUser({
        ...parsed,
        ipAddress: req.ip,
      });

      res.cookie('confiare_session', result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({
        ok: true,
        ...result,
      });
    } catch (err) {
      const msg = (err as Error).message || 'Falha no login';
      const isSuspended = msg.toLowerCase().includes('suspensa');
      res.status(isSuspended ? 403 : 401).json({ ok: false, error: msg });
    }
  });

  router.get('/auth/google-url', (_req, res) => {
    const baseUrl = neonEnv.auth.baseUrl.replace(/\/$/, '');
    res.json({
      ok: true,
      provider: 'google',
      authUrl: `${baseUrl}/sign-in/social`,
      callbackUrl: '/app',
    });
  });

  router.post('/auth/forgot-password', authRateLimit(20), async (req, res) => {
    try {
      const { email } = ForgotPasswordSchema.parse(req.body);
      const result = await authService.requestPasswordReset(email);
      res.json(result);
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/auth/reset-password', authRateLimit(20), async (req, res) => {
    try {
      const parsed = ResetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(parsed);
      res.json(result);
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/auth/logout', (_req, res) => {
    res.clearCookie('confiare_session');
    res.json({ ok: true, redirectTo: '/entrar' });
  });

  router.get('/auth/me', requireAuth(authService), (req, res) => {
    res.json({
      ok: true,
      user: req.authSession,
    });
  });

  router.post(
    '/auth/onboarding',
    requireAuth(authService),
    async (req, res) => {
      try {
        const parsed = OnboardingSchema.parse(req.body || {});
        const result = await authService.completeOnboarding({
          userId: req.authSession!.userId,
          ...parsed,
        });
        res.json(result);
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/auth/switch-role',
    requireAuth(authService),
    async (req, res) => {
      try {
        const parsed = SwitchRoleSchema.parse(req.body);
        const result = await authService.switchOrAddRole({
          userId: req.authSession!.userId,
          targetRole: parsed.targetRole,
          enableIfMissing: parsed.enableIfMissing,
        });

        res.cookie('confiare_session', result.token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000,
        });

        res.json({ ok: true, ...result });
      } catch (err) {
        res.status(403).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  // =========================================================================
  // 3. PROTECTED AUTHENTICATED ROUTES (/api/app/* & /api/admin/* with RLS)
  // =========================================================================

  // 3.1. Customer Routes (/api/app/cliente/*)
  router.get(
    '/app/cliente/requests',
    requireRole(['cliente', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const rows = await withRlsContext(
          {
            userId: session.userId,
            role: session.activeRole === 'admin' ? 'admin' : 'cliente',
          },
          async (client) => {
            const q = await client.query(
              `SELECT * FROM service_requests
               WHERE deleted_at IS NULL
               ORDER BY created_at DESC`
            );
            return q.rows;
          }
        );

        res.json({ ok: true, requests: rows });
      } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/app/cliente/requests',
    requireRole(['cliente', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const parsed = CreateServiceRequestSchema.parse(req.body);

        const result = await marketplaceService.createServiceRequestAndDispatch({
          customerUserId: session.userId,
          customerName: session.fullName,
          customerPhone: parsed.customerPhone || '(11) 99000-0000',
          categoryName: parsed.categoryName,
          problemTitle: parsed.problemTitle,
          description: parsed.description,
          neighborhood: parsed.neighborhood,
          city: parsed.city,
          urgency: parsed.urgency,
          preferredTime: parsed.preferredTime,
          estimatedBudget: parsed.estimatedBudget,
          lgpdContactConsent: parsed.lgpdContactConsent,
        });

        await authService.logAudit({
          actorUserId: session.userId,
          actorRole: 'cliente',
          action: 'service_request_created',
          targetType: 'service_request',
          targetId: result.request.id,
          metadata: { dispatchedCount: result.dispatchedCount },
          ipAddress: req.ip,
        });

        res.status(201).json({
          ok: true,
          request: result.request,
          dispatchedCount: result.dispatchedCount,
          opportunities: result.opportunities,
        });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/app/cliente/reviews',
    requireRole(['cliente', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const parsed = SubmitReviewSchema.parse(req.body);

        const result =
          await marketplaceService.submitReviewAndRecalculateReputation({
            customerUserId: session.userId,
            customerName: session.fullName,
            providerProfileId: parsed.providerProfileId,
            serviceRequestId: parsed.serviceRequestId,
            neighborhood: parsed.neighborhood,
            serviceTitle: parsed.serviceTitle,
            qualidade: parsed.qualidade,
            pontualidade: parsed.pontualidade,
            comunicacao: parsed.comunicacao,
            organizacao: parsed.organizacao,
            wouldRecommend: parsed.wouldRecommend,
            comment: parsed.comment,
          });

        await authService.logAudit({
          actorUserId: session.userId,
          actorRole: 'cliente',
          action: 'review_submitted_reputation_updated',
          targetType: 'provider_profile',
          targetId: parsed.providerProfileId,
          metadata: { rating: result.review.rating },
          ipAddress: req.ip,
        });

        res.status(201).json({ ok: true, ...result });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/app/cliente/repeat-requests',
    requireRole(['cliente', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const parsed = RepeatRequestSchema.parse(req.body);

        const created = await marketplaceService.createRepeatRequest({
          customerUserId: session.userId,
          customerName: session.fullName,
          customerPhone: parsed.customerPhone || '(11) 99000-0000',
          providerProfileId: parsed.providerProfileId,
          categoryName: parsed.categoryName,
          serviceType: parsed.serviceType,
          desiredDate: parsed.desiredDate,
          urgency: parsed.urgency,
          notes: parsed.notes,
          lgpdShareConsent: parsed.lgpdShareConsent,
        });

        await authService.logAudit({
          actorUserId: session.userId,
          actorRole: 'cliente',
          action: 'repeat_request_created',
          targetType: 'repeat_request',
          targetId: created.id,
          ipAddress: req.ip,
        });

        res.status(201).json({ ok: true, repeatRequest: created });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.get(
    '/app/cliente/trust-list',
    requireRole(['cliente', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const rows = await marketplaceService.getCustomerTrustList(
          session.userId
        );
        res.json({ ok: true, trustList: rows });
      } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  // 3.2. Provider Routes (/api/app/prestador/*) with strict LGPD Contact Masking
  router.get(
    '/app/prestador/opportunities',
    requireRole(['prestador', 'padrinho', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const rows = await withRlsContext(
          {
            userId: session.userId,
            role: session.activeRole === 'admin' ? 'admin' : 'prestador',
            providerProfileId: session.providerProfileId,
          },
          async (client) => {
            const q = await client.query(
              `SELECT * FROM opportunities ORDER BY created_at DESC`
            );
            return q.rows;
          }
        );

        // LGPD enforcement: never expose client_name_full or client_whatsapp until status === 'aceita' AND lgpd_contact_consent === true
        const sanitizedOpportunities = rows.map((opp: any) => {
          const canReleaseContact =
            opp.status === 'aceita' &&
            Boolean(opp.lgpd_contact_consent) &&
            Boolean(opp.contact_released);

          return {
            id: opp.id,
            serviceRequestId: opp.service_request_id,
            providerProfileId: opp.provider_profile_id,
            category: opp.category_name,
            title: opp.title,
            description: opp.description,
            neighborhood: opp.neighborhood,
            distanceKm: Number(opp.distance_km),
            urgency: opp.urgency,
            preferredTime: opp.preferred_time,
            clientNameMasked: opp.client_name_masked,
            clientNameFull: canReleaseContact ? opp.client_name_full : null,
            clientWhatsapp: canReleaseContact ? opp.client_whatsapp : null,
            contactReleased: canReleaseContact,
            origin: opp.origin,
            status: opp.status,
            createdAt: opp.created_at,
          };
        });

        res.json({ ok: true, opportunities: sanitizedOpportunities });
      } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/app/prestador/opportunities/:id/accept',
    requireRole(['prestador', 'padrinho', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const oppId = req.params.id;

        const updated = await withRlsContext(
          {
            userId: session.userId,
            role: session.activeRole === 'admin' ? 'admin' : 'prestador',
            providerProfileId: session.providerProfileId,
          },
          async (client) => {
            const check = await client.query(
              `SELECT * FROM opportunities WHERE id = $1::uuid`,
              [oppId]
            );
            if (check.rows.length === 0) {
              throw new Error(
                'Oportunidade não encontrada ou pertence a outro prestador (bloqueado por RLS).'
              );
            }
            const opp = check.rows[0];
            if (!opp.lgpd_contact_consent) {
              throw new Error(
                'O cliente não autorizou o compartilhamento de contato para esta solicitação.'
              );
            }

            const upd = await client.query(
              `UPDATE opportunities
               SET status = 'aceita',
                   contact_released = true,
                   contact_released_at = NOW(),
                   updated_at = NOW()
               WHERE id = $1::uuid
               RETURNING *`,
              [oppId]
            );
            return upd.rows[0];
          }
        );

        await authService.logAudit({
          actorUserId: session.userId,
          actorRole: session.activeRole,
          action: 'opportunity_accepted_contact_released',
          targetType: 'opportunity',
          targetId: oppId,
          ipAddress: req.ip,
        });

        res.json({
          ok: true,
          opportunity: {
            id: updated.id,
            status: updated.status,
            contactReleased: true,
            clientNameFull: updated.client_name_full,
            clientWhatsapp: updated.client_whatsapp,
          },
        });
      } catch (err) {
        res.status(403).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/app/prestador/substitute-referrals',
    requireRole(['prestador', 'padrinho', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        if (!session.providerProfileId) {
          throw new Error('Perfil de prestador não identificado.');
        }
        const parsed = SubstituteReferralSchema.parse(req.body);
        const referral = await marketplaceService.createSubstituteReferral({
          originalProviderId: session.providerProfileId,
          customerUserId: parsed.customerUserId,
          repeatRequestId: parsed.repeatRequestId,
          substituteProviderIds: parsed.substituteProviderIds,
          reasonCategory: parsed.reasonCategory,
          customNote: parsed.customNote,
          serviceContext: parsed.serviceContext,
          neighborhood: parsed.neighborhood,
          urgency: parsed.urgency,
          clientConsentShared: parsed.clientConsentShared,
        });

        res.status(201).json({ ok: true, referral });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.get(
    '/app/substitute-referrals',
    requireAuth(authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const referrals =
          await marketplaceService.getSubstituteReferralsForActor({
            userId: session.userId,
            role: session.activeRole,
            providerProfileId: session.providerProfileId,
          });
        res.json({ ok: true, referrals });
      } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/app/prestador/verification-documents',
    requireRole(['prestador', 'padrinho', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        if (!session.providerProfileId) {
          throw new Error('Perfil de prestador não encontrado para upload.');
        }
        const parsed = UploadVerificationDocSchema.parse(req.body);
        const doc = await marketplaceService.uploadVerificationDocument({
          actorUserId: session.userId,
          actorRole:
            session.activeRole === 'admin'
              ? 'admin'
              : session.activeRole === 'padrinho'
                ? 'padrinho'
                : 'prestador',
          providerProfileId: session.providerProfileId,
          documentType: parsed.documentType,
          label: parsed.label,
          contentBase64OrText: parsed.contentBase64OrText,
          contentType: parsed.contentType,
        });

        await authService.logAudit({
          actorUserId: session.userId,
          actorRole: session.activeRole,
          action: 'verification_document_uploaded',
          targetType: 'storage_asset',
          targetId: doc.id,
          ipAddress: req.ip,
        });

        res.status(201).json({ ok: true, document: doc });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.get(
    '/app/prestador/verification-documents',
    requireAuth(authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const targetProviderProfileId = req.query.providerProfileId
          ? String(req.query.providerProfileId)
          : undefined;

        const documents = await marketplaceService.getVerificationDocuments({
          userId: session.userId,
          role: session.activeRole,
          providerProfileId: session.providerProfileId,
          targetProviderProfileId,
        });

        res.json({ ok: true, documents });
      } catch (err) {
        res.status(403).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  // 3.3. Padrinho Routes (/api/app/padrinho/*)
  router.get(
    '/app/padrinho/mentees',
    requireRole(['padrinho', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const rows = await withRlsContext(
          {
            userId: session.userId,
            role: session.activeRole === 'admin' ? 'admin' : 'padrinho',
            providerProfileId: session.providerProfileId,
          },
          async (client) => {
            const q = await client.query(
              `SELECT m.*, pp.name AS mentee_name, pp.category AS mentee_category, pp.rating_avg
               FROM mentorships m
               LEFT JOIN provider_profiles pp ON pp.id = m.mentee_provider_id
               ORDER BY m.created_at DESC`
            );
            return q.rows;
          }
        );
        res.json({ ok: true, mentees: rows });
      } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/app/padrinho/mentorships',
    requireRole(['padrinho', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        if (!session.providerProfileId) {
          throw new Error('Perfil de padrinho não vinculado.');
        }
        const parsed = MentorshipSchema.parse(req.body);
        const mentorship = await marketplaceService.createMentorship({
          mentorProviderId: session.providerProfileId,
          menteeProviderId: parsed.menteeProviderId,
          mentorCode: parsed.mentorCode,
          actorUserId: session.userId,
          actorRole: session.activeRole === 'admin' ? 'admin' : 'padrinho',
        });

        await authService.logAudit({
          actorUserId: session.userId,
          actorRole: session.activeRole,
          action: 'mentorship_created',
          targetType: 'mentorship',
          targetId: mentorship.id,
          ipAddress: req.ip,
        });

        res.status(201).json({ ok: true, mentorship });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  // 3.4. Admin User & Provider Management & Audit Logs (/api/admin/*)
  router.get(
    '/admin/providers',
    requireRole(['admin'], authService),
    async (_req, res) => {
      try {
        const { rows } = await pool.query(
          `SELECT id, slug, name, category, city, plan_slug, rating_avg,
                  reviews_count, completed_jobs, verification_status, is_verified, created_at
           FROM provider_profiles
           WHERE deleted_at IS NULL
           ORDER BY created_at DESC`
        );
        res.json({ ok: true, providers: rows });
      } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.patch(
    '/admin/providers/:providerId/verify',
    requireRole(['admin'], authService),
    async (req, res) => {
      try {
        const decision = z
          .enum(['aprovado', 'rejeitado'])
          .parse(req.body?.decision);
        const updated =
          await marketplaceService.adminVerifyProviderRegistration({
            adminUserId: req.authSession!.userId,
            providerProfileId: req.params.providerId,
            decision,
            notes: req.body?.notes,
          });
        res.json({ ok: true, provider: updated });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.get(
    '/admin/audit-logs',
    requireRole(['admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const rows = await withRlsContext(
          {
            userId: session.userId,
            role: 'admin',
          },
          async (client) => {
            const q = await client.query(
              `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`
            );
            return q.rows;
          }
        );
        res.json({ ok: true, auditLogs: rows });
      } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.patch(
    '/admin/users/:userId',
    requireRole(['admin'], authService),
    async (req, res) => {
      try {
        const updated = await authService.adminUpdateUserRoleOrStatus({
          adminUserId: req.authSession!.userId,
          targetUserId: req.params.userId,
          status: req.body?.status,
          roles: req.body?.roles,
          activeRole: req.body?.activeRole,
        });
        res.json({ ok: true, user: updated });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  return router;
}
