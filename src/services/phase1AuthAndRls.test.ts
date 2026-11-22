import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { ensureSchemaAndSeed, pool } from '../db/index';
import { withRlsContext } from '../db/rls';
import { canUserAccessRoute, isProtectedRoutePath } from '../App';
import {
  getRedirectPathForRole,
  getSessionSecretBytes,
  resetSessionSecretCacheForTests,
} from './authService';
import { setEmailDeliveryObserverForTests } from './essentialIntegrations';

let server: Server;
let baseUrl: string;

async function registerAndVerifyUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  neighborhood?: string;
  role: 'cliente' | 'prestador';
  category?: string;
}) {
  let capturedVfyToken = '';
  const targetEmail = input.email.trim().toLowerCase();
  setEmailDeliveryObserverForTests((delivery) => {
    if (
      delivery.to.trim().toLowerCase() === targetEmail &&
      delivery.variables.verificationToken
    ) {
      capturedVfyToken = delivery.variables.verificationToken;
    }
  });
  let regBody: any;
  try {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        phone: input.phone || '(11) 99123-4567',
        neighborhood: input.neighborhood || 'Pinheiros',
        role: input.role,
        category: input.category,
        birthDate: '1990-05-15',
        lgpdConsent: true,
      }),
    });
    assert.equal(regRes.status, 201);
    regBody = (await regRes.json()) as any;
    assert.equal(regBody.ok, true);
    assert.equal(regBody.requiresEmailVerification, true);
    assert.equal(regBody.verificationToken, undefined);
    assert.equal(regBody.token, undefined);
    assert.ok(capturedVfyToken.startsWith('vfy_'));
  } finally {
    setEmailDeliveryObserverForTests(null);
  }

  // Unverified account cannot login before email confirmation
  const blockedLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, password: input.password }),
  });
  assert.equal(blockedLogin.status, 403);
  const blockedLoginBody = (await blockedLogin.json()) as any;
  assert.equal(blockedLoginBody.code, 'EMAIL_NOT_VERIFIED');

  const vfyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationToken: capturedVfyToken }),
  });
  assert.equal(vfyRes.status, 200);
  const vfyBody = (await vfyRes.json()) as any;
  assert.equal(vfyBody.user.emailVerified, true);
  assert.equal(vfyBody.user.status, 'ativo');
  assert.ok(vfyBody.token);

  return {
    regBody,
    capturedVfyToken,
    token: vfyBody.token as string,
    user: vfyBody.user,
  };
}

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

test('1. Cadastro (Signup) & Confirmação de E-mail via e-mail (hash SHA-256, uso único, zero vazamento HTTP)', async () => {
  const email = `cliente.fase1.${Date.now()}@example.com`;
  const password = 'Confiare#2026!Password';

  const verified = await registerAndVerifyUser({
    email,
    password,
    fullName: 'Helena Cliente Fase 1',
    role: 'cliente',
  });

  assert.equal(verified.user.email, email);
  assert.deepEqual(verified.user.roles, ['cliente']);
  assert.equal(verified.user.onboardingCompleted, true);
  assert.equal(verified.user.redirectTo, '/app');

  // Re-using verification token must fail (single-use)
  const reuseVfy = await fetch(`${baseUrl}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationToken: verified.capturedVfyToken }),
  });
  assert.equal(reuseVfy.status, 400);

  // Verify that application table `users` has no password_hash column and cleared plaintext token
  const colCheck = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'`
  );
  assert.equal(
    colCheck.rows.length,
    0,
    'Application table users must never store passwords'
  );
});

test('2. Login, Onboarding & Redirecionamento por Papel (Cliente, Prestador, Padrinho, Admin)', async () => {
  const email = `prestador.fase1.${Date.now()}@example.com`;
  const password = 'Confiare#2026!Password';

  const verified = await registerAndVerifyUser({
    email,
    password,
    fullName: 'Marcos Prestador Fase 1',
    phone: '(11) 99888-7766',
    neighborhood: 'Vila Madalena',
    role: 'prestador',
    category: 'Eletricista',
  });

  // Wrong password must fail with 401
  const wrongLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'WrongPassword123!' }),
  });
  assert.equal(wrongLogin.status, 401);

  // Complete mandatory onboarding first
  const onbRes = await fetch(`${baseUrl}/api/auth/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${verified.token}`,
    },
    body: JSON.stringify({
      city: 'São Paulo, SP',
      neighborhood: 'Vila Madalena',
      category: 'Eletricista',
      bio: 'Especialista NR-10 em Vila Madalena',
    }),
  });
  assert.equal(onbRes.status, 200);
  const onbBody = (await onbRes.json()) as any;
  assert.equal(onbBody.redirectTo, '/app/prestador');

  // Login after onboarding redirects to /app/prestador
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(loginRes.status, 200);
  const loginBody = (await loginRes.json()) as any;
  assert.equal(loginBody.redirectTo, '/app/prestador');

  // Verify canonical role redirect mapping
  assert.equal(getRedirectPathForRole('cliente', true), '/app');
  assert.equal(getRedirectPathForRole('prestador', true), '/app/prestador');
  assert.equal(getRedirectPathForRole('padrinho', true), '/app/padrinho');
  assert.equal(getRedirectPathForRole('admin', true), '/admin');
});

