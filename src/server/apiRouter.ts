import express from 'express';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db, ensureSchemaAndSeed } from '../db/index';
import {
  adSlots,
  invoices,
  plans,
  processedWebhookEvents,
  subscriptionEvents,
  subscriptions,
} from '../db/schema';
import {
  sealProviderNotificationsQuery,
  testAiGatewayService,
  testAuthService,
  testFunctionsService,
  testObjectStorageService,
  testPostgresService,
  testRealtimeService,
} from './neonServices';
import { SubscriptionLifecycleService } from '../services/subscriptionLifecycle';
import { OpportunityLimitService } from '../services/opportunityLimitService';
import {
  AdAndMetricsService,
  generateAdsTxtContent,
  type AdContextSurface,
} from '../services/adAndMetricsService';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { createPhase1Router } from './phase1Routes';
import { extractBearerOrCookieToken } from './authMiddleware';
import { AuthService } from '../services/authService';
import { MonitoringAndBackupService } from '../services/monitoringAndBackupService';
import {
  checkLaunchOfferEligibility,
  getLaunchOfferAdminAnalytics,
  notifyUpcomingLaunchOfferEnd,
  updateLaunchOfferCampaign,
} from '../services/launchOfferService';

const lifecycleService = new SubscriptionLifecycleService();
const limitService = new OpportunityLimitService();
const adAndMetricsService = new AdAndMetricsService();
const authService = new AuthService();
const monitoringService = new MonitoringAndBackupService();

// Simple in-memory rate limiter for checkout and webhook endpoints
const rateLimitWindowMs = 60_000;
const rateLimitCounters = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequestsPerMinute: number): express.RequestHandler {
  return (req, res, next) => {
    const key = `${req.path}:${req.ip || 'local'}`;
    const now = Date.now();
    const entry = rateLimitCounters.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitCounters.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > maxRequestsPerMinute) {
      res.status(429).json({
        ok: false,
        error: 'Rate limit excedido. Tente novamente em instantes.',
      });
      return;
    }
    next();
  };
}

async function requireAdminRole(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = extractBearerOrCookieToken(req);
  if (token) {
    try {
      const session = await authService.verifySessionToken(token);
      if (session.activeRole === 'admin' || session.roles.includes('admin')) {
        req.authSession = session;
        next();
        return;
      }
      res.status(403).json({
        ok: false,
        error: 'Acesso negado: permissão de administrador obrigatória.',
      });
      return;
    } catch {
      res.status(401).json({
        ok: false,
        error: 'Sessão administrativa inválida.',
      });
      return;
    }
  }

  const role = req.headers['x-user-role'];
  if (process.env.NODE_ENV !== 'production' && role === 'admin') {
    next();
    return;
  }
  res.status(403).json({
    ok: false,
    error: 'Acesso negado: permissão de administrador obrigatória.',
  });
}

async function requireAdminInProd(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (process.env.NODE_ENV !== 'production') {
    next();
    return;
  }
  await requireAdminRole(req, res, next);
}

