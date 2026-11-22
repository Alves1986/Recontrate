import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { ensureSchemaAndSeed, pool } from '../db/index';
import {
  setEmailDeliveryObserverForTests,
  TransactionalEmailService,
  type CapturedEmailDelivery,
} from './essentialIntegrations';
import { SubscriptionLifecycleService } from './subscriptionLifecycle';
import { getLegalIdentity } from '../config/legalIdentity';

let server: Server;
let baseUrl: string;

test.before(async () => {
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

test('1. Bloqueia consentimentos ausentes (sem default=true) em cadastro, solicitação e lista de interesse', async () => {
  const ts = Date.now();
  const noConsentSignup = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `noconsent.${ts}@example.com`,
      password: 'Confiare#2026!Password',
      fullName: 'Sem Consentimento',
      birthDate: '1990-05-15',
      role: 'cliente',
      lgpdConsent: false,
    }),
  });
  assert.equal(noConsentSignup.status, 400);

  const noConsentWaitlist = await fetch(`${baseUrl}/api/public/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `lead.noconsent.${ts}@example.com`,
      location: 'Pinheiros, SP',
      category: 'Eletricista',
      lgpdConsent: false,
    }),
  });
  assert.equal(noConsentWaitlist.status, 400);

  // Registra e verifica adulto válido para testar CreateServiceRequestSchema sem lgpdContactConsent
  let vfyToken = '';
  const clientEmail = `consent.check.${ts}@example.com`;
  setEmailDeliveryObserverForTests((d) => {
    if (d.to === clientEmail && d.variables.verificationToken) {
      vfyToken = d.variables.verificationToken;
    }
  });
  try {
    const regOk = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: clientEmail,
        password: 'Confiare#2026!Password',
        fullName: 'Titular Consentimento Explícito',
        birthDate: '1991-03-10',
        role: 'cliente',
        lgpdConsent: true,
      }),
    });
    assert.equal(regOk.status, 201);
  } finally {
    setEmailDeliveryObserverForTests(null);
  }
  const vfyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationToken: vfyToken }),
  });
  const token = ((await vfyRes.json()) as any).token as string;

  const missingReqConsent = await fetch(`${baseUrl}/api/app/cliente/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      categoryName: 'Eletricista',
      problemTitle: 'Quadro disjuntor teste sem consentimento',
      description: 'Deve falhar pois lgpdContactConsent não foi enviado explicitamente.',
      neighborhood: 'Pinheiros',
      urgency: 'Hoje',
      preferredTime: 'Comercial',
    }),
  });
  assert.equal(missingReqConsent.status, 400);
});

test('2. Gate etário (+18 e bloqueio <12 LGPD art. 14 §1º), versionamento UTC, opt-in marketing e opt-out IA', async () => {
  const ts = Date.now();
  const childRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `crianca.${ts}@example.com`,
      password: 'Confiare#2026!Password',
      fullName: 'Menor Doze Anos',
      birthDate: '2018-06-01',
      role: 'cliente',
      lgpdConsent: true,
    }),
  });
  assert.equal(childRes.status, 400);
  const childBody = (await childRes.json()) as any;
  assert.match(childBody.error, /12 anos|LGPD art\. 14/i);

  const teenRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `adolescente.${ts}@example.com`,
      password: 'Confiare#2026!Password',
      fullName: 'Menor Dezoito Anos',
      birthDate: '2011-06-01',
      role: 'cliente',
      lgpdConsent: true,
    }),
  });
  assert.equal(teenRes.status, 400);
  const teenBody = (await teenRes.json()) as any;
  assert.match(teenBody.error, /18 anos/i);

  const adultEmail = `adulto.lgpd.${ts}@example.com`;
  let regBody: any;
  const adultRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adultEmail,
      password: 'Confiare#2026!Password',
      fullName: 'Maria Titular Adulta',
      birthDate: '1988-08-22',
      role: 'cliente',
      lgpdConsent: true,
    }),
  });
  assert.equal(adultRes.status, 201);
  regBody = (await adultRes.json()) as any;
  const userId = regBody.user.userId as string;

  const { rows: profRows } = await pool.query(
    `SELECT age_verified_18_plus, terms_version, privacy_version,
            terms_accepted_at, privacy_accepted_at, marketing_opt_in, ai_training_opt_out
     FROM profiles WHERE user_id = $1::uuid`,
    [userId]
  );
  assert.equal(profRows.length, 1);
  assert.equal(profRows[0].age_verified_18_plus, true);
  assert.equal(profRows[0].terms_version, '2026-04-v1');
  assert.equal(profRows[0].privacy_version, '2026-04-v1');
  assert.ok(profRows[0].terms_accepted_at);
  assert.ok(profRows[0].privacy_accepted_at);
  assert.equal(profRows[0].marketing_opt_in, false);
  assert.equal(profRows[0].ai_training_opt_out, true);

  const { rows: logRows } = await pool.query(
    `SELECT consent_type FROM consent_logs WHERE user_id = $1::uuid`,
    [userId]
  );
  const types = logRows.map((r: any) => r.consent_type);
  assert.ok(types.includes('terms_and_privacy'));
  assert.ok(types.includes('age_18_plus'));
  assert.ok(types.includes('marketing'));
  assert.ok(types.includes('ai_training_opt_out'));
});

