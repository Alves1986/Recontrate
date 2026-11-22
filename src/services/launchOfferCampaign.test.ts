import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { ensureSchemaAndSeed, pool } from '../db/index';
import { setEmailDeliveryObserverForTests } from './essentialIntegrations';
import {
  advancePromotionalCycleOrReturnFullPrice,
  checkLaunchOfferEligibility,
  LAUNCH_OFFER_PRICES_CENTAVOS,
  LAUNCH_OFFER_SLUG,
} from './launchOfferService';

let server: Server;
let baseUrl: string;
let adminToken = '';
const TEST_ASAAS_WEBHOOK_TOKEN =
  process.env.ASAAS_WEBHOOK_TOKEN || 'test_wh_secret_confiare_2026';

function nextUniqueValidCpf(): string {
  const baseNum = 100_000_000 + Math.floor(Math.random() * 899_999_999);
  const base = String(baseNum);
  if (/^(\d)\1{8}$/.test(base)) {
    return nextUniqueValidCpf();
  }
  const calc = (digits: string, startWeight: number) => {
    let sum = 0;
    for (let i = 0; i < digits.length; i += 1) {
      sum += Number(digits[i]) * (startWeight - i);
    }
    const rem = (sum * 10) % 11;
    return rem >= 10 ? 0 : rem;
  };
  const d1 = calc(base, 10);
  const d2 = calc(`${base}${d1}`, 11);
  return `${base}${d1}${d2}`;
}

test.before(async () => {
  process.env.ASAAS_WEBHOOK_TOKEN = TEST_ASAAS_WEBHOOK_TOKEN;
  await ensureSchemaAndSeed();
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });

  const email = `admin.launch.test.${Date.now()}@example.com`;
  const password = 'Confiare#2026!Password';
  let capturedVfy = '';
  setEmailDeliveryObserverForTests((d) => {
    if (d.to === email && d.variables.verificationToken) {
      capturedVfy = d.variables.verificationToken;
    }
  });
  let regBody: any;
  try {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        fullName: 'Admin Launch Offer Test',
        role: 'cliente',
        birthDate: '1990-05-15',
        lgpdConsent: true,
      }),
    });
    regBody = (await regRes.json()) as any;
    await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationToken: capturedVfy }),
    });
  } finally {
    setEmailDeliveryObserverForTests(null);
  }
  await pool.query(
    `UPDATE users SET roles = ARRAY['admin']::TEXT[], active_role = 'admin', onboarding_completed = true WHERE id = $1::uuid`,
    [regBody.user.userId]
  );
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  adminToken = ((await loginRes.json()) as any).token;
});

test.after(async () => {
  setEmailDeliveryObserverForTests(null);
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await pool.end();
});

async function seedIsolatedProvider(id: string, phone: string) {
  await pool.query(
    `INSERT INTO provider_profiles (
      id, slug, name, category, city, plan_slug, whatsapp
    ) VALUES ($1, $1, $2, 'Eletricista', 'São Paulo, SP', 'gratuito', $3)
    ON CONFLICT (id) DO NOTHING`,
    [id, `Prestador ${id}`, phone]
  );
}

test('1. Valores exatos da campanha em centavos e exclusão de Gratuito e Anual', async () => {
  assert.deepEqual(LAUNCH_OFFER_PRICES_CENTAVOS, {
    essencial: { full: 2990, promo: 0 },
    profissional: { full: 5990, promo: 0 },
    premium: { full: 9990, promo: 0 },
  });

  const ts = Date.now();
  const freeCheck = await checkLaunchOfferEligibility(
    { email: `free.${ts}@example.com`, phone: '(11) 98111-0001' },
    { providerProfileId: `prov-free-${ts}` },
    { planSlug: 'gratuito', cycle: 'mensal' }
  );
  assert.equal(freeCheck.eligible, false);
  assert.equal(
    freeCheck.reason,
    'Esta oferta não está disponível para o plano selecionado.'
  );

  const annualCheck = await checkLaunchOfferEligibility(
    { email: `annual.${ts}@example.com`, phone: '(11) 98111-0002' },
    { providerProfileId: `prov-annual-${ts}` },
    { planSlug: 'profissional', cycle: 'anual' }
  );
  assert.equal(annualCheck.eligible, false);
  assert.equal(
    annualCheck.reason,
    'Esta oferta não está disponível para o plano selecionado.'
  );
});