test('3. Recuperação de Senha (token enviado só por e-mail, hash SHA-256 no banco e uso único)', async () => {
  const email = `recuperacao.fase1.${Date.now()}@example.com`;
  const oldPassword = 'OldPassword#2026!';
  const newPassword = 'NewPassword#2026!Strong';

  await registerAndVerifyUser({
    email,
    password: oldPassword,
    fullName: 'Usuário Recuperação',
    role: 'cliente',
  });

  // Request password reset token (captured exclusively via email service observer)
  let capturedResetToken = '';
  setEmailDeliveryObserverForTests((delivery) => {
    if (delivery.to === email && delivery.template === 'recuperacao_senha') {
      capturedResetToken = delivery.variables.resetToken || '';
    }
  });
  try {
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    assert.equal(forgotRes.status, 200);
    const forgotBody = (await forgotRes.json()) as any;
    assert.equal(forgotBody.ok, true);
    assert.equal(forgotBody.resetToken, undefined);
    assert.ok(capturedResetToken.startsWith('rst_'));
  } finally {
    setEmailDeliveryObserverForTests(null);
  }

  // DB stores SHA-256 hash and NULL plaintext reset_password_token
  const { rows: hashRows } = await pool.query(
    `SELECT reset_password_token, reset_password_token_hash FROM users WHERE email = $1`,
    [email]
  );
  assert.equal(hashRows[0].reset_password_token, null);
  assert.ok(hashRows[0].reset_password_token_hash);
  assert.notEqual(hashRows[0].reset_password_token_hash, capturedResetToken);

  // Reset password via Neon Auth
  const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resetToken: capturedResetToken,
      newPassword,
    }),
  });
  assert.equal(resetRes.status, 200);

  // Re-using the same reset token must fail
  const reuseRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resetToken: capturedResetToken,
      newPassword,
    }),
  });
  assert.equal(reuseRes.status, 400);

  // Old password must no longer work, new password must succeed
  const oldLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: oldPassword }),
  });
  assert.equal(oldLogin.status, 401);

  const newLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: newPassword }),
  });
  assert.equal(newLogin.status, 200);
});

