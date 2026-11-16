import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ensureSchemaAndSeed, pool } from '../db/index';
import { AsaasBillingAdapter } from './billingProvider';
import { SubscriptionLifecycleService } from './subscriptionLifecycle';
import {
  AdAndMetricsService,
  calculateAdCtrPercent,
  calculateEstimatedAdRevenueCents,
  validateAdSlotContent,
} from './adAndMetricsService';

test.after(async () => {
  await pool.end();
});

test('1. Client never sees ads across all client flow surfaces and client UI components', async () => {
  await ensureSchemaAndSeed();
  const adService = new AdAndMetricsService();
  const lifecycle = new SubscriptionLifecycleService(
    new AsaasBillingAdapter({ apiKey: '' })
  );

  const freeProvId = `prov-ad-free-${Date.now()}`;
  await lifecycle.startCheckout({
    providerProfileId: freeProvId,
    providerName: 'Prestador Gratuito Ads',
    providerEmail: 'adfree@confiare.com.br',
    providerPhone: '(11) 99111-0001',
    planSlug: 'gratuito',
    cycle: 'mensal',
    paymentMethod: 'pix',
  });

  // Every client journey surface and screen ID must strictly return null
  const clientSurfaces = [
    'fluxo_busca_cliente',
    'fluxo_solicitacao_cliente',
    'fluxo_selecao_prestador',
    'fluxo_liberacao_contato',
    'home',
    'cadastro-cliente',
    'criar-solicitacao',
    'profissionais-compativeis',
    'perfil-prestador',
    'solicitar-novamente',
    'indicacao-substituto',
    'avaliacao-pos-atendimento',
  ] as const;

  for (const surface of clientSurfaces) {
    const ad = await adService.getEligibleAdForSurface({
      surface,
      providerProfileId: freeProvId,
      sessionBannersShown: 0,
    });
    assert.equal(ad, null, `Client flow surface "${surface}" must never return an ad`);
  }

  // Verify client-facing React components contain zero ad slots or "Patrocinado" banners
  const clientComponentFiles = [
    'src/components/HomeScreen.tsx',
    'src/components/AuthRegistrationScreens.tsx',
    'src/components/ServiceRequestAndListScreens.tsx',
    'src/components/ProviderProfileAndRepeatScreens.tsx',
    'src/components/SubstituteAndReviewScreens.tsx',
  ];
  for (const filePath of clientComponentFiles) {
    const src = readFileSync(filePath, 'utf-8');
    assert.equal(
      src.includes('/api/ads/provider-panel'),
      false,
      `${filePath} must never call the ads endpoint`
    );
    assert.equal(
      src.includes('Oferta Patrocinada'),
      false,
      `${filePath} must never render sponsored ad banners`
    );
  }
});

test('2. Paid plans (Essencial, Profissional, Premium, Padrinho) never see ads on the provider panel', async () => {
  await ensureSchemaAndSeed();
  const adService = new AdAndMetricsService();
  const lifecycle = new SubscriptionLifecycleService(
    new AsaasBillingAdapter({ apiKey: '' })
  );

  for (const paidSlug of ['essencial', 'profissional', 'premium', 'padrinho']) {
    const paidProvId = `prov-ad-${paidSlug}-${Date.now()}`;
    const paidCheckout = await lifecycle.startCheckout({
      providerProfileId: paidProvId,
      providerName: `Prestador ${paidSlug}`,
      providerEmail: `${paidSlug}@confiare.com.br`,
      providerPhone: '(11) 99111-0002',
      planSlug: paidSlug,
      cycle: 'mensal',
      paymentMethod: 'pix',
    });
    await lifecycle.activateSubscription(paidCheckout.subscription.id);

    const paidAd = await adService.getEligibleAdForSurface({
      surface: 'painel_prestador',
      providerProfileId: paidProvId,
      sessionBannersShown: 0,
    });
    assert.equal(
      paidAd,
      null,
      `Paid plan "${paidSlug}" must never display ads on the provider panel`
    );
  }
});

