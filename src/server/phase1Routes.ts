import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { ensureSchemaAndSeed, neonEnv, pool } from '../db/index';
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from '../config/legalIdentity';
import {
  hasSufficientReputationHistory,
} from '../utils/marketplaceRules';
import {
  assertRealExternalActionAllowed,
  getNodeEnvironment,
  getRuntimeConfigSnapshot,
  isDemoModeEnabled,
  isProductionEnvironment,
} from '../config/environment';
import { withRlsContext } from '../db/rls';
import {
  AuthService,
  sanitizeUserText,
} from '../services/authService';
import { MarketplaceDataService } from '../services/marketplaceDataService';
import { SpecialtiesTaxonomyService } from '../services/specialtiesService';
import {
  INITIAL_TAXONOMY_CATEGORIES,
  slugifyTaxonomyTerm,
} from '../data/taxonomySeed';
import {
  requireAuth,
  requireRole,
  securityHeadersMiddleware,
} from './authMiddleware';
import { ProviderReferralService } from '../services/providerReferralService';

const authService = new AuthService();
const marketplaceService = new MarketplaceDataService();
const taxonomyService = new SpecialtiesTaxonomyService();
const referralService = new ProviderReferralService();

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
  bio: z.string().max(600).optional(),
  categoryId: z.string().uuid().optional(),
  specialtyIds: z.array(z.string().uuid()).min(1).max(5).optional(),
  principalSpecialtyId: z.string().uuid().optional(),
  lgpdConsent: z.boolean(),
  referralCode: z.string().trim().max(32).optional(),
});