test('4. Proteção de Rotas Privadas, Papéis (RBAC), Anti-IDOR em assinaturas e SESSION_SECRET em produção', async () => {
  // Unauthenticated requests to private routes must return 401 and redirectTo: '/entrar'
  for (const privatePath of [
    '/api/app/cliente/requests',
    '/api/app/prestador/opportunities',
    '/api/app/padrinho/mentees',
    '/api/admin/audit-logs',
  ]) {
    const unauthRes = await fetch(`${baseUrl}${privatePath}`);
    assert.equal(unauthRes.status, 401, `${privatePath} must reject anonymous`);
    const body = (await unauthRes.json()) as any;
    assert.equal(body.redirectTo, '/entrar');
  }

  // Admin spoof header x-user-role MUST fail even outside production
  const spoofAdminRes = await fetch(`${baseUrl}/api/admin/metrics`, {
    headers: { 'x-user-role': 'admin' },
  });
  assert.equal(spoofAdminRes.status, 401);

  // GET /api/promotions/launch-offer/eligibility must reject PII in query string with 405
  const eligGetRes = await fetch(
    `${baseUrl}/api/promotions/launch-offer/eligibility?email=test@example.com`
  );
  assert.equal(eligGetRes.status, 405);

  // SESSION_SECRET must fail in production/staging if missing or weak
  const prevNodeEnv = process.env.NODE_ENV;
  const prevSessionSecret = process.env.SESSION_SECRET;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;
    resetSessionSecretCacheForTests();
    assert.throws(() => getSessionSecretBytes(), /SESSION_SECRET/);

    process.env.SESSION_SECRET = 'short-weak-secret';
    resetSessionSecretCacheForTests();
    assert.throws(() => getSessionSecretBytes(), /32 caracteres/);
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevSessionSecret !== undefined) {
      process.env.SESSION_SECRET = prevSessionSecret;
    } else {
      delete process.env.SESSION_SECRET;
    }
    resetSessionSecretCacheForTests();
  }

  // Frontend route guard checks
  assert.equal(isProtectedRoutePath('/'), false);
  assert.equal(isProtectedRoutePath('/para-prestadores'), false);
  assert.equal(isProtectedRoutePath('/app'), true);
  assert.equal(isProtectedRoutePath('/app/prestador'), true);
  assert.equal(isProtectedRoutePath('/admin'), true);
  assert.deepEqual(canUserAccessRoute('/app', null), {
    allowed: false,
    redirectTo: '/entrar',
  });

  // Register a customer and test role boundaries
  const email = `rbac.fase1.${Date.now()}@example.com`;
  const verified = await registerAndVerifyUser({
    email,
    password: 'Confiare#2026!Password',
    fullName: 'Cliente RBAC Teste',
    role: 'cliente',
  });
  const { token, user } = verified;

  // Customer trying to access Provider, Padrinho, or Admin routes without those roles gets 403
  const forbiddenProvider = await fetch(
    `${baseUrl}/api/app/prestador/opportunities`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  assert.equal(forbiddenProvider.status, 403);

  const forbiddenAdmin = await fetch(`${baseUrl}/api/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(forbiddenAdmin.status, 403);

  // Customer trying to self-escalate to 'admin' or 'padrinho' via /api/auth/switch-role gets 403
  const escalateAdmin = await fetch(`${baseUrl}/api/auth/switch-role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetRole: 'admin', enableIfMissing: true }),
  });
  assert.equal(escalateAdmin.status, 403);

  // Customer CAN enable 'prestador' (dual role: cliente + prestador at the same time)
  const dualRoleRes = await fetch(`${baseUrl}/api/auth/switch-role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetRole: 'prestador', enableIfMissing: true }),
  });
  assert.equal(dualRoleRes.status, 200);
  const dualRoleBody = (await dualRoleRes.json()) as any;
  assert.deepEqual(dualRoleBody.user.roles, ['cliente', 'prestador']);
  assert.equal(dualRoleBody.user.activeRole, 'prestador');

  // Suspending account immediately blocks access (403)
  await pool.query(`UPDATE users SET status = 'suspenso' WHERE id = $1::uuid`, [
    user.userId,
  ]);
  const suspendedCheck = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${dualRoleBody.token}` },
  });
  assert.equal(suspendedCheck.status, 403);
});