test('2. Fluxo Completo: GET bloqueado (405) -> POST elegibilidade -> checkout 90 dias grátis -> transição preço cheio 4º ciclo', async () => {
  const ts = Date.now();
  const provId = `prov-launch-ok-${ts}`;
  const phone = `(11) 97222-${String(ts).slice(-4)}`;
  const email = `launch.ok.${ts}@example.com`;
  const cpf = nextUniqueValidCpf();
  await seedIsolatedProvider(provId, phone);

  // 1a. GET com PII na query retorna 405
  const getBlockedRes = await fetch(
    `${baseUrl}/api/promotions/launch-offer/eligibility?email=${encodeURIComponent(email)}`
  );
  assert.equal(getBlockedRes.status, 405);

  // 1b. Consulta endpoint POST de elegibilidade
  const eligRes = await fetch(
    `${baseUrl}/api/promotions/launch-offer/eligibility`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerProfileId: provId,
        email,
        phone,
        cpfCnpj: cpf,
        planSlug: 'profissional',
        cycle: 'mensal',
      }),
    }
  );
  assert.equal(eligRes.status, 200);
  const eligBody = (await eligRes.json()) as any;
  assert.equal(eligBody.eligible, true);
  assert.equal(eligBody.selectedPlanPromoCentavos, 0);
  assert.equal(eligBody.selectedPlanFullCentavos, 5990);
  assert.equal(eligBody.durationCycles, 3);

  // 2. Checkout mensal com oferta de lançamento (90 dias grátis -> R$ 0,00)
  const checkoutRes = await fetch(`${baseUrl}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      providerProfileId: provId,
      providerName: 'Novo Prestador Lançamento',
      providerEmail: email,
      providerPhone: phone,
      planSlug: 'profissional',
      cycle: 'mensal',
      paymentMethod: 'pix',
      applyLaunchOffer: true,
      cpfCnpj: cpf,
      deviceFingerprint: `fp-${ts}`,
    }),
  });
  assert.equal(checkoutRes.status, 201);
  const checkoutBody = (await checkoutRes.json()) as any;
  assert.equal(checkoutBody.launchOfferApplied, true);
  assert.equal(checkoutBody.invoice.valorCentavos, 0);
  assert.equal(checkoutBody.launchOfferRedemption.ciclo_promocional_atual, 1);

  // 3. Ciclos 2 e 3 mantêm promoção; ciclo 4 retorna ao preço cheio (5990)
  const c2 = await advancePromotionalCycleOrReturnFullPrice(
    checkoutBody.subscription.id
  );
  assert.equal(c2.hasActivePromotion, true);
  assert.equal(c2.cycleNumber, 2);

  const c3 = await advancePromotionalCycleOrReturnFullPrice(
    checkoutBody.subscription.id
  );
  assert.equal(c3.hasActivePromotion, true);
  assert.equal(c3.cycleNumber, 3);

  const c4 = await advancePromotionalCycleOrReturnFullPrice(
    checkoutBody.subscription.id
  );
  assert.equal(c4.hasActivePromotion, false);
  assert.equal(c4.returnedToFullPrice, true);
});

test('3. Antifraude Multi-Conta & Cancelamento durante a promoção impedem novo resgate', async () => {
  const ts = `${Date.now()}-${Math.floor(100000 + Math.random() * 899999)}`;
  const rand8a = String(10000000 + Math.floor(Math.random() * 89999999));
  const rand8b = String(10000000 + Math.floor(Math.random() * 89999999));
  const provId1 = `prov-abuse-1-${ts}`;
  const provId2 = `prov-abuse-2-${ts}`;
  const sharedPhone = `(11) 9${rand8a.slice(0, 4)}-${rand8a.slice(4)}`;
  const otherPhone = `(11) 9${rand8b.slice(0, 4)}-${rand8b.slice(4)}`;
  const sharedCpf = nextUniqueValidCpf();
  const sharedFp = `device-fp-${ts}`;
  await seedIsolatedProvider(provId1, sharedPhone);
  await seedIsolatedProvider(provId2, otherPhone);

  // 1. Primeira conta resgata no plano Essencial (0 centavos por 90 dias)
  const firstCheckout = await fetch(`${baseUrl}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      providerProfileId: provId1,
      providerName: 'Conta 1',
      providerEmail: `conta1.${ts}@example.com`,
      providerPhone: sharedPhone,
      planSlug: 'essencial',
      cycle: 'mensal',
      paymentMethod: 'pix',
      applyLaunchOffer: true,
      cpfCnpj: sharedCpf,
      deviceFingerprint: sharedFp,
    }),
  });
  const firstBody = (await firstCheckout.json()) as any;
  assert.equal(firstCheckout.status, 201, JSON.stringify(firstBody));
  assert.equal(firstBody.invoice.valorCentavos, 0);

  // 2. Segunda conta com mesmo CPF/CNPJ ou dispositivo tenta pegar oferta novamente -> BLOQUEADA
  const secondElig = await checkLaunchOfferEligibility(
    {
      email: `conta2.${ts}@example.com`,
      phone: otherPhone,
      cpfCnpj: sharedCpf,
      deviceFingerprint: sharedFp,
    },
    { providerProfileId: provId2 },
    { planSlug: 'premium', cycle: 'mensal' }
  );
  assert.equal(secondElig.eligible, false);
  assert.equal(secondElig.resultado, 'bloqueado');
  assert.equal(secondElig.reason, 'Você já utilizou esta oferta anteriormente.');

  const blockedCheckout = await fetch(
    `${baseUrl}/api/subscriptions/checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        providerProfileId: provId2,
        providerName: 'Conta 2 Fraude',
        providerEmail: `conta2.${ts}@example.com`,
        providerPhone: otherPhone,
        planSlug: 'premium',
        cycle: 'mensal',
        paymentMethod: 'pix',
        applyLaunchOffer: true,
        cpfCnpj: sharedCpf,
        deviceFingerprint: sharedFp,
      }),
    }
  );
  assert.equal(blockedCheckout.status, 400);

  // 3. Conta 1 cancela durante a promoção -> perde o restante da oferta e não pode reativar com desconto
  const cancelRes = await fetch(
    `${baseUrl}/api/subscriptions/${firstBody.subscription.id}/cancel`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: 'Desistência no mês 1' }),
    }
  );
  assert.equal(cancelRes.status, 200);

  const recheck = await checkLaunchOfferEligibility(
    { email: `conta1.${ts}@example.com`, phone: sharedPhone },
    { providerProfileId: provId1 },
    { planSlug: 'essencial', cycle: 'mensal' }
  );
  assert.equal(recheck.eligible, false);
  assert.equal(recheck.reason, 'Você já utilizou esta oferta anteriormente.');
});

test('4. Campanha fora da data de vigência retorna "A campanha encerrou."', async () => {
  const ts = Date.now();
  const futureOut = await checkLaunchOfferEligibility(
    { email: `exp.${ts}@example.com` },
    { providerProfileId: `prov-exp-${ts}` },
    {
      planSlug: 'profissional',
      cycle: 'mensal',
      campaignSlug: LAUNCH_OFFER_SLUG,
      now: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    }
  );
  assert.equal(futureOut.eligible, false);
  assert.equal(futureOut.reason, 'A campanha encerrou.');
});

test('5. Eventos duplicados de webhook, falha de pagamento (7 dias), renovação até o 4º ciclo e reativação sem nova oferta', async () => {
  const ts = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const provId = `prov-launch-wh-${ts}`;
  const phone = `(11) 95555-${ts.slice(-4)}`;
  const email = `launch.wh.${ts}@example.com`;
  await seedIsolatedProvider(provId, phone);

  // 1. Checkout com oferta de lançamento (90 dias grátis = 0 centavos no início)
  const checkoutRes = await fetch(`${baseUrl}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      providerProfileId: provId,
      providerName: 'Prestador Webhook Lançamento',
      providerEmail: email,
      providerPhone: phone,
      planSlug: 'profissional',
      cycle: 'mensal',
      paymentMethod: 'pix',
      applyLaunchOffer: true,
      cpfCnpj: nextUniqueValidCpf(),
    }),
  });
  assert.equal(checkoutRes.status, 201);
  const checkoutBody = (await checkoutRes.json()) as any;
  const subId = checkoutBody.subscription.id;
  assert.equal(checkoutBody.invoice.valorCentavos, 0);

  const firstPaidPayload = JSON.stringify({
    id: `evt_dup_check_${ts}`,
    event: 'PAYMENT_CONFIRMED',
    payment: {
      id: checkoutBody.invoice.gatewayInvoiceId || `pay_promo_0_${ts}`,
      subscription: checkoutBody.subscription.gatewaySubscriptionId,
      value: 0,
      billingType: 'PIX',
      externalReference: subId,
    },
  });

  // 2. Primeiro webhook ativa assinatura (ciclo 1)
  const wh1 = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
    },
    body: firstPaidPayload,
  });
  assert.equal(wh1.status, 202);

  // 3. Evento duplicado com mesmo id -> ignorado idempotente (200, duplicate: true), mantém ciclo 1
  const whDup = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
    },
    body: firstPaidPayload,
  });
  assert.equal(whDup.status, 200);
  const whDupBody = (await whDup.json()) as any;
  assert.equal(whDupBody.duplicate, true);

  const { rows: cycle1Check } = await pool.query(
    `SELECT ciclo_promocional_atual, status FROM promotional_redemptions WHERE subscription_id = $1`,
    [subId]
  );
  assert.equal(cycle1Check[0].ciclo_promocional_atual, 1);

  // 4. Webhooks de renovação dos ciclos 2, 3 e 4 (no 4º ciclo retorna ao preço cheio)
  for (const cycleIdx of [2, 3, 4]) {
    const renRes = await fetch(`${baseUrl}/api/webhooks/billing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
      },
      body: JSON.stringify({
        id: `evt_ren_${cycleIdx}_${ts}`,
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: checkoutBody.invoice.gatewayInvoiceId || `pay_promo_${cycleIdx}_${ts}`,
          subscription: checkoutBody.subscription.gatewaySubscriptionId,
          value: cycleIdx === 4 ? 59.9 : 0,
          billingType: 'PIX',
          externalReference: subId,
        },
      }),
    });
    assert.equal(renRes.status, 202);
  }

  const { rows: cycle4Check } = await pool.query(
    `SELECT ciclo_promocional_atual, status FROM promotional_redemptions WHERE subscription_id = $1`,
    [subId]
  );
  assert.equal(cycle4Check[0].ciclo_promocional_atual, 4);
  assert.equal(cycle4Check[0].status, 'concluido');

  // 5. Falha de pagamento (PAYMENT_OVERDUE) aplica 7 dias de tolerância sem excluir o prestador
  const overdueRes = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
    },
    body: JSON.stringify({
      id: `evt_overdue_launch_${ts}`,
      event: 'PAYMENT_OVERDUE',
      payment: {
        id: checkoutBody.invoice.gatewayInvoiceId || `pay_promo_over_${ts}`,
        subscription: checkoutBody.subscription.gatewaySubscriptionId,
        value: 59.9,
        billingType: 'PIX',
        externalReference: subId,
      },
    }),
  });
  assert.equal(overdueRes.status, 202);

  const subAfterOverdue = (await (
    await fetch(`${baseUrl}/api/providers/${provId}/subscription`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
  ).json()) as any;
  assert.equal(subAfterOverdue.subscription.status, 'inadimplente');
  assert.ok(subAfterOverdue.subscription.toleranciaAte);

  // 6. Cancelamento e reativação: reativar tentando usar oferta novamente é bloqueado; reativar no preço cheio funciona
  const cancelRes = await fetch(`${baseUrl}/api/subscriptions/${subId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ reason: 'Cancelamento para testar reativação' }),
  });
  assert.equal(cancelRes.status, 200);

  const reactivateWithPromo = await fetch(
    `${baseUrl}/api/subscriptions/checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        providerProfileId: provId,
        providerName: 'Prestador Webhook Lançamento',
        providerEmail: email,
        providerPhone: phone,
        planSlug: 'essencial',
        cycle: 'mensal',
        paymentMethod: 'pix',
        applyLaunchOffer: true,
        cpfCnpj: nextUniqueValidCpf(),
      }),
    }
  );
  assert.equal(reactivateWithPromo.status, 400);

  const reactivateFullPrice = await fetch(
    `${baseUrl}/api/subscriptions/checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        providerProfileId: provId,
        providerName: 'Prestador Webhook Lançamento',
        providerEmail: email,
        providerPhone: phone,
        planSlug: 'essencial',
        cycle: 'mensal',
        paymentMethod: 'pix',
        applyLaunchOffer: false,
        cpfCnpj: nextUniqueValidCpf(),
      }),
    }
  );
  assert.equal(reactivateFullPrice.status, 201);
  const reactivateBody = (await reactivateFullPrice.json()) as any;
  assert.equal(reactivateBody.launchOfferApplied, false);
  assert.equal(reactivateBody.invoice.valorCentavos, 2990);
});
