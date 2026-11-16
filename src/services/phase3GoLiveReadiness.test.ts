import test from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../server/index';
import { ensureSchemaAndSeed, neonEnv, pool } from '../db/index';
import { assetsFiles } from '../server/neonServices';

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
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await pool.end();
});

async function registerUserAndPromote(role: 'cliente' | 'admin') {
  const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const email = `f3.${role}.${ts}@example.com`;
  const password = 'Confiare#2026!Password';

  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      fullName: role === 'admin' ? 'Admin Fase 3' : 'Cliente Fase 3',
      phone: '(11) 99123-9876',
      neighborhood: 'Pinheiros',
      role: 'cliente',
      lgpdConsent: true,
    }),
  });
  assert.equal(regRes.status, 201);
  const regBody = (await regRes.json()) as any;

  await fetch(`${baseUrl}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationToken: regBody.verificationToken }),
  });

  if (role === 'admin') {
    await pool.query(
      `UPDATE users SET roles = ARRAY['admin']::TEXT[], active_role = 'admin', onboarding_completed = true WHERE id = $1`,
      [regBody.user.userId]
    );
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(loginRes.status, 200);
    const loginBody = (await loginRes.json()) as any;
    return { token: loginBody.token as string, user: loginBody.user };
  }

  return { token: regBody.token as string, user: regBody.user };
}

test('1. Healthcheck (/api/health): retorna disponibilidade, latência PostgreSQL e >= 12 tabelas com RLS ativo', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;

  assert.equal(body.ok, true);
  assert.equal(body.status, 'healthy');
  assert.equal(typeof body.dbLatencyMs, 'number');
  assert.ok(body.dbLatencyMs >= 0);
  assert.ok(
    body.rlsProtectedTablesCount >= 12,
    `Esperado >= 12 tabelas com RLS ativo, recebido ${body.rlsProtectedTablesCount}`
  );
  assert.deepEqual(body.missingRlsTables, []);
});

test('2. Backups (/api/admin/backups/snapshot): bloqueia não-admin (403) e gera snapshot real no Neon Object Storage com auditoria', async () => {
  const cliente = await registerUserAndPromote('cliente');
  const admin = await registerUserAndPromote('admin');

  // Visitante anônimo bloqueado (403)
  const anonRes = await fetch(`${baseUrl}/api/admin/backups/snapshot`, {
    method: 'POST',
  });
  assert.equal(anonRes.status, 403);

  // Usuário cliente autenticado bloqueado (403)
  const clientRes = await fetch(`${baseUrl}/api/admin/backups/snapshot`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cliente.token}` },
  });
  assert.equal(clientRes.status, 403);

  // Admin autorizado gera snapshot real no bucket 'assets' do Neon Object Storage
  const adminRes = await fetch(`${baseUrl}/api/admin/backups/snapshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
    },
  });
  assert.equal(adminRes.status, 201);
  const adminBody = (await adminRes.json()) as any;
  assert.equal(adminBody.ok, true);
  assert.ok(adminBody.backup.backupId);
  assert.ok(adminBody.backup.objectKey.startsWith('backups/confiare-backup-'));
  assert.ok(adminBody.backup.objectKey.endsWith('.json'));
  assert.ok(adminBody.backup.sizeBytes > 100);
  assert.ok(adminBody.backup.tablesBackedUp.plans >= 5);

  // Confirma download real do Object Storage
  const downloaded = await assetsFiles.download(adminBody.backup.objectKey);
  const parsedSnapshot = JSON.parse(await downloaded.text());
  assert.equal(parsedSnapshot.backupId, adminBody.backup.backupId);

  // Confirma auditoria em audit_logs
  const { rows: auditRows } = await pool.query(
    `SELECT * FROM audit_logs WHERE action = 'database_backup_snapshot_created' AND target_id = $1`,
    [adminBody.backup.backupId]
  );
  assert.equal(auditRows.length, 1);
  assert.equal(auditRows[0].actor_user_id, admin.user.userId);
});

test('3. Monitoramento de Alertas (/api/admin/monitoring/alerts): grava alerta crítico em audit_logs e notifications', async () => {
  const admin = await registerUserAndPromote('admin');

  const alertRes = await fetch(`${baseUrl}/api/admin/monitoring/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
    },
    body: JSON.stringify({
      source: 'webhook-billing',
      message: 'Falha simulada de timeout ao validar gateway de pagamento',
      severity: 'critical',
      metadata: { statusCode: 504, retryCount: 2 },
    }),
  });

  assert.equal(alertRes.status, 201);
  const alertBody = (await alertRes.json()) as any;
  assert.equal(alertBody.ok, true);
  assert.equal(alertBody.alert.severity, 'critical');
  assert.equal(alertBody.alert.notified, true);
  assert.ok(alertBody.alert.alertId);

  const { rows: auditRows } = await pool.query(
    `SELECT * FROM audit_logs WHERE action = 'system_error_alert' AND target_id = $1`,
    [alertBody.alert.alertId]
  );
  assert.equal(auditRows.length, 1);

  const { rows: notifRows } = await pool.query(
    `SELECT * FROM notifications WHERE type = 'system_error_alert' AND user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [admin.user.userId]
  );
  assert.equal(notifRows.length, 1);
  assert.ok(notifRows[0].title.includes('CRITICAL'));
});

test('4. Blindagem de Produção (/api/neon/* exige admin em NODE_ENV=production) e zero vazamento de segredos em rotas públicas', async () => {
  const admin = await registerUserAndPromote('admin');
  const prevEnv = process.env.NODE_ENV;

  try {
    process.env.NODE_ENV = 'production';

    // Visitante anônimo tentando acessar diagnóstico Neon em produção -> bloqueado (403)
    const anonNeonRes = await fetch(`${baseUrl}/api/neon/postgres`);
    assert.equal(anonNeonRes.status, 403);

    // Tentativa de falsificação via header x-user-role em produção -> bloqueado (403)
    const spoofNeonRes = await fetch(`${baseUrl}/api/neon/postgres`, {
      headers: { 'x-user-role': 'admin' },
    });
    assert.equal(spoofNeonRes.status, 403);

    // Admin autenticado com token real -> autorizado (200)
    const adminNeonRes = await fetch(`${baseUrl}/api/neon/postgres`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.equal(adminNeonRes.status, 200);

    // Admin autenticado em /api/admin/system-health -> 200
    const sysHealthRes = await fetch(`${baseUrl}/api/admin/system-health`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert.equal(sysHealthRes.status, 200);
    const sysHealthBody = (await sysHealthRes.json()) as any;
    assert.equal(sysHealthBody.ok, true);
    assert.ok(sysHealthBody.integrations);
  } finally {
    process.env.NODE_ENV = prevEnv;
  }

  // Verificar que respostas públicas não contêm segredos de ambiente
  const publicEndpoints = [
    '/api/health',
    '/api/plans',
    '/api/public/categories',
    '/api/public/providers',
  ];
  const forbiddenSecrets = [
    neonEnv.postgres.databaseUrl,
    neonEnv.postgres.databaseUrlUnpooled,
    neonEnv.storage.secretAccessKey,
    neonEnv.realtime.secret,
    process.env.ASAAS_API_KEY,
    process.env.ASAAS_WEBHOOK_TOKEN,
  ].filter((s): s is string => Boolean(s && s.length > 8));

  for (const endpoint of publicEndpoints) {
    const res = await fetch(`${baseUrl}${endpoint}`);
    assert.equal(res.status, 200);
    const text = await res.text();
    for (const secret of forbiddenSecrets) {
      assert.equal(
        text.includes(secret),
        false,
        `Segredo vazado na rota pública ${endpoint}!`
      );
    }
  }
});
