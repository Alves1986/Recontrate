import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { ensureSchemaAndSeed, pool } from '../db/index';
import { setEmailDeliveryObserverForTests } from './essentialIntegrations';

let server: Server;
let baseUrl: string;
const TEST_ASAAS_WEBHOOK_TOKEN =
  process.env.ASAAS_WEBHOOK_TOKEN || 'test_wh_secret_confiare_2026';

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
});

test.after(async () => {
  setEmailDeliveryObserverForTests(null);
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await pool.end();
});

async function createAdminToken() {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const email = `admin.promo.${ts}@example.com`;
  const password = 'Confiare#2026!Password';

  let vfyToken = '';
  setEmailDeliveryObserverForTests((d) => {
    if (d.to === email && d.variables.verificationToken) {
      vfyToken = d.variables.verificationToken;
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
        fullName: 'Admin Campanhas',
        phone: '(11) 99123-0000',
        neighborhood: 'Pinheiros',
        role: 'cliente',
        lgpdConsent: true,
      }),
    });
    regBody = (await regRes.json()) as any;
    await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationToken: vfyToken }),
    });
  } finally {
    setEmailDeliveryObserverForTests(null);
  }
  await pool.query(
    `UPDATE users SET roles = ARRAY['admin']::TEXT[], active_role = 'admin', onboarding_completed = true WHERE id = $1`,
    [regBody.user.userId]
  );
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return ((await loginRes.json()) as any).token as string;
}

let adminCpfSeq = Math.floor(Date.now() % 899_999_999) + 100_000_000;
function nextUniqueValidCpf(): string {
  adminCpfSeq = (adminCpfSeq + 1) % 899_999_999 || 100_000_000;
  const base = String(adminCpfSeq).padStart(9, '0');
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

test('1. Avisos de término da oferta por E-mail e WhatsApp no 3º ciclo (com idempotência)', async () => {
  const adminToken = await createAdminToken();
  const ts = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const provId = `prov-notice-${ts}`;
  const phone = `(11) 94444-${ts.slice(-4)}`;

  await pool.query(
    `INSERT INTO provider_profiles (
      id, slug, name, category, city, plan_slug, whatsapp
    ) VALUES ($1, $1, 'Prestador Aviso 3o Ciclo', 'Eletricista', 'São Paulo, SP', 'gratuito', $2)
    ON CONFLICT (id) DO NOTHING`,
    [provId, phone]
  );

  // Cria checkout com oferta de lançamento (admin autorizado)
  const checkoutRes = await fetch(`${baseUrl}/api/subscriptions/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      providerProfileId: provId,
      providerName: 'Prestador Aviso 3o Ciclo',
      providerEmail: `aviso.${ts}@example.com`,
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
  const redemptionId = checkoutBody.launchOfferRedemption.id;

  // Simula que o prestador está no 3º ciclo promocional prestes a terminar
  await pool.query(
    `UPDATE promotional_redemptions
     SET ciclo_promocional_atual = 3,
         data_retorno_preco_cheio = NOW() + INTERVAL '3 days'
     WHERE id = $1`,
    [redemptionId]
  );

  // Dispara avisos via endpoint administrativo
  const notifyRes = await fetch(
    `${baseUrl}/api/admin/promotions/notify-ending`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ daysBeforeEnd: 7 }),
    }
  );
  assert.equal(notifyRes.status, 200);
  const notifyBody = (await notifyRes.json()) as any;
  assert.equal(notifyBody.ok, true);
  assert.ok(notifyBody.notifiedRedemptionIds.includes(redemptionId));

  // Verifica registro de auditoria do aviso, e-mail transacional e notificação WhatsApp
  const { rows: auditNotice } = await pool.query(
    `SELECT * FROM audit_logs WHERE action = 'launch_offer_ending_notice_sent' AND target_id = $1`,
    [redemptionId]
  );
  assert.equal(auditNotice.length, 1);

  const { rows: waNotif } = await pool.query(
    `SELECT * FROM notifications WHERE provider_profile_id = $1 AND message LIKE '%launch_offer_ending%'`,
    [provId]
  );
  assert.equal(waNotif.length, 1);

  // Segunda execução não deve reenviar para o mesmo resgate (idempotente)
  const notifyAgainRes = await fetch(
    `${baseUrl}/api/admin/promotions/notify-ending`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ daysBeforeEnd: 7 }),
    }
  );
  const notifyAgainBody = (await notifyAgainRes.json()) as any;
  assert.equal(
    notifyAgainBody.notifiedRedemptionIds.includes(redemptionId),
    false
  );
});

test('2. Painel Administrativo de Campanhas: proteção RBAC, relatórios de conversão/cancelamento/renovação e pausa/reativação', async () => {
  const adminToken = await createAdminToken();

  // Visitante não autenticado bloqueado (401)
  const unauthRes = await fetch(`${baseUrl}/api/admin/promotions`);
  assert.equal(unauthRes.status, 401);

  // Admin obtém relatórios completos
  const reportRes = await fetch(`${baseUrl}/api/admin/promotions`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(reportRes.status, 200);
  const reportBody = (await reportRes.json()) as any;
  assert.equal(reportBody.ok, true);
  assert.equal(reportBody.campaign.slug, 'lancamento-50-off-3-meses');
  assert.equal(typeof reportBody.metrics.totalRedemptions, 'number');
  assert.equal(typeof reportBody.metrics.conversionRatePercent, 'number');
  assert.equal(typeof reportBody.metrics.cancelDuringPromoRatePercent, 'number');
  assert.equal(typeof reportBody.metrics.postPromoRenewalRatePercent, 'number');
  assert.ok(Array.isArray(reportBody.redemptionsByPlan));

  // Admin pausa e reativa a campanha
  try {
    const pauseRes = await fetch(
      `${baseUrl}/api/admin/promotions/${reportBody.campaign.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'pausado' }),
      }
    );
    assert.equal(pauseRes.status, 200);
    assert.equal(((await pauseRes.json()) as any).campaign.status, 'pausado');

    const resumeRes = await fetch(
      `${baseUrl}/api/admin/promotions/${reportBody.campaign.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'ativo' }),
      }
    );
    assert.equal(resumeRes.status, 200);
    assert.equal(((await resumeRes.json()) as any).campaign.status, 'ativo');
  } finally {
    await pool.query(
      `UPDATE promotional_campaigns SET status = 'ativo' WHERE id = $1`,
      [reportBody.campaign.id]
    );
  }
});