test('3. Central de Privacidade LGPD art. 18: preferências, exportação JSON/CSV e exclusão/anonimização de conta', async () => {
  const ts = Date.now();
  const email = `art18.${ts}@example.com`;
  let vfyToken = '';
  setEmailDeliveryObserverForTests((d) => {
    if (d.to === email && d.variables.verificationToken) {
      vfyToken = d.variables.verificationToken;
    }
  });
  try {
    const r = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Confiare#2026!Password',
        fullName: 'Carlos Portabilidade LGPD',
        birthDate: '1985-04-12',
        role: 'cliente',
        lgpdConsent: true,
      }),
    });
    assert.equal(r.status, 201);
  } finally {
    setEmailDeliveryObserverForTests(null);
  }

  const vfyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationToken: vfyToken }),
  });
  const vfyBody = (await vfyRes.json()) as any;
  const token = vfyBody.token as string;
  const userId = vfyBody.user.userId as string;

  const prefRes = await fetch(`${baseUrl}/api/app/privacidade/preferences`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(prefRes.status, 200);
  const prefBody = (await prefRes.json()) as any;
  assert.equal(prefBody.preferences.marketingOptIn, false);
  assert.equal(prefBody.preferences.aiTrainingOptOut, true);
  assert.ok(prefBody.consentHistory.length >= 2);

  const patchRes = await fetch(`${baseUrl}/api/app/privacidade/preferences`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ marketingOptIn: true, aiTrainingOptOut: false }),
  });
  assert.equal(patchRes.status, 200);

  const expJsonRes = await fetch(
    `${baseUrl}/api/app/privacidade/export?format=json`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  assert.equal(expJsonRes.status, 200);
  assert.match(
    expJsonRes.headers.get('content-disposition') || '',
    /attachment/i
  );
  const expJsonBody = (await expJsonRes.json()) as any;
  assert.equal(expJsonBody.ok, true);
  assert.equal(expJsonBody.data.user.email, email);
  assert.equal(expJsonBody.data.user.password_hash, undefined);
  assert.equal(expJsonBody.data.user.verification_token_hash, undefined);

  const expCsvRes = await fetch(
    `${baseUrl}/api/app/privacidade/export?format=csv`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  assert.equal(expCsvRes.status, 200);
  assert.match(expCsvRes.headers.get('content-type') || '', /text\/csv/);

  // Exclusão exige frase exata
  const badDelRes = await fetch(
    `${baseUrl}/api/app/privacidade/delete-account`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ confirmationText: 'apagar' }),
    }
  );
  assert.equal(badDelRes.status, 400);

  const delRes = await fetch(`${baseUrl}/api/app/privacidade/delete-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ confirmationText: 'EXCLUIR MINHA CONTA' }),
  });
  assert.equal(delRes.status, 200);

  const { rows: uRows } = await pool.query(
    `SELECT email, status, deleted_at FROM users WHERE id = $1::uuid`,
    [userId]
  );
  assert.equal(uRows[0].status, 'suspenso');
  assert.ok(uRows[0].deleted_at);
  assert.ok(String(uRows[0].email).startsWith('deleted-'));
});

test('4. E-mail RFC 8058 (List-Unsubscribe) e descadastro em 1 clique suprimem próximos envios', async () => {
  const emailSvc = new TransactionalEmailService();
  const targetEmail = `unsub.${Date.now()}@example.com`;
  let captured: CapturedEmailDelivery | null = null;
  setEmailDeliveryObserverForTests((d) => {
    if (d.to === targetEmail) captured = d;
  });
  try {
    await emailSvc.sendEmail({
      to: targetEmail,
      subject: 'Novidade Recontrate',
      template: 'marketing',
      variables: { mensagem: 'Conteúdo opcional promocional.' },
    });
  } finally {
    setEmailDeliveryObserverForTests(null);
  }

  assert.ok(captured);
  const unsubHeader = (captured as CapturedEmailDelivery).headers?.[
    'List-Unsubscribe'
  ];
  assert.ok(unsubHeader && unsubHeader.includes('/api/public/email/unsubscribe'));
  assert.equal(
    (captured as CapturedEmailDelivery).headers?.['List-Unsubscribe-Post'],
    'List-Unsubscribe=One-Click'
  );

  const rawUrl = unsubHeader.replace(/^<|>$/g, '');
  const parsedUrl = new URL(rawUrl);
  const res = await fetch(`${baseUrl}/api/public/email/unsubscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: parsedUrl.searchParams.get('email'),
      sig: parsedUrl.searchParams.get('sig'),
    }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  assert.equal(body.unsubscribed, true);

  const suppressed = await emailSvc.sendEmail({
    to: targetEmail,
    subject: 'Segundo envio promocional',
    template: 'marketing',
    variables: { mensagem: 'Não deve ser enviado.' },
  });
  assert.equal(suppressed.delivered, false);
  assert.equal(suppressed.provider, 'unsubscribed-suppressed');
});