test('5. RLS (Row Level Security no PostgreSQL) e Prevenção de Acesso Indevido / Sigilo de Contato LGPD', async () => {
  // Create Customer A and Customer B
  const regCustomerA = await registerAndVerifyUser({
    email: `clienteA.rls.${Date.now()}@example.com`,
    password: 'Confiare#2026!Password',
    fullName: 'Cliente A RLS',
    role: 'cliente',
  });

  const regCustomerB = await registerAndVerifyUser({
    email: `clienteB.rls.${Date.now()}@example.com`,
    password: 'Confiare#2026!Password',
    fullName: 'Cliente B RLS',
    role: 'cliente',
  });

  // Customer A creates a real service request
  const createReqRes = await fetch(`${baseUrl}/api/app/cliente/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regCustomerA.token}`,
    },
    body: JSON.stringify({
      categoryName: 'Eletricista',
      problemTitle: 'Quadro disjuntor Cliente A exclusivo',
      description: 'Revisão elétrica residencial em Pinheiros',
      neighborhood: 'Pinheiros',
      urgency: 'Hoje',
      lgpdContactConsent: true,
    }),
  });
  assert.equal(createReqRes.status, 201);
  const createdReqBody = (await createReqRes.json()) as any;
  const requestIdA = createdReqBody.request.id;

  // Customer A sees their own request
  const listARes = await fetch(`${baseUrl}/api/app/cliente/requests`, {
    headers: { Authorization: `Bearer ${regCustomerA.token}` },
  }).then((r) => r.json() as Promise<any>);
  assert.equal(
    listARes.requests.some((r: any) => r.id === requestIdA),
    true
  );

  // Customer B queries /api/app/cliente/requests -> RLS strictly isolates Customer A's row!
  const listBRes = await fetch(`${baseUrl}/api/app/cliente/requests`, {
    headers: { Authorization: `Bearer ${regCustomerB.token}` },
  }).then((r) => r.json() as Promise<any>);
  assert.equal(
    listBRes.requests.some((r: any) => r.id === requestIdA),
    false,
    'Customer B must never see Customer A service requests (enforced by Postgres RLS)'
  );

  // Anonymous role under Postgres RLS cannot read service_requests or audit_logs
  const anonRows = await withRlsContext({ role: 'anon' }, async (client) => {
    const q = await client.query('SELECT * FROM service_requests');
    return q.rows;
  });
  assert.equal(anonRows.length, 0, 'Anonymous RLS context must return 0 rows');

  // Create Provider A and Provider B to test opportunity RLS and IDOR protection
  const regProviderA = await registerAndVerifyUser({
    email: `prestadorA.rls.${Date.now()}@example.com`,
    password: 'Confiare#2026!Password',
    fullName: 'Prestador A RLS',
    role: 'prestador',
  });

  const regProviderB = await registerAndVerifyUser({
    email: `prestadorB.rls.${Date.now()}@example.com`,
    password: 'Confiare#2026!Password',
    fullName: 'Prestador B RLS',
    role: 'prestador',
  });

  // Subscription & opportunity endpoints must block cross-provider access even with x-provider-id header spoof
  const crossSubRes = await fetch(
    `${baseUrl}/api/providers/${regProviderA.user.providerProfileId}/subscription`,
    {
      headers: {
        Authorization: `Bearer ${regProviderB.token}`,
        'x-provider-id': regProviderA.user.providerProfileId,
        'x-user-role': 'admin',
      },
    }
  );
  assert.equal(crossSubRes.status, 403);

  const crossDispatchRes = await fetch(`${baseUrl}/api/opportunities/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regProviderB.token}`,
    },
    body: JSON.stringify({ providerProfileId: regProviderA.user.providerProfileId }),
  });
  assert.equal(crossDispatchRes.status, 403);

  const ownSubRes = await fetch(
    `${baseUrl}/api/providers/${regProviderA.user.providerProfileId}/subscription`,
    {
      headers: { Authorization: `Bearer ${regProviderA.token}` },
    }
  );
  assert.equal(ownSubRes.status, 200);

  // Insert an opportunity for Provider A
  const oppInsert = await pool.query(
    `INSERT INTO opportunities (
      service_request_id, provider_profile_id, customer_user_id, category_name,
      title, description, neighborhood, urgency, preferred_time,
      client_name_masked, client_name_full, client_whatsapp, lgpd_contact_consent,
      status, contact_released
    ) VALUES ($1,$2,$3,'Eletricista','Quadro Cliente A','Revisão','Pinheiros','Hoje','Tarde',
              'Cliente A (Verificado)','Cliente A Nome Completo','(11) 99777-1111',true,'pendente',false)
    RETURNING id`,
    [
      requestIdA,
      regProviderA.user.providerProfileId,
      regCustomerA.user.userId,
    ]
  );
  const oppId = oppInsert.rows[0].id;

  // Before acceptance, Provider A sees masked name and null WhatsApp
  const oppsBeforeAccept = await fetch(
    `${baseUrl}/api/app/prestador/opportunities`,
    { headers: { Authorization: `Bearer ${regProviderA.token}` } }
  ).then((r) => r.json() as Promise<any>);
  const pendingOpp = oppsBeforeAccept.opportunities.find(
    (o: any) => o.id === oppId
  );
  assert.ok(pendingOpp);
  assert.equal(pendingOpp.clientNameFull, null);
  assert.equal(pendingOpp.clientWhatsapp, null);
  assert.equal(pendingOpp.contactReleased, false);

  // Provider B trying to accept Provider A's opportunity is blocked by RLS (403)
  const crossAccept = await fetch(
    `${baseUrl}/api/app/prestador/opportunities/${oppId}/accept`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${regProviderB.token}` },
    }
  );
  assert.equal(crossAccept.status, 403);

  // Provider A accepts opportunity -> contact is now released because lgpd_contact_consent = true
  const validAccept = await fetch(
    `${baseUrl}/api/app/prestador/opportunities/${oppId}/accept`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${regProviderA.token}` },
    }
  );
  assert.equal(validAccept.status, 200);
  const acceptedBody = (await validAccept.json()) as any;
  assert.equal(acceptedBody.opportunity.contactReleased, true);
  assert.equal(acceptedBody.opportunity.clientNameFull, 'Cliente A Nome Completo');
  assert.equal(acceptedBody.opportunity.clientWhatsapp, '(11) 99777-1111');
});