const DirectReferralInviteSchema = z.object({
  referredName: z.string().trim().min(2),
  referredPhone: z.string().trim().min(8),
  referredEmail: z.string().email().optional().or(z.literal('')),
  referredCategory: z.string().optional(),
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
  enforceOfficialSpecialties: z.boolean().optional(),
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
  serviceRequestId: z.string().uuid(),
  displayPublicName: z.boolean().optional().default(false),
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

  const fallbackCategoriesWithSpecialties = INITIAL_TAXONOMY_CATEGORIES.map(
    (cat, idx) => ({
      id: `cat-${cat.slug}`,
      nome: cat.nome,
      slug: cat.slug,
      descricao: cat.descricao,
      icone: cat.icone,
      ativo: true,
      ordem_exibicao: idx + 1,
      specialties: cat.specialties.map((spec, sIdx) => ({
        id: `spec-${cat.slug}-${sIdx + 1}`,
        category_id: `cat-${cat.slug}`,
        nome: spec.nome,
        slug: slugifyTaxonomyTerm(spec.nome),
        sinonimos: spec.sinonimos || [],
        ativo: true,
        ordem_exibicao: sIdx + 1,
      })),
    })
  );

  // =========================================================================
  // 1. PUBLIC ENDPOINTS (Anonymous visitors — Only approved public showcase)
  // =========================================================================
  router.get('/public/runtime-config', (_req, res) => {
    res.json({
      ok: true,
      ...getRuntimeConfigSnapshot(),
    });
  });

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
    } catch {
      res.json({ ok: true, categories: [] });
    }
  });

  router.get('/public/providers', async (req, res) => {
    try {
      await ensureSchemaAndSeed();
      const category = req.query.category
        ? String(req.query.category)
        : undefined;
      const params: unknown[] = [];
      let whereClause = `WHERE deleted_at IS NULL AND verification_status = 'aprovado'`;
      if (!isDemoModeEnabled()) {
        whereClause += ` AND id NOT IN ('prov-joao', 'prov-carlos', 'prov-ana')
          AND id NOT LIKE 'demo-%'
          AND id NOT LIKE 'prov-launch-%'
          AND id NOT LIKE 'prov-abuse-%'
          AND id NOT LIKE 'prov-notice-%'
          AND NOT EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = provider_profiles.user_id
              AND (u.email LIKE '%@example.com' OR u.email LIKE '%@demo.confiare.invalid')
          )`;
      }
      if (category && category !== 'Todas') {
        params.push(category);
        whereClause += ` AND category = $1`;
      }

      // Public query omits private verification documents, raw WhatsApp, and immature scores (< 3 reviews/jobs)
      const { rows } = await pool.query(
        `SELECT id, COALESCE(slug, id) AS slug, name, category, city, neighborhoods,
                years_experience, bio, plan_slug, rating_avg, reviews_count,
                completed_jobs, response_time_minutes, response_rate_percent,
                profile_completeness_percent,
                is_verified, is_top_region, is_mentor, available_today
         FROM provider_profiles
         ${whereClause}
         ORDER BY (CASE WHEN reviews_count >= 3 AND completed_jobs >= 3 THEN rating_avg ELSE 0 END) DESC, created_at DESC`,
        params
      );
      const providers = rows.map((row: any) => {
        const hasSufficient = hasSufficientReputationHistory({
          reviewsCount: row.reviews_count,
          completedJobs: row.completed_jobs,
        });
        return {
          ...row,
          has_sufficient_reputation: hasSufficient,
          rating_avg: hasSufficient ? Number(row.rating_avg || 0) : null,
          public_score: hasSufficient ? Number(row.rating_avg || 0) : null,
          reputation_label: hasSufficient
            ? 'Reputação verificada'
            : 'Em avaliação inicial',
        };
      });
      res.json({ ok: true, providers });
    } catch {
      res.json({ ok: true, providers: [] });
    }
  });

  router.post('/public/waitlist', authRateLimit(20), async (req, res) => {
    try {
      await ensureSchemaAndSeed();
      const schema = z.object({
        email: z.string().trim().email('Informe um e-mail válido.'),
        location: z.string().trim().min(2, 'Informe cidade ou bairro.').max(160),
        category: z.string().trim().min(2, 'Informe a categoria de interesse.').max(120),
        roleInterest: z.enum(['cliente', 'prestador']).default('cliente'),
        lgpdConsent: z.literal(true, {
          message:
            'É necessário marcar o consentimento LGPD para registrar interesse.',
        }),
        honeypot: z.string().optional(),
      });
      const parsed = schema.parse(req.body || {});
      if (parsed.honeypot && parsed.honeypot.trim().length > 0) {
        res.json({ ok: true, accepted: true });
        return;
      }

      const ipHash = crypto
        .createHash('sha256')
        .update(String(req.ip || 'unknown'))
        .digest('hex');

      const { rows } = await pool.query<{ id: string; created_at: Date }>(
        `INSERT INTO waitlist_leads (
          email, location, category, role_interest, lgpd_consent, lgpd_consent_at,
          terms_version, privacy_version, ip_hash
        ) VALUES ($1, $2, $3, $4, true, NOW(), $5, $6, $7)
        RETURNING id, created_at`,
        [
          sanitizeUserText(parsed.email.toLowerCase()),
          sanitizeUserText(parsed.location),
          sanitizeUserText(parsed.category),
          parsed.roleInterest,
          CURRENT_TERMS_VERSION,
          CURRENT_PRIVACY_VERSION,
          ipHash,
        ]
      );

      res.status(201).json({
        ok: true,
        leadId: rows[0].id,
        createdAt: rows[0].created_at,
        message: `Interesse registrado para ${parsed.category} em ${parsed.location}.`,
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.get('/taxonomy/categories', async (_req, res) => {
    try {
      const categories = await taxonomyService.listCategoriesWithSpecialties();
      res.json({ ok: true, categories });
    } catch {
      res.json({ ok: true, categories: fallbackCategoriesWithSpecialties });
    }
  });

  router.get('/taxonomy/specialties', async (req, res) => {
    try {
      const categoryId = req.query.categoryId
        ? String(req.query.categoryId)
        : undefined;
      const query = req.query.q ? String(req.query.q) : undefined;
      const specialties = await taxonomyService.searchOfficialSpecialties({
        categoryId,
        query,
      });
      res.json({ ok: true, specialties });
    } catch {
      const categoryId = req.query.categoryId
        ? String(req.query.categoryId)
        : undefined;
      const q = req.query.q ? String(req.query.q).toLowerCase() : '';
      const cat = fallbackCategoriesWithSpecialties.find(
        (c) => c.id === categoryId
      );
      const list = (cat ? cat.specialties : fallbackCategoriesWithSpecialties.flatMap((c) => c.specialties)).filter(
        (sp) => !q || sp.nome.toLowerCase().includes(q)
      );
      res.json({ ok: true, specialties: list });
    }
  });

  router.get('/taxonomy/similar', async (req, res) => {
    try {
      const q = req.query.q ? String(req.query.q) : '';
      const categoryId = req.query.categoryId
        ? String(req.query.categoryId)
        : undefined;
      if (!q.trim()) {
        res.json({ ok: true, similar: [] });
        return;
      }
      const similar = await taxonomyService.findSimilarOfficialSpecialties(
        q,
        categoryId
      );
      res.json({ ok: true, similar });
    } catch {
      res.json({ ok: true, similar: [] });
    }
  });


  router.get('/public/providers/match', async (req, res) => {
    try {
      const categoryName = req.query.category
        ? String(req.query.category)
        : undefined;
      const searchText = req.query.q ? String(req.query.q) : undefined;
      const neighborhood = req.query.neighborhood
        ? String(req.query.neighborhood)
        : undefined;
      const matches = await marketplaceService.findMatchingProviders({
        categoryName,
        searchText,
        neighborhood,
      });
      res.json({ ok: true, matches });
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
                years_experience, bio, specialties, plan_slug, rating_avg, reviews_count,
                completed_jobs, response_time_minutes, response_rate_percent,
                profile_completeness_percent, is_verified, is_top_region, is_mentor, available_today
         FROM provider_profiles
         WHERE (slug = $1 OR id = $1)
           AND deleted_at IS NULL
           AND verification_status = 'aprovado'
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
      const hasSufficient = hasSufficientReputationHistory({
        reviewsCount: provider.reviews_count,
        completedJobs: provider.completed_jobs,
      });
      const [reviewRes, publicTaxonomy] = await Promise.all([
        pool.query(
          `SELECT id, client_name_display, neighborhood, service_title, rating, comment, created_at
           FROM reviews
           WHERE provider_profile_id = $1
           ORDER BY created_at DESC
           LIMIT 20`,
          [provider.id]
        ),
        taxonomyService.getPublicProviderTaxonomy(provider.id),
      ]);

      res.json({
        ok: true,
        provider: {
          ...provider,
          has_sufficient_reputation: hasSufficient,
          rating_avg: hasSufficient ? Number(provider.rating_avg || 0) : null,
          public_score: hasSufficient ? Number(provider.rating_avg || 0) : null,
          reputation_label: hasSufficient
            ? 'Reputação verificada'
            : 'Em avaliação inicial',
          reviews: reviewRes.rows,
          officialSpecialties: publicTaxonomy.officialSpecialties,
          approvedTags: publicTaxonomy.approvedTags,
        },
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  const shouldUseSecureCookies = () =>
    isProductionEnvironment() ||
    getNodeEnvironment() === 'staging' ||
    process.env.VERCEL_ENV === 'production';

  // =========================================================================
  // 2. AUTHENTICATION ENDPOINTS (Neon Auth + JWT + Role Redirects)
  // =========================================================================
  router.post('/auth/register', authRateLimit(25), async (req, res) => {
    try {
      const signupGuard = assertRealExternalActionAllowed('signup', req.headers as Record<string, string | string[] | undefined>);
      if (!signupGuard.allowed) {
        res.status(403).json({ ok: false, error: signupGuard.reason });
        return;
      }
      const parsed = RegisterSchema.parse(req.body);
      const result = await authService.registerUser({
        ...parsed,
        ipAddress: req.ip,
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
      });

      res.status(201).json({
        ok: true,
        requiresEmailVerification: result.requiresEmailVerification,
        message: result.message,
        user: result.user,
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/auth/verify-email', authRateLimit(30), async (req, res) => {
    try {
      const token = z.string().min(6).parse(req.body?.verificationToken);
      const verified = await authService.verifyEmail(token);
      res.cookie('confiare_session', verified.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: shouldUseSecureCookies(),
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.json({
        ok: true,
        user: verified.user,
        token: verified.token,
        redirectTo: verified.redirectTo,
      });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/auth/resend-verification', authRateLimit(15), async (req, res) => {
    try {
      const { email } = ForgotPasswordSchema.parse(req.body);
      const result = await authService.resendVerificationEmail(email);
      res.json(result);
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
        secure: shouldUseSecureCookies(),
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.json({
        ok: true,
        ...result,
      });
    } catch (err) {
      const msg = (err as Error).message || 'Falha no login';
      const code = (err as { code?: string })?.code;
      if (code === 'EMAIL_NOT_VERIFIED') {
        res.status(403).json({
          ok: false,
          code: 'EMAIL_NOT_VERIFIED',
          error: msg,
          redirectTo: '/verificar-email',
        });
        return;
      }
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

  router.get('/auth/me', requireAuth(authService), async (req, res) => {
    const token = await authService
      .mintSessionToken(req.authSession!)
      .catch(() => undefined);
    res.json({
      ok: true,
      user: req.authSession,
      token,
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
        if (result.token) {
          res.cookie('confiare_session', result.token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: shouldUseSecureCookies(),
            path: '/',
            maxAge: 24 * 60 * 60 * 1000,
          });
        }
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
          secure: shouldUseSecureCookies(),
          path: '/',
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

  router.patch(
    '/app/cliente/requests/:id/complete',
    requireRole(['cliente', 'admin'], authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const requestId = z.string().uuid().parse(req.params.id);
        const updated = await marketplaceService.completeServiceRequest({
          requestId,
          customerUserId: session.userId,
        });

        await authService.logAudit({
          actorUserId: session.userId,
          actorRole: 'cliente',
          action: 'service_request_completed',
          targetType: 'service_request',
          targetId: requestId,
          ipAddress: req.ip,
        });

        res.json({ ok: true, request: updated });
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
            displayPublicName: parsed.displayPublicName,
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
          metadata: {
            rating: result.review.rating,
            serviceRequestId: parsed.serviceRequestId,
          },
          ipAddress: req.ip,
        });

        res.status(201).json({ ok: true, ...result });
      } catch (err: any) {
        const status = err?.code === 'DUPLICATE_REVIEW' ? 409 : 400;
        res.status(status).json({
          ok: false,
          ...(err?.code ? { code: err.code } : {}),
          error: (err as Error).message,
        });
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
            customerUserId: opp.customer_user_id,
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
    '/app/prestador/opportunities/:id/decline',
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
              `SELECT id FROM opportunities WHERE id = $1::uuid`,
              [oppId]
            );
            if (check.rows.length === 0) {
              throw new Error(
                'Oportunidade não encontrada ou pertence a outro prestador.'
              );
            }
            const upd = await client.query(
              `UPDATE opportunities
               SET status = 'recusada',
                   updated_at = NOW()
               WHERE id = $1::uuid
               RETURNING id, status`,
              [oppId]
            );
            return upd.rows[0];
          }
        );

        await authService.logAudit({
          actorUserId: session.userId,
          actorRole: session.activeRole,
          action: 'opportunity_declined',
          targetType: 'opportunity',
          targetId: oppId,
          ipAddress: req.ip,
        });

        res.json({ ok: true, opportunity: updated });
      } catch (err) {
        res.status(403).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.get(
    '/app/prestador/profile',
    requireRole(['prestador', 'padrinho', 'admin'], authService),
    async (req, res) => {
      try {
        await ensureSchemaAndSeed();
        const session = req.authSession!;
        if (!session.providerProfileId) {
          res
            .status(404)
            .json({ ok: false, error: 'Perfil de prestador não identificado.' });
          return;
        }
        const { rows } = await pool.query(
          `SELECT id, slug, name, category, bio, city, neighborhoods, years_experience,
                  plan_slug, available_today, is_verified, is_top_region, is_mentor,
                  verification_status, rating_avg, reviews_count, completed_jobs,
                  response_time_minutes, response_rate_percent, profile_completeness_percent,
                  whatsapp, radius_km
           FROM provider_profiles
           WHERE id = $1 AND deleted_at IS NULL
           LIMIT 1`,
          [session.providerProfileId]
        );
        if (rows.length === 0) {
          res
            .status(404)
            .json({ ok: false, error: 'Perfil de prestador não encontrado.' });
          return;
        }
        const row = rows[0];
        const hasSufficient = hasSufficientReputationHistory({
          reviewsCount: row.reviews_count,
          completedJobs: row.completed_jobs,
        });
        res.json({
          ok: true,
          profile: {
            id: row.id,
            slug: row.slug,
            name: row.name,
            category: row.category,
            bio: row.bio || '',
            city: row.city || '',
            neighborhoods: Array.isArray(row.neighborhoods) ? row.neighborhoods : [],
            yearsExperience: Number(row.years_experience || 0),
            planSlug: row.plan_slug || 'gratuito',
            availableToday: Boolean(row.available_today),
            isVerified: Boolean(row.is_verified),
            isTopRegion: Boolean(row.is_top_region),
            isMentor: Boolean(row.is_mentor),
            verificationStatus: row.verification_status,
            hasSufficientReputation: hasSufficient,
            ratingAvg: hasSufficient ? Number(row.rating_avg || 0) : 0,
            reviewsCount: Number(row.reviews_count || 0),
            completedJobs: Number(row.completed_jobs || 0),
            responseTimeMinutes: Number(row.response_time_minutes || 0),
            responseRatePercent: Number(row.response_rate_percent || 0),
            profileCompletenessPercent: Number(row.profile_completeness_percent || 0),
            whatsapp: row.whatsapp || '',
            radiusKm: Number(row.radius_km || 10),
          },
        });
      } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.patch(
    '/app/prestador/profile',
    requireRole(['prestador', 'padrinho', 'admin'], authService),
    async (req, res) => {
      try {
        await ensureSchemaAndSeed();
        const session = req.authSession!;
        if (!session.providerProfileId) {
          res
            .status(404)
            .json({ ok: false, error: 'Perfil de prestador não identificado.' });
          return;
        }
        const schema = z.object({
          availableToday: z.boolean().optional(),
          bio: z.string().max(600).optional(),
          neighborhoods: z.array(z.string().min(2)).max(20).optional(),
          city: z.string().min(2).max(120).optional(),
          whatsapp: z.string().min(8).max(30).optional(),
        });
        const parsed = schema.parse(req.body || {});
        const sets: string[] = [];
        const params: unknown[] = [session.providerProfileId];
        if (typeof parsed.availableToday === 'boolean') {
          params.push(parsed.availableToday);
          sets.push(`available_today = $${params.length}`);
        }
        if (typeof parsed.bio === 'string') {
          params.push(sanitizeUserText(parsed.bio));
          sets.push(`bio = $${params.length}`);
        }
        if (Array.isArray(parsed.neighborhoods)) {
          params.push(parsed.neighborhoods.map((n) => sanitizeUserText(n)));
          sets.push(`neighborhoods = $${params.length}::text[]`);
        }
        if (typeof parsed.city === 'string') {
          params.push(sanitizeUserText(parsed.city));
          sets.push(`city = $${params.length}`);
        }
        if (typeof parsed.whatsapp === 'string') {
          params.push(sanitizeUserText(parsed.whatsapp));
          sets.push(`whatsapp = $${params.length}`);
        }
        if (sets.length === 0) {
          res
            .status(400)
            .json({ ok: false, error: 'Nenhum campo válido informado para atualização.' });
          return;
        }
        sets.push('updated_at = NOW()');
        const { rows } = await pool.query(
          `UPDATE provider_profiles
           SET ${sets.join(', ')}
           WHERE id = $1 AND deleted_at IS NULL
           RETURNING id, available_today, bio, neighborhoods, city, whatsapp`,
          params
        );
        if (rows.length === 0) {
          res
            .status(404)
            .json({ ok: false, error: 'Perfil de prestador não encontrado.' });
          return;
        }

        await authService.logAudit({
          actorUserId: session.userId,
          actorRole: session.activeRole,
          action: 'provider_profile_updated',
          targetType: 'provider_profile',
          targetId: session.providerProfileId,
          ipAddress: req.ip,
        });

        res.json({
          ok: true,
          profile: {
            id: rows[0].id,
            availableToday: Boolean(rows[0].available_today),
            bio: rows[0].bio || '',
            neighborhoods: Array.isArray(rows[0].neighborhoods)
              ? rows[0].neighborhoods
              : [],
            city: rows[0].city || '',
            whatsapp: rows[0].whatsapp || '',
          },
        });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
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

  // 3.2. Provider Taxonomy, Suggestions & Custom Tags (/api/app/prestador/*)
  router.get(
    '/app/prestador/taxonomy',
    requireRole(['prestador', 'padrinho', 'admin'], authService),
    async (req, res) => {
      const session = req.authSession!;
      const isAdmin =
        session.activeRole === 'admin' || session.roles.includes('admin');
      const providerProfileId =
        isAdmin && req.query.providerProfileId
          ? String(req.query.providerProfileId)
          : session.providerProfileId;
      if (!providerProfileId) {
        res
          .status(400)
          .json({ ok: false, error: 'Perfil de prestador não identificado.' });
        return;
      }
      try {
        const overview = await taxonomyService.getProviderTaxonomyOverview(
          providerProfileId
        );
        res.json({ ok: true, ...overview });
      } catch (err) {
        res.status(500).json({
          ok: false,
          error:
            (err as Error).message ||
            'Não foi possível carregar as especialidades no servidor.',
        });
      }
    }
  );

  router.put(
    '/app/prestador/specialties',
    requireRole(['prestador', 'padrinho', 'admin'], authService),
    async (req, res) => {
      const providerProfileId = req.authSession?.providerProfileId;
      if (!providerProfileId) {
        res
          .status(400)
          .json({ ok: false, error: 'Perfil de prestador não identificado.' });
        return;
      }
      const schema = z.object({
        categoryId: z.string().min(1),
        specialtyIds: z.array(z.string().min(1)).min(1).max(5),
        principalSpecialtyId: z.string().optional(),
      });
      try {
        const parsed = schema.parse(req.body || {});
        const saved = await taxonomyService.setProviderOfficialSpecialties({
          providerProfileId,
          categoryId: parsed.categoryId,
          specialtyIds: parsed.specialtyIds,
          principalSpecialtyId: parsed.principalSpecialtyId,
        });
        res.json({ ok: true, ...saved });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );


  router.post(
    '/app/prestador/specialty-suggestions',
    requireRole(['prestador', 'padrinho', 'admin'], authService),
    async (req, res) => {
      try {
        const providerProfileId = req.authSession?.providerProfileId;
        if (!providerProfileId) {
          throw new Error('Perfil de prestador não identificado.');
        }
        const schema = z.object({
          categoryId: z.string().uuid(),
          nomeSugerido: z.string().min(1),
          descricao: z.string().optional(),
        });
        const parsed = schema.parse(req.body || {});
        const created = await taxonomyService.createSpecialtySuggestion({
          providerProfileId,
          categoryId: parsed.categoryId,
          nomeSugerido: parsed.nomeSugerido,
          descricao: parsed.descricao,
        });
        res.status(201).json({ ok: true, ...created });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/app/prestador/custom-tags',
    requireRole(['prestador', 'padrinho', 'admin'], authService),
    async (req, res) => {
      try {
        const providerProfileId = req.authSession?.providerProfileId;
        if (!providerProfileId) {
          throw new Error('Perfil de prestador não identificado.');
        }
        const schema = z.object({
          tag: z.string().min(1),
          requireHumanReview: z.boolean().optional(),
        });
        const parsed = schema.parse(req.body || {});
        const created = await taxonomyService.addProviderCustomTag({
          providerProfileId,
          tag: parsed.tag,
          requireHumanReview: parsed.requireHumanReview,
        });
        res.status(201).json({ ok: true, tag: created });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.delete(
    '/app/prestador/custom-tags/:tagId',
    requireRole(['prestador', 'padrinho', 'admin'], authService),
    async (req, res) => {
      try {
        const providerProfileId = req.authSession?.providerProfileId;
        if (!providerProfileId) {
          throw new Error('Perfil de prestador não identificado.');
        }
        const removed = await taxonomyService.removeProviderCustomTag(
          providerProfileId,
          req.params.tagId
        );
        res.json({ ok: true, tag: removed });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  // Admin Taxonomy Moderation Routes (/api/admin/taxonomy/*)
  router.get(
    '/admin/taxonomy/suggestions',
    requireRole(['admin'], authService),
    async (_req, res) => {
      try {
        const queue = await taxonomyService.listAdminModerationQueue();
        res.json({ ok: true, ...queue });
      } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/admin/taxonomy/suggestions/:id/moderate',
    requireRole(['admin'], authService),
    async (req, res) => {
      try {
        const schema = z.object({
          decision: z.enum([
            'aprovar_nova',
            'aprovar_sinonimo',
            'mesclar',
            'reprovar',
            'solicitar_correcao',
          ]),
          targetSpecialtyId: z.string().uuid().optional(),
          categoryId: z.string().uuid().optional(),
          motivoRejeicao: z.string().optional(),
        });
        const parsed = schema.parse(req.body || {});
        const result = await taxonomyService.moderateSuggestion({
          suggestionId: req.params.id,
          adminUserId: req.authSession?.userId || null,
          decision: parsed.decision,
          targetSpecialtyId: parsed.targetSpecialtyId,
          categoryId: parsed.categoryId,
          motivoRejeicao: parsed.motivoRejeicao,
        });
        res.json({ ok: true, ...result });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.patch(
    '/admin/taxonomy/tags/:tagId',
    requireRole(['admin'], authService),
    async (req, res) => {
      try {
        const schema = z.object({
          status: z.enum(['aprovado', 'reprovado', 'removido']),
          motivo: z.string().optional(),
        });
        const parsed = schema.parse(req.body || {});
        const updated = await taxonomyService.moderateCustomTag({
          tagId: req.params.tagId,
          adminUserId: req.authSession?.userId || null,
          status: parsed.status,
          motivo: parsed.motivo,
        });
        res.json({ ok: true, tag: updated });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
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

  // =========================================================================
  // 4. PROGRAMA DE INDICAÇÃO DE PROFISSIONAIS (+15 DIAS GRÁTIS)
  // =========================================================================
  router.get('/public/referrals/validate/:code', async (req, res) => {
    try {
      const result = await referralService.validateAndTrackCodeVisit(
        String(req.params.code)
      );
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.get(
    '/app/referrals/dashboard',
    requireAuth(authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const dashboard = await referralService.getReferralDashboardForUser(
          session.userId,
          session.providerProfileId
        );
        res.json({ ok: true, ...dashboard });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/app/referrals/invite',
    requireAuth(authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const parsed = DirectReferralInviteSchema.parse(req.body || {});
        const result = await referralService.createDirectInvite({
          referrerUserId: session.userId,
          referrerProviderProfileId: session.providerProfileId,
          referredName: parsed.referredName,
          referredPhone: parsed.referredPhone,
          referredEmail: parsed.referredEmail || undefined,
          referredCategory: parsed.referredCategory || undefined,
        });

        await authService
          .logAudit({
            actorUserId: session.userId,
            actorRole: session.activeRole,
            action: 'provider_referral_invite_created',
            targetType: 'provider_referral',
            targetId: result.invite.id,
            ipAddress: req.ip,
          })
          .catch(() => null);

        res.status(201).json({ ok: true, ...result });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/app/referrals/apply-days',
    requireAuth(authService),
    async (req, res) => {
      try {
        const session = req.authSession!;
        const result =
          await referralService.applyAvailableDaysToReferrerSubscription(
            session.userId,
            req.body?.subscriptionId ? String(req.body.subscriptionId) : undefined
          );
        res.json({ ok: true, ...result });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  return router;
}