test('3. Gratuito provider panel enforces max 1 banner/session, max 3 impressions/day, and "Patrocinado" badge', async () => {
  await ensureSchemaAndSeed();
  const adService = new AdAndMetricsService();
  const lifecycle = new SubscriptionLifecycleService(
    new AsaasBillingAdapter({ apiKey: '' })
  );

  const freeProvId = `prov-ad-cap-${Date.now()}`;
  await lifecycle.startCheckout({
    providerProfileId: freeProvId,
    providerName: 'Prestador Gratuito Cap',
    providerEmail: 'adcap@confiare.com.br',
    providerPhone: '(11) 99111-0003',
    planSlug: 'gratuito',
    cycle: 'mensal',
    paymentMethod: 'pix',
  });

  // Session 1, Impression 1 -> allowed with badge 'Patrocinado'
  const imp1 = await adService.getEligibleAdForSurface({
    surface: 'painel_prestador',
    providerProfileId: freeProvId,
    sessionBannersShown: 0,
  });
  assert.ok(imp1);
  assert.equal(imp1.badge, 'Patrocinado');
  assert.equal(imp1.dailyImpressionsUsed, 1);
  assert.equal(imp1.dailyImpressionsLimit, 3);

  // Same session (sessionBannersShown = 1) -> blocked (max 1 banner per session)
  const sameSession = await adService.getEligibleAdForSurface({
    surface: 'painel_prestador',
    providerProfileId: freeProvId,
    sessionBannersShown: 1,
  });
  assert.equal(sameSession, null, 'Max 1 banner per panel session');

  // Session 2 & 3 on same day -> impressions 2 and 3 allowed
  const imp2 = await adService.getEligibleAdForSurface({
    surface: 'painel_prestador',
    providerProfileId: freeProvId,
    sessionBannersShown: 0,
  });
  assert.ok(imp2);
  assert.equal(imp2.dailyImpressionsUsed, 2);

  const imp3 = await adService.getEligibleAdForSurface({
    surface: 'painel_prestador',
    providerProfileId: freeProvId,
    sessionBannersShown: 0,
  });
  assert.ok(imp3);
  assert.equal(imp3.dailyImpressionsUsed, 3);

  // Session 4 on same day -> blocked (max 3 impressions per provider per day)
  const imp4 = await adService.getEligibleAdForSurface({
    surface: 'painel_prestador',
    providerProfileId: freeProvId,
    sessionBannersShown: 0,
  });
  assert.equal(imp4, null, 'Max 3 impressions per provider per day');
});

test('4. Admin CRUD (create, pause, resume, schedule, delete) and metrics (impressions, clicks, CTR, estimated revenue)', async () => {
  await ensureSchemaAndSeed();
  const adService = new AdAndMetricsService();

  // Forbidden content must be rejected
  assert.equal(
    validateAdSlotContent({
      nome: 'Ganhe dinheiro na Bet Cassino',
      categoria: 'ferramentas',
      anunciante: 'Bet123',
      texto: 'Aposte agora',
    }).valid,
    false
  );

  // Create valid ad slot
  const created = await adService.createAdSlot({
    nome: 'Seguro Responsabilidade Civil para Eletricistas e Encanadores',
    tipo: 'banner_painel_prestador',
    categoria: 'seguros',
    anunciante: 'Porto Profissional SP',
    imagemUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758',
    linkDestino: 'https://seguros.confiare.com.br',
    texto: 'Proteção contra danos acidentais em atendimentos residenciais.',
    prioridade: 20,
  });
  assert.equal(created.badge, 'Patrocinado');
  assert.equal(created.status, 'ativo');

  // Record click and check CTR / estimated revenue calculation
  const clicked = await adService.recordAdClick(created.id, 'prov-joao');
  assert.equal(clicked.cliques, 1);
  assert.equal(
    calculateEstimatedAdRevenueCents(10, 2),
    10 * 15 + 2 * 120 // 150 + 240 = 390 centavos
  );
  assert.equal(calculateAdCtrPercent(10, 2), 20);

  // Pause ad slot
  const paused = await adService.updateAdSlot(created.id, {
    status: 'pausado',
  });
  assert.equal(paused.status, 'pausado');

  // Reactivate and update priority
  const resumed = await adService.updateAdSlot(created.id, {
    status: 'ativo',
    prioridade: 15,
  });
  assert.equal(resumed.status, 'ativo');
  assert.equal(resumed.prioridade, 15);

  // Check dedicated analytics report
  const report = await adService.getAdsAnalyticsReport();
  assert.equal(report.compliance.badgeRequired, 'Patrocinado');
  assert.equal(report.compliance.clientFlowAdsCount, 0);
  assert.equal(report.compliance.maxBannersPerSession, 1);
  assert.equal(report.compliance.maxImpressionsPerProviderPerDay, 3);
  assert.ok(report.totalImpressions >= 3);
  assert.ok(report.totalClicks >= 1);
  assert.ok(report.estimatedRevenueCents > 0);

  // Delete ad slot
  const deleted = await adService.deleteAdSlot(created.id);
  assert.equal(deleted.deleted, true);
});