const MonitoringAlertSchema = z.object({
  source: z.string().min(2),
  message: z.string().min(3),
  severity: z.enum(['warning', 'critical']).default('warning'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const CheckoutSchema = z.object({
  providerProfileId: z.string().min(1),
  providerName: z.string().min(2),
  providerEmail: z.string().email(),
  providerPhone: z.string().min(8),
  planSlug: z.enum([
    'gratuito',
    'essencial',
    'profissional',
    'premium',
    'padrinho',
  ]),
  cycle: z.enum(['mensal', 'anual']).default('mensal'),
  paymentMethod: z.enum(['pix', 'cartao', 'boleto']).default('pix'),
  applyLaunchOffer: z.boolean().optional(),
  cpfCnpj: z.string().optional(),
  deviceFingerprint: z.string().optional(),
});

const UpgradeSchema = z.object({
  targetPlanSlug: z.enum([
    'essencial',
    'profissional',
    'premium',
    'padrinho',
  ]),
  targetCycle: z.enum(['mensal', 'anual']).optional(),
  paymentMethod: z.enum(['pix', 'cartao', 'boleto']).optional(),
});

const DowngradeSchema = z.object({
  targetPlanSlug: z.enum([
    'gratuito',
    'essencial',
    'profissional',
    'premium',
  ]),
});

export function createApiRouter(): express.Router {
  const router = express.Router();

  // 1. Secure Webhook Endpoint: reads raw body BEFORE express.json()
  router.post(
    '/webhooks/billing',
    rateLimit(120),
    express.raw({ type: '*/*' }),
    async (req, res) => {
      try {
        const rawBody = Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from(
              typeof req.body === 'string'
                ? req.body
                : JSON.stringify(req.body || {}),
              'utf-8'
            );

        const result = await lifecycleService.processWebhook(
          rawBody,
          req.headers as Record<string, string | string[] | undefined>
        );
        res.status(result.duplicate ? 200 : 202).json(result);
      } catch (err) {
        const msg = (err as Error).message || 'Webhook error';
        const isAuthErr = msg.includes('signature token');
        res.status(isAuthErr ? 401 : 400).json({ ok: false, error: msg });
      }
    }
  );

  // Standard JSON parser for all other routes
  router.use(express.json());

  // 1.5. Public Uptime / Availability Healthcheck
  router.get('/health', async (_req, res) => {
    try {
      const health = await monitoringService.getSystemHealth();
      res.status(200).json({ ok: true, ...health });
    } catch (err) {
      res.status(503).json({
        ok: false,
        status: 'degraded',
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Mount Phase 1 Public, Auth, and Role-Protected Routes
  router.use(createPhase1Router());

  // 2. Plans & Provider Subscription Routes
  router.get('/plans', async (_req, res) => {
    try {
      await ensureSchemaAndSeed();
      const allPlans = await db
        .select()
        .from(plans)
        .orderBy(plans.ordemExibicao);
      res.json({ ok: true, plans: allPlans });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.get('/providers/:providerId/subscription', async (req, res) => {
    try {
      const { providerId } = req.params;
      // Anti-IDOR check if x-provider-id header is passed
      const callerProviderId = req.headers['x-provider-id'];
      const callerRole = req.headers['x-user-role'];
      if (
        callerProviderId &&
        callerProviderId !== providerId &&
        callerRole !== 'admin'
      ) {
        res.status(403).json({
          ok: false,
          error: 'Acesso negado (proteção contra IDOR).',
        });
        return;
      }

      const [summary, usage] = await Promise.all([
        lifecycleService.getProviderSubscriptionSummary(providerId),
        limitService.getUsageStatus(providerId),
      ]);

      res.json({
        ok: true,
        ...summary,
        usage,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.get('/promotions/launch-offer/eligibility', async (req, res) => {
    try {
      const providerProfileId = req.query.providerProfileId
        ? String(req.query.providerProfileId)
        : undefined;
      const email = req.query.email ? String(req.query.email) : undefined;
      const phone = req.query.phone ? String(req.query.phone) : undefined;
      const cpfCnpj = req.query.cpfCnpj ? String(req.query.cpfCnpj) : undefined;
      const planSlug = req.query.planSlug
        ? String(req.query.planSlug)
        : undefined;
      const cycle = req.query.cycle ? String(req.query.cycle) : 'mensal';
      const deviceFingerprint = req.query.deviceFingerprint
        ? String(req.query.deviceFingerprint)
        : undefined;

      const eligibility = await checkLaunchOfferEligibility(
        {
          userId: req.authSession?.userId || null,
          email,
          phone,
          cpfCnpj,
          deviceFingerprint,
          ipAddress: req.ip,
        },
        {
          providerProfileId,
          whatsapp: phone,
          cpfCnpj,
        },
        {
          planSlug,
          cycle,
        }
      );

      res.json({ ok: true, ...eligibility });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post(
    '/subscriptions/checkout',
    rateLimit(30),
    async (req, res) => {
      try {
        const parsed = CheckoutSchema.parse(req.body);
        const result = await lifecycleService.startCheckout({
          ...parsed,
          ipAddress: req.ip,
          userId: req.authSession?.userId,
        });
        res.status(201).json({ ok: true, ...result });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post('/subscriptions/:id/upgrade', async (req, res) => {
    try {
      const parsed = UpgradeSchema.parse(req.body);
      const result = await lifecycleService.upgradeSubscription({
        subscriptionId: req.params.id,
        ...parsed,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/subscriptions/:id/downgrade', async (req, res) => {
    try {
      const parsed = DowngradeSchema.parse(req.body);
      const result = await lifecycleService.scheduleDowngrade({
        subscriptionId: req.params.id,
        targetPlanSlug: parsed.targetPlanSlug,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/subscriptions/:id/cancel', async (req, res) => {
    try {
      const reason = req.body?.reason || 'Cancelamento solicitado no painel';
      const updated = await lifecycleService.cancelSubscription(
        req.params.id,
        reason
      );
      res.json({ ok: true, subscription: updated });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  // 3. Opportunity Dispatch & Usage
  router.post('/opportunities/dispatch', async (req, res) => {
    try {
      const providerProfileId = z
        .string()
        .min(1)
        .parse(req.body?.providerProfileId);
      const result = await limitService.recordOpportunitySent(
        providerProfileId
      );
      res.status(result.allowed ? 200 : 403).json({ ok: result.allowed, ...result });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  // 4. Moderated Ads (Provider Panel Only)
  router.get('/ads/ads.txt', (_req, res) => {
    const cfg = adAndMetricsService.getGoogleAdSenseConfig();
    res.type('text/plain').send(generateAdsTxtContent(cfg.clientId));
  });

  router.get('/ads/provider-panel', async (req, res) => {
    try {
      const surface =
        (req.query.surface as AdContextSurface) || 'painel_prestador';
      const providerProfileId = String(req.query.providerProfileId || '');
      const sessionBannersShown = Number(req.query.sessionBannersShown || 0);
      const preferNetwork = req.query.preferNetwork as
        | 'google_adsense'
        | 'direto'
        | undefined;

      const ad = await adAndMetricsService.getEligibleAdForSurface({
        surface,
        providerProfileId,
        sessionBannersShown,
        preferNetwork,
      });
      res.json({ ok: true, ad });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/ads/:adId/impression', async (req, res) => {
    try {
      const providerProfileId = z
        .string()
        .min(1)
        .parse(req.body?.providerProfileId);
      const updated = await adAndMetricsService.recordAdImpression(
        req.params.adId,
        providerProfileId
      );
      res.json({ ok: true, ad: updated });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/ads/:adId/click', async (req, res) => {
    try {
      const providerProfileId = z
        .string()
        .min(1)
        .parse(req.body?.providerProfileId);
      const updated = await adAndMetricsService.recordAdClick(
        req.params.adId,
        providerProfileId
      );
      res.json({ ok: true, ad: updated });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  // 5. Admin Routes (RBAC protected)
  router.get('/admin/metrics', requireAdminRole, async (_req, res) => {
    try {
      const metrics = await adAndMetricsService.getAdminMetrics();
      res.json({ ok: true, metrics });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.get('/admin/subscriptions', requireAdminRole, async (_req, res) => {
    try {
      await ensureSchemaAndSeed();
      const [allSubs, allInvoices, allEvents, allWebhooks, allAds] =
        await Promise.all([
          db.select().from(subscriptions).orderBy(desc(subscriptions.criadoEm)),
          db.select().from(invoices).orderBy(desc(invoices.criadoEm)),
          db
            .select()
            .from(subscriptionEvents)
            .orderBy(desc(subscriptionEvents.criadoEm)),
          db
            .select()
            .from(processedWebhookEvents)
            .orderBy(desc(processedWebhookEvents.criadoEm)),
          db.select().from(adSlots).orderBy(desc(adSlots.prioridade)),
        ]);

      res.json({
        ok: true,
        subscriptions: allSubs,
        invoices: allInvoices,
        events: allEvents,
        webhookEvents: allWebhooks,
        ads: allAds,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.patch('/admin/plans/:id', requireAdminRole, async (req, res) => {
    try {
      const UpdatePlanSchema = z.object({
        precoMensalCentavos: z.number().int().min(0).optional(),
        precoAnualCentavos: z.number().int().min(0).optional(),
        limiteOportunidadesMensal: z.number().int().min(1).optional(),
        prioridadeMatching: z.number().int().min(0).max(12).optional(),
        ativo: z.boolean().optional(),
      });
      const data = UpdatePlanSchema.parse(req.body);
      const [updated] = await db
        .update(plans)
        .set({ ...data, atualizadoEm: new Date() })
        .where(eq(plans.id, req.params.id))
        .returning();
      res.json({ ok: true, plan: updated });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.get('/admin/ads', requireAdminRole, async (_req, res) => {
    try {
      const report = await adAndMetricsService.getAdsAnalyticsReport();
      res.json({ ok: true, ...report });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.patch('/admin/ads/google-config', requireAdminRole, (req, res) => {
    try {
      const updated = adAndMetricsService.updateGoogleAdSenseConfig(
        req.body || {}
      );
      try {
        writeFileSync(
          path.resolve(process.cwd(), 'public/ads.txt'),
          generateAdsTxtContent(updated.clientId),
          'utf-8'
        );
      } catch {
        // Ignore read-only filesystem in serverless environments
      }
      res.json({ ok: true, googleAdSense: updated });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/admin/ads', requireAdminRole, async (req, res) => {
    try {
      const created = await adAndMetricsService.createAdSlot(req.body);
      res.status(201).json({ ok: true, ad: created });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.patch('/admin/ads/:adId', requireAdminRole, async (req, res) => {
    try {
      const updated = await adAndMetricsService.updateAdSlot(
        req.params.adId,
        req.body || {}
      );
      res.json({ ok: true, ad: updated });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  router.delete('/admin/ads/:adId', requireAdminRole, async (req, res) => {
    try {
      const deleted = await adAndMetricsService.deleteAdSlot(req.params.adId);
      res.json({ ok: true, ...deleted });
    } catch (err) {
      res.status(400).json({ ok: false, error: (err as Error).message });
    }
  });

  // 5.4. Admin Promotional Campaigns & Conversion/Retention Reports
  router.get('/admin/promotions', requireAdminRole, async (_req, res) => {
    try {
      const analytics = await getLaunchOfferAdminAnalytics();
      res.json({ ok: true, ...analytics });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.patch(
    '/admin/promotions/:campaignId',
    requireAdminRole,
    async (req, res) => {
      try {
        const schema = z.object({
          status: z
            .enum(['rascunho', 'ativo', 'pausado', 'encerrado'])
            .optional(),
          dataInicio: z.string().optional(),
          dataFim: z.string().optional(),
          limiteTotalResgates: z.number().int().min(1).optional(),
        });
        const parsed = schema.parse(req.body || {});
        const updated = await updateLaunchOfferCampaign(
          req.params.campaignId,
          parsed
        );
        res.json({ ok: true, campaign: updated });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/admin/promotions/notify-ending',
    requireAdminRole,
    async (req, res) => {
      try {
        const daysBeforeEnd = Number(req.body?.daysBeforeEnd ?? 7);
        const result = await notifyUpcomingLaunchOfferEnd(daysBeforeEnd);
        res.json({ ok: true, ...result });
      } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  // 5.5. Admin System Health, Backups & Error Alerts
  router.get('/admin/system-health', requireAdminRole, async (_req, res) => {
    try {
      const health = await monitoringService.getSystemHealth();
      res.json({
        ok: true,
        ...health,
        integrations: {
          emailConfigured: Boolean(
            process.env.RESEND_API_KEY &&
              !process.env.RESEND_API_KEY.startsWith('YOUR_')
          ),
          whatsappConfigured: Boolean(
            process.env.WHATSAPP_BUSINESS_TOKEN &&
              process.env.WHATSAPP_PHONE_NUMBER_ID &&
              !process.env.WHATSAPP_BUSINESS_TOKEN.startsWith('YOUR_')
          ),
          googleMapsConfigured: Boolean(
            process.env.GOOGLE_MAPS_API_KEY &&
              !process.env.GOOGLE_MAPS_API_KEY.startsWith('YOUR_')
          ),
          asaasConfigured: Boolean(
            process.env.ASAAS_API_KEY &&
              !process.env.ASAAS_API_KEY.startsWith('YOUR_')
          ),
        },
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post(
    '/admin/backups/snapshot',
    requireAdminRole,
    async (req, res) => {
      try {
        const snapshot = await monitoringService.createDatabaseBackupSnapshot(
          req.authSession?.userId
        );
        res.status(201).json({ ok: true, backup: snapshot });
      } catch (err) {
        res.status(500).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  router.post(
    '/admin/monitoring/alerts',
    requireAdminRole,
    async (req, res) => {
      try {
        const parsed = MonitoringAlertSchema.parse(req.body || {});
        const result = await monitoringService.recordErrorAlert({
          source: parsed.source,
          message: parsed.message,
          severity: parsed.severity,
          metadata: parsed.metadata,
          actorUserId: req.authSession?.userId,
        });
        res.status(201).json({ ok: true, alert: result });
      } catch (err) {
        res.status(400).json({ ok: false, error: (err as Error).message });
      }
    }
  );

  // 6. Neon Services E2E Verification Routes (protected as admin in production)
  router.get('/neon/postgres', requireAdminInProd, async (_req, res) => {
    try {
      res.json(await testPostgresService());
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/neon/auth', requireAdminInProd, async (_req, res) => {
    try {
      res.json(await testAuthService());
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/neon/storage', requireAdminInProd, async (req, res) => {
    try {
      res.json(await testObjectStorageService(req.body?.title));
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/neon/ai-gateway', requireAdminInProd, async (req, res) => {
    try {
      res.json(await testAiGatewayService(req.body?.prompt));
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.get('/neon/functions', requireAdminInProd, async (_req, res) => {
    try {
      res.json(await testFunctionsService());
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/neon/realtime/seal', requireAdminInProd, async (req, res) => {
    try {
      const providerId = req.body?.providerId || 'prov-joao';
      res.json(await sealProviderNotificationsQuery(providerId));
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.post('/neon/realtime/test', requireAdminInProd, async (req, res) => {
    try {
      const providerId = req.body?.providerId || 'prov-joao';
      res.json(await testRealtimeService(providerId));
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  router.get('/neon/verify-all', requireAdminInProd, async (_req, res) => {
    try {
      const [postgres, auth, storage, aiGateway, functions, realtime] =
        await Promise.all([
          testPostgresService(),
          testAuthService(),
          testObjectStorageService(),
          testAiGatewayService(),
          testFunctionsService(),
          testRealtimeService(),
        ]);

      const allPassed =
        postgres.ok &&
        auth.ok &&
        storage.ok &&
        aiGateway.ok &&
        functions.ok &&
        realtime.ok;

      res.status(allPassed ? 200 : 500).json({
        ok: allPassed,
        project: 'fancy-field-77458599',
        branch: 'production',
        services: {
          postgres,
          auth,
          storage,
          aiGateway,
          functions,
          realtime,
        },
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  return router;
}
