import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { ensureSchemaAndSeed, pool } from '../db/index';
import { setEmailDeliveryObserverForTests } from './essentialIntegrations';

let server: Server;
let baseUrl: string;
let adminToken = '';
const TEST_ASAAS_WEBHOOK_TOKEN =
  process.env.ASAAS_WEBHOOK_TOKEN || 'test_wh_secret_confiare_2026';
const VALID_TEST_CPF = '52998224725';

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

  const email = `admin.checkout.e2e.${Date.now()}@example.com`;
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
        fullName: 'Admin Checkout E2E',
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

test('1. Checkout (Mensal & Anual), Validação de Assinatura do Webhook e Idempotência em Eventos Duplicados', async () => {
  // Anonymous checkout must be rejected (401)
  const unauthCheckout = await fetch(`${baseUrl}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(unauthCheckout.status, 401);

  // 1.1 Checkout anual do plano Profissional (R$ 599,00 = 59900 centavos)
  const annualCheckoutRes = await fetch(
    `${baseUrl}/api/subscriptions/checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        providerProfileId: 'prov-carlos',
        providerName: 'Carlos Eduardo Mendes',
        providerEmail: 'carlos@confiare.com.br',
        providerPhone: '(11) 99451-8830',
        planSlug: 'profissional',
        cycle: 'anual',
        paymentMethod: 'pix',
        cpfCnpj: VALID_TEST_CPF,
      }),
    }
  );
  assert.equal(annualCheckoutRes.status, 201);
  const annualCheckoutBody = (await annualCheckoutRes.json()) as any;
  assert.equal(annualCheckoutBody.ok, true);
  assert.equal(annualCheckoutBody.subscription.ciclo, 'anual');
  assert.equal(annualCheckoutBody.subscription.status, 'pendente');
  assert.equal(annualCheckoutBody.invoice.valorCentavos, 59900);

  // 1.2 Webhook com assinatura inválida -> rejeitado (401)
  const eventId = `evt_e2e_paid_${Date.now()}`;
  const webhookPayload = JSON.stringify({
    id: eventId,
    event: 'PAYMENT_CONFIRMED',
    payment: {
      id: annualCheckoutBody.invoice.gatewayInvoiceId,
      subscription: annualCheckoutBody.subscription.gatewaySubscriptionId,
      value: 599.0,
      billingType: 'PIX',
      externalReference: annualCheckoutBody.subscription.id,
    },
  });

  const invalidSigRes = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': 'token_invalido_123',
    },
    body: webhookPayload,
  });
  assert.equal(invalidSigRes.status, 401);

  // 1.3 Webhook com assinatura válida -> ativa assinatura e registra confirmação
  const validSigRes = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
    },
    body: webhookPayload,
  });
  assert.equal(validSigRes.status, 202);
  const validSigBody = (await validSigRes.json()) as any;
  assert.equal(validSigBody.ok, true);
  assert.equal(validSigBody.duplicate, false);

  const subRes = await fetch(
    `${baseUrl}/api/providers/prov-carlos/subscription`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  const subBody = (await subRes.json()) as any;
  assert.equal(subBody.subscription.status, 'ativa');
  assert.equal(subBody.plan.slug, 'profissional');
  assert.equal(subBody.usage.limit, 40);

  // Confirma notificação WhatsApp gerada na ativação
  const { rows: notifRows } = await pool.query(
    `SELECT * FROM notifications WHERE provider_profile_id = 'prov-carlos' ORDER BY created_at DESC LIMIT 1`
  );
  assert.equal(notifRows.length, 1);

  // 1.4 Evento duplicado com mesmo eventId -> ignorado idempotente (200, duplicate: true)
  const dupRes = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
    },
    body: webhookPayload,
  });
  assert.equal(dupRes.status, 200);
  const dupBody = (await dupRes.json()) as any;
  assert.equal(dupBody.ok, true);
  assert.equal(dupBody.duplicate, true);
});