test('5. Canal de Denúncia UGC / Direitos Autorais e moderação administrativa', async () => {
  const repRes = await fetch(`${baseUrl}/api/public/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetType: 'provider_profile',
      targetId: 'prov-exemplo-ugc',
      category: 'direitos_autorais',
      description: 'Uso não autorizado de fotografia protegida por direitos autorais.',
      reporterEmail: `autor.${Date.now()}@example.com`,
    }),
  });
  assert.equal(repRes.status, 201);
  const repBody = (await repRes.json()) as any;
  assert.ok(repBody.reportId);

  const unauthAdmin = await fetch(`${baseUrl}/api/admin/reports`);
  assert.equal(unauthAdmin.status, 401);

  // Cria admin real para moderar a denúncia
  const adminEmail = `admin.ugc.${Date.now()}@example.com`;
  let vfy = '';
  setEmailDeliveryObserverForTests((d) => {
    if (d.to === adminEmail && d.variables.verificationToken) {
      vfy = d.variables.verificationToken;
    }
  });
  let adminUserId = '';
  try {
    const r = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: 'Confiare#2026!Password',
        fullName: 'Admin Moderação UGC',
        birthDate: '1987-01-15',
        role: 'cliente',
        lgpdConsent: true,
      }),
    });
    adminUserId = ((await r.json()) as any).user.userId;
  } finally {
    setEmailDeliveryObserverForTests(null);
  }
  await fetch(`${baseUrl}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationToken: vfy }),
  });
  await pool.query(
    `UPDATE users SET roles = ARRAY['admin']::TEXT[], active_role = 'admin', onboarding_completed = true WHERE id = $1::uuid`,
    [adminUserId]
  );
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: 'Confiare#2026!Password',
    }),
  });
  const adminToken = ((await loginRes.json()) as any).token as string;

  const listRes = await fetch(`${baseUrl}/api/admin/reports`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(listRes.status, 200);
  const listBody = (await listRes.json()) as any;
  assert.ok(listBody.reports.some((r: any) => r.id === repBody.reportId));

  const patchRes = await fetch(
    `${baseUrl}/api/admin/reports/${repBody.reportId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'resolvida',
        resolutionNotes: 'Conteúdo removido após verificação de autoria.',
      }),
    }
  );
  assert.equal(patchRes.status, 200);
  assert.equal(((await patchRes.json()) as any).report.status, 'resolvida');
});

test('6. Direito de Arrependimento CDC art. 49 (7 dias): cancelamento com estorno integral e prazo vencido bloqueado', async () => {
  const ts = Date.now();
  const providerId = `prov-cdc49-${ts}`;
  const subId = `sub-cdc49-${ts}`;
  const invId = `inv-cdc49-${ts}`;
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO provider_profiles (
      id, name, category, city, bio, whatsapp, plan_slug, verification_status, is_verified
    ) VALUES ($1, 'Prestador CDC49', 'Eletricista', 'São Paulo, SP', 'Teste CDC 49', '11999990049', 'profissional', 'aprovado', true)`,
    [providerId]
  );
  await pool.query(
    `INSERT INTO subscriptions (
      id, provider_profile_id, plan_id, status, ciclo, inicio, fim, proxima_cobranca
    ) VALUES ($1, $2, 'plan-profissional', 'ativa', 'mensal', $3, $4, $4)`,
    [subId, providerId, twoDaysAgo, nextMonth]
  );
  await pool.query(
    `INSERT INTO invoices (
      id, subscription_id, valor_centavos, status, metodo, vencimento, pago_em, gateway_invoice_id
    ) VALUES ($1, $2, 5990, 'paga', 'pix', $3, $3, $4)`,
    [invId, subId, twoDaysAgo, `gw-pay-${ts}`]
  );

  const lifecycle = new SubscriptionLifecycleService();
  const result = await lifecycle.cancelSubscription(
    subId,
    'Arrependimento em 2 dias',
    now,
    { exerciseWithdrawalRight: true }
  );

  assert.equal(result.status, 'expirada');
  assert.equal(result.withdrawalRefund?.refunded, true);
  assert.equal(result.withdrawalRefund?.amountCents, 5990);

  const { rows: invRows } = await pool.query(
    `SELECT status FROM invoices WHERE id = $1`,
    [invId]
  );
  assert.equal(invRows[0].status, 'estornada');

  const { rows: provRows } = await pool.query(
    `SELECT plan_slug FROM provider_profiles WHERE id = $1`,
    [providerId]
  );
  assert.equal(provRows[0].plan_slug, 'gratuito');

  // Arrependimento após 9 dias deve ser rejeitado mantendo cancelamento padrão disponível
  const tenDaysLater = new Date(twoDaysAgo.getTime() + 9 * 24 * 60 * 60 * 1000);
  await assert.rejects(
    () =>
      lifecycle.cancelSubscription(subId, 'Fora do prazo', tenDaysLater, {
        exerciseWithdrawalRight: true,
      }),
    /7 dias/i
  );
});

test('7. Identidade jurídica não inventa CNPJ/Razão Social/DPO quando variáveis estão ausentes', () => {
  const prevCnpj = process.env.VITE_COMPANY_CNPJ;
  const prevName = process.env.VITE_COMPANY_NAME;
  delete process.env.VITE_COMPANY_CNPJ;
  delete process.env.VITE_COMPANY_NAME;
  try {
    const legal = getLegalIdentity();
    assert.equal(legal.isConfigured.cnpj, false);
    assert.equal(legal.isConfigured.companyName, false);
    assert.match(legal.cnpj, /Pendente de configuração/);
    assert.match(legal.companyName, /Pendente de configuração/);
  } finally {
    if (prevCnpj !== undefined) process.env.VITE_COMPANY_CNPJ = prevCnpj;
    if (prevName !== undefined) process.env.VITE_COMPANY_NAME = prevName;
  }
});
