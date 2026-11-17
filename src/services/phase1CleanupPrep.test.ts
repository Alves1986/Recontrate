import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import {
  assertCanRunDemoSeed,
  assertDistinctDatabaseUrls,
  assertNonProductionGuard,
  assertRealExternalActionAllowed,
  DEMO_BANNER_TEXT,
  isDemoModeEnabled,
} from '../config/environment';
import { pool } from '../db/index';
import { runReferenceSeed } from '../../scripts/seed-reference';
import { runDemoSeed } from '../../scripts/seed-demo';
import { runFullLocalBackup } from '../../scripts/backup-full-database';
import {
  TransactionalEmailService,
  WhatsAppBusinessService,
} from './essentialIntegrations';

const ENV_BACKUP = {
  NODE_ENV: process.env.NODE_ENV,
  DEMO_MODE: process.env.DEMO_MODE,
};

function restoreEnv() {
  if (ENV_BACKUP.NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = ENV_BACKUP.NODE_ENV;

  if (ENV_BACKUP.DEMO_MODE === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = ENV_BACKUP.DEMO_MODE;
}

test('1. Proteções de ambiente bloqueiam seed/reset/teste em produção e URLs duplicadas', () => {
  try {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = 'true';

    // Nunca ativa DEMO_MODE em produção
    assert.equal(isDemoModeEnabled(), false);

    assert.throws(
      () => assertNonProductionGuard('reset-db'),
      /BLOQUEIO DE PRODUÇÃO/
    );
    assert.throws(
      () => assertCanRunDemoSeed(),
      /ALERTA CRÍTICO DE SEGURANÇA/
    );

    assert.throws(
      () =>
        assertDistinctDatabaseUrls({
          development: 'postgresql://user:pass@host/dev',
          staging: 'postgresql://user:pass@host/dev',
          production: 'postgresql://user:pass@host/prod',
        }),
      /DATABASE_URL idêntica/
    );
  } finally {
    restoreEnv();
  }
});

test('2. Modo DEMO_MODE=true fora de produção bloqueia ações reais de conta, e-mail, WhatsApp, pagamento e webhook', async () => {
  try {
    process.env.NODE_ENV = 'demo';
    process.env.DEMO_MODE = 'true';

    assert.equal(isDemoModeEnabled(), true);
    assert.equal(DEMO_BANNER_TEXT, 'Ambiente de demonstração');

    for (const ch of ['signup', 'email', 'whatsapp', 'payment', 'webhook'] as const) {
      const check = assertRealExternalActionAllowed(ch);
      assert.equal(check.allowed, false, `${ch} deve ser bloqueado em DEMO_MODE`);
      assert.match(check.reason || '', /Ambiente de demonstração/);
    }

    const emailSvc = new TransactionalEmailService();
    const emailRes = await emailSvc.sendEmail({
      to: 'cliente.demo@demo.confiare.invalid',
      subject: 'Teste Demo',
      template: 'confirmacao_email',
      variables: { codigo: '123456' },
    });
    assert.equal(emailRes.delivered, false);
    assert.equal(emailRes.provider, 'demo-mode-suppressed');

    const wabaSvc = new WhatsAppBusinessService();
    const wabaRes = await wabaSvc.sendTemplateNotification({
      recipientPhone: '(11) 90000-0101',
      templateName: 'nova_oportunidade_compativel',
      parameters: { bairro: 'Pinheiros' },
    });
    assert.equal(wabaRes.sent, false);
    assert.equal(wabaRes.channel, 'demo-mode-suppressed');
  } finally {
    restoreEnv();
  }
});

test('3. runDemoSeed aborta em produção e quando DEMO_MODE=false', async () => {
  try {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_MODE = 'true';
    await assert.rejects(
      () => runDemoSeed(),
      /ALERTA CRÍTICO DE SEGURANÇA/
    );

    process.env.NODE_ENV = 'development';
    process.env.DEMO_MODE = 'false';
    await assert.rejects(() => runDemoSeed(), /DEMO_MODE=true/);
  } finally {
    restoreEnv();
  }
});

test('4. Seed de referência (01..05.sql) roda de forma idempotente e mantém catálogo e settings íntegros', async () => {
  const res1 = await runReferenceSeed();
  const res2 = await runReferenceSeed();

  assert.deepEqual(res1.filesExecuted, [
    '01-categories.sql',
    '02-specialties.sql',
    '03-plans.sql',
    '04-platform-settings.sql',
    '05-roles.sql',
  ]);
  assert.deepEqual(res2.filesExecuted, res1.filesExecuted);

  const [{ rows: cats }, { rows: specs }, { rows: plans }, { rows: settings }, { rows: roles }] =
    await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS c FROM categories WHERE ativo = true`),
      pool.query(
        `SELECT COUNT(*)::int AS c FROM specialties WHERE oficial = true AND criado_por = 'sistema' AND ativo = true`
      ),
      pool.query(`SELECT COUNT(*)::int AS c FROM plans WHERE ativo = true`),
      pool.query(`SELECT key, value_json FROM platform_settings`),
      pool.query(`SELECT slug FROM roles ORDER BY slug ASC`),
    ]);

  assert.equal(cats[0].c, 10);
  assert.equal(specs[0].c, 81);
  assert.equal(plans[0].c, 5);
  assert.ok(settings.length >= 8);
  assert.deepEqual(
    roles.map((r: any) => r.slug),
    ['admin', 'cliente', 'padrinho', 'prestador']
  );
});

test('5. Script backup-full-database gera backup JSON completo + checksum SHA-256 sem apagar dados', async () => {
  const backup = await runFullLocalBackup();
  assert.equal(existsSync(backup.filePath), true);
  assert.equal(existsSync(`${backup.filePath}.sha256`), true);
  assert.ok(backup.sizeBytes > 1000);
  assert.ok(Object.keys(backup.tablesBackedUp).length >= 36);
  assert.ok('categories' in backup.tablesBackedUp);
  assert.ok('specialties' in backup.tablesBackedUp);
  assert.ok('plans' in backup.tablesBackedUp);
  assert.ok('platform_settings' in backup.tablesBackedUp);
  assert.ok('roles' in backup.tablesBackedUp);

  const parsed = JSON.parse(readFileSync(backup.filePath, 'utf-8'));
  assert.equal(parsed.sha256, backup.sha256);

  // Limpa apenas o arquivo de backup gerado especificamente por este teste automatizado
  rmSync(backup.filePath, { force: true });
  rmSync(`${backup.filePath}.sha256`, { force: true });
});

test.after(async () => {
  await pool.end();
});