test('2. Upgrade Imediato, Downgrade Agendado, Falha de Pagamento (7 dias) e Cancelamento Mantendo Acesso', async () => {
  // 2.1 Checkout Mensal Essencial (2990 centavos) + ativação via webhook
  const checkoutRes = await fetch(`${baseUrl}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      providerProfileId: 'prov-ana',
      providerName: 'Ana Paula Ribeiro',
      providerEmail: 'ana@confiare.com.br',
      providerPhone: '(11) 99104-2290',
      planSlug: 'essencial',
      cycle: 'mensal',
      paymentMethod: 'cartao',
      cpfCnpj: VALID_TEST_CPF,
    }),
  });
  assert.equal(checkoutRes.status, 201);
  const checkoutBody = (await checkoutRes.json()) as any;
  const subId = checkoutBody.subscription.id;

  await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
    },
    body: JSON.stringify({
      id: `evt_ana_paid_${Date.now()}`,
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: checkoutBody.invoice.gatewayInvoiceId,
        subscription: checkoutBody.subscription.gatewaySubscriptionId,
        value: 29.9,
        billingType: 'CREDIT_CARD',
        externalReference: subId,
      },
    }),
  });

  // 2.2 Upgrade imediato para Premium (9990 centavos)
  const upRes = await fetch(`${baseUrl}/api/subscriptions/${subId}/upgrade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      targetPlanSlug: 'premium',
      targetCycle: 'mensal',
      paymentMethod: 'cartao',
    }),
  });
  assert.equal(upRes.status, 200);
  const upBody = (await upRes.json()) as any;
  assert.equal(upBody.ok, true);
  assert.equal(upBody.newPlan.slug, 'premium');
  assert.ok(Number.isInteger(upBody.proRataCents));

  // 2.3 Downgrade agendado para Essencial (mantém Premium até fim do ciclo)
  const downRes = await fetch(
    `${baseUrl}/api/subscriptions/${subId}/downgrade`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ targetPlanSlug: 'essencial' }),
    }
  );
  assert.equal(downRes.status, 200);
  const downBody = (await downRes.json()) as any;
  assert.equal(downBody.ok, true);
  assert.equal(downBody.currentPlan.slug, 'premium');
  assert.equal(downBody.scheduledPlan.slug, 'essencial');

  // 2.4 Falha de pagamento via Webhook (PAYMENT_OVERDUE -> status 'inadimplente' com 7 dias de tolerância)
  const overdueRes = await fetch(`${baseUrl}/api/webhooks/billing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'asaas-access-token': TEST_ASAAS_WEBHOOK_TOKEN,
    },
    body: JSON.stringify({
      id: `evt_ana_overdue_${Date.now()}`,
      event: 'PAYMENT_OVERDUE',
      payment: {
        id: checkoutBody.invoice.gatewayInvoiceId,
        subscription: checkoutBody.subscription.gatewaySubscriptionId,
        value: 99.9,
        billingType: 'CREDIT_CARD',
        externalReference: subId,
      },
    }),
  });
  assert.equal(overdueRes.status, 202);

  const afterOverdueRes = await fetch(
    `${baseUrl}/api/providers/prov-ana/subscription`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  const afterOverdueBody = (await afterOverdueRes.json()) as any;
  assert.equal(afterOverdueBody.subscription.status, 'inadimplente');
  assert.ok(afterOverdueBody.subscription.toleranciaAte);

  // 2.5 Cancelamento mantendo acesso até o fim do período pago ('fim')
  const cancelRes = await fetch(`${baseUrl}/api/subscriptions/${subId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ reason: 'Teste E2E cancelamento' }),
  });
  assert.equal(cancelRes.status, 200);
  const cancelBody = (await cancelRes.json()) as any;
  assert.equal(cancelBody.ok, true);
  assert.equal(cancelBody.subscription.status, 'cancelada');
  assert.ok(new Date(cancelBody.subscription.fim).getTime() > Date.now());
});
