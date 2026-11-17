import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { Pool } from 'pg';
import { neonEnv, pool } from '../src/db/index';
import {
  assertDistinctDatabaseUrls,
  getNodeEnvironment,
} from '../src/config/environment';
import { runFullLocalBackup } from './backup-full-database';

export interface TableCleanupStats {
  schema: string;
  table: string;
  before: number;
  removed: number;
  preserved: number;
}

export interface ProductionCleanupReport {
  executedAt: string;
  environment: string;
  backupId: string;
  backupFilePath: string;
  backupSha256: string;
  s3ObjectsRemoved: string[];
  s3ObjectsRemaining: string[];
  tableStats: TableCleanupStats[];
  referenceValidation: {
    categoriesCount: number;
    officialSpecialtiesCount: number;
    syntheticSpecialtiesRemaining: number;
    plansCount: number;
    platformSettingsCount: number;
    rolesCount: number;
    campaignsCount: number;
    testUsersRemainingPublic: number;
    testUsersRemainingNeonAuth: number;
    realAdminsPreserved: number;
  };
}

async function getAllTableCounts(
  client: Pool | { query: Pool['query'] }
): Promise<Map<string, number>> {
  const { rows: tables } = await client.query<{
    table_schema: string;
    table_name: string;
  }>(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema IN ('public', 'neon_auth')
    ORDER BY table_schema, table_name
  `);

  const counts = new Map<string, number>();
  for (const t of tables) {
    const key = `${t.table_schema}.${t.table_name}`;
    const { rows } = await client.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM "${t.table_schema}"."${t.table_name}"`
    );
    counts.set(key, rows[0].c);
  }
  return counts;
}

export async function executeProductionCleanup(options: {
  confirmProductionCleanup: boolean;
  dryRun?: boolean;
}): Promise<ProductionCleanupReport> {
  if (!options.confirmProductionCleanup) {
    throw new Error(
      '[BLOQUEIO DE SEGURANÇA] Confirmação explícita obrigatória (--confirm-production-cleanup).'
    );
  }

  assertDistinctDatabaseUrls();

  // 1. Backup completo obrigatório ANTES de qualquer exclusão
  const backup = await runFullLocalBackup();
  if (!backup.filePath || backup.sizeBytes <= 0) {
    throw new Error(
      '[BLOQUEIO] Falha na geração ou validação do backup pré-limpeza. Limpeza abortada.'
    );
  }

  const directUrl = neonEnv.postgres.databaseUrlUnpooled.replace(
    'sslmode=require',
    'sslmode=verify-full'
  );
  const directPool = new Pool({ connectionString: directUrl, max: 2 });
  const client = await directPool.connect();
  const s3ObjectsToDelete: string[] = [];

  try {
    const beforeCounts = await getAllTableCounts(client);

    await client.query('BEGIN');

    // Conjuntos explícitos de registros de teste/fictícios/órfãos (preservando reais e referência)
    await client.query(`
      CREATE TEMP TABLE tmp_test_users ON COMMIT DROP AS
      SELECT id, neon_auth_user_id, email
      FROM public.users
      WHERE email LIKE '%@example.com'
         OR email LIKE '%@demo.confiare.invalid'
         OR email IN ('adfree@confiare.com.br', 'adcap@confiare.com.br');

      CREATE TEMP TABLE tmp_test_providers ON COMMIT DROP AS
      SELECT id
      FROM public.provider_profiles
      WHERE user_id IN (SELECT id FROM tmp_test_users)
         OR id IN ('prov-joao', 'prov-carlos', 'prov-ana')
         OR id LIKE 'demo-%'
         OR id LIKE 'prov-launch-%'
         OR id LIKE 'prov-abuse-%'
         OR id LIKE 'prov-notice-%'
         OR id LIKE 'prov-ad-%'
         OR id LIKE 'prov-free-%'
         OR id LIKE 'prov-paid-%'
         OR id LIKE 'prov-limit-%'
         OR id LIKE 'prov-sub-%'
         OR name LIKE '%@example.com'
         OR whatsapp IN ('(11) 99000-0000', '(11) 99123-4455', '(11) 99111-2233', '(11) 99888-7766');

      CREATE TEMP TABLE tmp_test_provider_ids_all ON COMMIT DROP AS
      SELECT id FROM tmp_test_providers
      UNION
      SELECT DISTINCT provider_profile_id AS id FROM public.subscriptions
      WHERE provider_profile_id LIKE 'prov-%' OR provider_profile_id LIKE 'demo-%'
      UNION
      SELECT DISTINCT provider_profile_id AS id FROM public.opportunity_usage
      WHERE provider_profile_id LIKE 'prov-%' OR provider_profile_id LIKE 'demo-%'
      UNION
      SELECT DISTINCT provider_profile_id AS id FROM public.ad_impressions
      WHERE provider_profile_id LIKE 'prov-%' OR provider_profile_id LIKE 'demo-%'
      UNION
      SELECT DISTINCT provider_profile_id AS id FROM public.promotional_redemptions
      WHERE provider_profile_id LIKE 'prov-%' OR provider_profile_id LIKE 'demo-%'
      UNION
      SELECT DISTINCT provider_profile_id AS id FROM public.promotion_eligibility_checks
      WHERE provider_profile_id IS NOT NULL
        AND (provider_profile_id LIKE 'prov-%' OR provider_profile_id LIKE 'demo-%');

      CREATE TEMP TABLE tmp_test_subs ON COMMIT DROP AS
      SELECT id
      FROM public.subscriptions
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all);

      CREATE TEMP TABLE tmp_test_ad_slots ON COMMIT DROP AS
      SELECT id
      FROM public.ad_slots
      WHERE id IN ('ad-ferramentas-1', 'ad-google-adsense-1')
         OR id LIKE 'demo-%';

      CREATE TEMP TABLE tmp_test_requests ON COMMIT DROP AS
      SELECT id
      FROM public.service_requests
      WHERE customer_user_id IN (SELECT id FROM tmp_test_users);

      CREATE TEMP TABLE tmp_test_repeat_requests ON COMMIT DROP AS
      SELECT id
      FROM public.repeat_requests
      WHERE customer_user_id IN (SELECT id FROM tmp_test_users)
         OR provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all);
    `);

    // Ordem segura de exclusão (filhas -> pais)
    await client.query(`
      DELETE FROM public.ad_clicks
      WHERE ad_slot_id IN (SELECT id FROM tmp_test_ad_slots)
         OR provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all);

      DELETE FROM public.ad_impressions
      WHERE ad_slot_id IN (SELECT id FROM tmp_test_ad_slots)
         OR provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all);

      DELETE FROM public.ad_slots
      WHERE id IN (SELECT id FROM tmp_test_ad_slots);

      DELETE FROM public.realtime_notifications
      WHERE id = 'notif-seed-1'
         OR id LIKE 'demo-%'
         OR provider_id IN (SELECT id FROM tmp_test_provider_ids_all);

      DELETE FROM public.notifications
      WHERE user_id IN (SELECT id FROM tmp_test_users)
         OR provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all);

      DELETE FROM public.audit_logs
      WHERE actor_user_id IN (SELECT id FROM tmp_test_users)
         OR actor_user_id IS NULL
         OR action = 'blocked_demo_seed_in_production'
         OR metadata_json::text LIKE '%@example.com%'
         OR metadata_json::text LIKE '%prov-launch-%'
         OR metadata_json::text LIKE '%prov-notice-%';

      DELETE FROM public.processed_webhook_events
      WHERE event_id LIKE 'evt\_%' ESCAPE '\\';

      DELETE FROM public.invoices
      WHERE subscription_id IN (SELECT id FROM tmp_test_subs);

      DELETE FROM public.subscription_events
      WHERE subscription_id IN (SELECT id FROM tmp_test_subs);

      DELETE FROM public.subscriptions
      WHERE id IN (SELECT id FROM tmp_test_subs);

      DELETE FROM public.opportunity_usage
      WHERE subscription_id IN (SELECT id FROM tmp_test_subs)
         OR provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all);

      DELETE FROM public.promotional_redemptions
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all)
         OR user_id::text IN (SELECT id::text FROM tmp_test_users);

      DELETE FROM public.promotion_eligibility_checks
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all)
         OR user_id::text IN (SELECT id::text FROM tmp_test_users)
         OR email_normalizado LIKE '%@example.com'
         OR email_normalizado LIKE '%@demo.confiare.invalid'
         OR (user_id IS NULL AND provider_profile_id IS NULL AND email_normalizado = '');

      -- Nunca exclui campanha oficial camp-lancamento-50-off; remove apenas se houver campanha de teste
      DELETE FROM public.promotional_campaigns
      WHERE slug LIKE '%test%' OR slug LIKE 'demo-%';

      DELETE FROM public.reviews
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all)
         OR customer_user_id IN (SELECT id FROM tmp_test_users);

      DELETE FROM public.service_assignments
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all)
         OR customer_user_id IN (SELECT id FROM tmp_test_users)
         OR service_request_id IN (SELECT id FROM tmp_test_requests);

      DELETE FROM public.opportunities
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all)
         OR customer_user_id IN (SELECT id FROM tmp_test_users)
         OR service_request_id IN (SELECT id FROM tmp_test_requests);

      DELETE FROM public.substitute_referrals
      WHERE original_provider_id IN (SELECT id FROM tmp_test_provider_ids_all)
         OR customer_user_id IN (SELECT id FROM tmp_test_users)
         OR repeat_request_id IN (SELECT id FROM tmp_test_repeat_requests);

      DELETE FROM public.repeat_requests
      WHERE id IN (SELECT id FROM tmp_test_repeat_requests);

      DELETE FROM public.service_requests
      WHERE id IN (SELECT id FROM tmp_test_requests);

      DELETE FROM public.professional_trust_list
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all)
         OR customer_user_id IN (SELECT id FROM tmp_test_users);

      DELETE FROM public.mentorships
      WHERE mentor_provider_id IN (SELECT id FROM tmp_test_provider_ids_all)
         OR mentee_provider_id IN (SELECT id FROM tmp_test_provider_ids_all);

      DELETE FROM public.provider_custom_tags
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all);

      DELETE FROM public.provider_specialties
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all);

      DELETE FROM public.specialty_suggestions
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all);

      -- Remove apenas especialidades sintéticas criadas por testes; preserva as 81 oficiais ('sistema')
      DELETE FROM public.specialties
      WHERE criado_por <> 'sistema' OR oficial = false;
    `);

    // Remove registros de storage_assets de teste/demo/backups antigos de teste e coleta keys S3
    const { rows: removedAssets } = await client.query<{ object_key: string }>(`
      DELETE FROM public.storage_assets
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all)
         OR verified_by_admin_id IN (SELECT id FROM tmp_test_users)
         OR (provider_profile_id = 'system-backup' AND object_key LIKE 'backups/confiare-backup-179484%')
      RETURNING object_key
    `);
    for (const a of removedAssets) {
      s3ObjectsToDelete.push(a.object_key);
    }

    await client.query(`
      DELETE FROM public.provider_services
      WHERE provider_profile_id IN (SELECT id FROM tmp_test_provider_ids_all);

      DELETE FROM public.provider_profiles
      WHERE id IN (SELECT id FROM tmp_test_providers);

      DELETE FROM public.customer_profiles
      WHERE user_id IN (SELECT id FROM tmp_test_users);

      DELETE FROM public.profiles
      WHERE user_id IN (SELECT id FROM tmp_test_users);

      DELETE FROM public.users
      WHERE id IN (SELECT id FROM tmp_test_users);

      -- Limpa usuários/sessões de teste em neon_auth mantendo jwks, project_config e eventuais contas reais
      DELETE FROM neon_auth.session
      WHERE "userId" IN (
        SELECT id FROM neon_auth."user"
        WHERE email LIKE '%@example.com' OR email LIKE '%@demo.confiare.invalid'
      );

      DELETE FROM neon_auth.account
      WHERE "userId" IN (
        SELECT id FROM neon_auth."user"
        WHERE email LIKE '%@example.com' OR email LIKE '%@demo.confiare.invalid'
      );

      DELETE FROM neon_auth."user"
      WHERE email LIKE '%@example.com' OR email LIKE '%@demo.confiare.invalid';
    `);

    // Validação crítica de integridade antes do COMMIT (sequencial no mesmo client)
    const catsRes = await client.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM public.categories WHERE ativo = true`);
    const specsRes = await client.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM public.specialties WHERE oficial = true AND criado_por = 'sistema' AND ativo = true`);
    const synthSpecsRes = await client.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM public.specialties WHERE oficial = false OR criado_por <> 'sistema'`);
    const plansRes = await client.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM public.plans WHERE ativo = true`);
    const settingsRes = await client.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM public.platform_settings`);
    const rolesRes = await client.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM public.roles`);
    const campRes = await client.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM public.promotional_campaigns`);
    const testPubUsersRes = await client.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM public.users WHERE email LIKE '%@example.com' OR email LIKE '%@demo.confiare.invalid'`);
    const testAuthUsersRes = await client.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM neon_auth."user" WHERE email LIKE '%@example.com' OR email LIKE '%@demo.confiare.invalid'`);
    const realAdminsRes = await client.query<{ c: number }>(`SELECT COUNT(*)::int AS c FROM public.users WHERE active_role = 'admin' OR 'admin' = ANY(roles)`);

    const referenceValidation = {
      categoriesCount: catsRes.rows[0].c,
      officialSpecialtiesCount: specsRes.rows[0].c,
      syntheticSpecialtiesRemaining: synthSpecsRes.rows[0].c,
      plansCount: plansRes.rows[0].c,
      platformSettingsCount: settingsRes.rows[0].c,
      rolesCount: rolesRes.rows[0].c,
      campaignsCount: campRes.rows[0].c,
      testUsersRemainingPublic: testPubUsersRes.rows[0].c,
      testUsersRemainingNeonAuth: testAuthUsersRes.rows[0].c,
      realAdminsPreserved: realAdminsRes.rows[0].c,
    };

    if (
      referenceValidation.categoriesCount !== 10 ||
      referenceValidation.officialSpecialtiesCount !== 81 ||
      referenceValidation.syntheticSpecialtiesRemaining !== 0 ||
      referenceValidation.plansCount !== 5 ||
      referenceValidation.platformSettingsCount < 8 ||
      referenceValidation.rolesCount !== 4 ||
      referenceValidation.testUsersRemainingPublic !== 0 ||
      referenceValidation.testUsersRemainingNeonAuth !== 0
    ) {
      throw new Error(
        `[ABORTADO] Validação pós-limpeza falhou (ROLLBACK executado): ${JSON.stringify(referenceValidation)}`
      );
    }

    if (options.dryRun) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }

    // Remove objetos S3 correspondentes aos assets de teste removidos (+ órfãos sem registro)
    const s3ObjectsRemoved: string[] = [];
    const s3ObjectsRemaining: string[] = [];

    const s3 = new S3Client({
      region: neonEnv.storage.region || 'auto',
      endpoint: neonEnv.storage.endpoint,
      credentials: {
        accessKeyId: neonEnv.storage.accessKeyId,
        secretAccessKey: neonEnv.storage.secretAccessKey,
      },
      forcePathStyle: true,
    });

    if (!options.dryRun) {
      const { rows: activeAssetRows } = await client.query<{ object_key: string }>(
        `SELECT object_key FROM public.storage_assets`
      );
      const validKeys = new Set(activeAssetRows.map((r) => r.object_key));

      const listBefore = await s3.send(
        new ListObjectsV2Command({ Bucket: 'assets', MaxKeys: 1000 })
      );
      for (const obj of listBefore.Contents || []) {
        if (!obj.Key) continue;
        if (s3ObjectsToDelete.includes(obj.Key) || !validKeys.has(obj.Key)) {
          await s3.send(new DeleteObjectCommand({ Bucket: 'assets', Key: obj.Key }));
          s3ObjectsRemoved.push(obj.Key);
        }
      }

      const listAfter = await s3.send(
        new ListObjectsV2Command({ Bucket: 'assets', MaxKeys: 1000 })
      );
      for (const obj of listAfter.Contents || []) {
        if (obj.Key) s3ObjectsRemaining.push(obj.Key);
      }
    }

    const afterCounts = await getAllTableCounts(client);
    const tableStats: TableCleanupStats[] = [];
    for (const [fullKey, before] of beforeCounts.entries()) {
      const [schema, table] = fullKey.split('.');
      const after = afterCounts.get(fullKey) ?? before;
      tableStats.push({
        schema,
        table,
        before,
        removed: Math.max(0, before - after),
        preserved: after,
      });
    }

    return {
      executedAt: new Date().toISOString(),
      environment: getNodeEnvironment(),
      backupId: backup.backupId,
      backupFilePath: backup.filePath,
      backupSha256: backup.sha256,
      s3ObjectsRemoved,
      s3ObjectsRemaining,
      tableStats,
      referenceValidation,
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => null);
    throw err;
  } finally {
    client.release();
    await directPool.end();
  }
}

export function formatCleanupReportMarkdown(report: ProductionCleanupReport): string {
  const lines: string[] = [
    '# Relatório Final de Limpeza do Banco de Produção — Confiare',
    '',
    `- **Data/Hora (UTC):** ${report.executedAt}`,
    `- **Ambiente:** \`${report.environment}\``,
    `- **Backup Pré-Limpeza ID:** \`${report.backupId}\``,
    `- **Arquivo de Backup Local:** \`${report.backupFilePath}\``,
    `- **Checksum SHA-256:** \`${report.backupSha256}\``,
    '',
    '## 1. Validação de Dados de Referência e Segurança',
    '',
    `| Indicador | Valor Pós-Limpeza | Status |`,
    `| :--- | :---: | :---: |`,
    `| Categorias oficiais (\`categories\`) | **${report.referenceValidation.categoriesCount}** | ${report.referenceValidation.categoriesCount === 10 ? 'OK' : 'ERRO'} |`,
    `| Especialidades oficiais (\`specialties\`) | **${report.referenceValidation.officialSpecialtiesCount}** | ${report.referenceValidation.officialSpecialtiesCount === 81 ? 'OK' : 'ERRO'} |`,
    `| Especialidades sintéticas de teste | **${report.referenceValidation.syntheticSpecialtiesRemaining}** | ${report.referenceValidation.syntheticSpecialtiesRemaining === 0 ? 'Limpo' : 'Pendente'} |`,
    `| Planos oficiais (\`plans\`) | **${report.referenceValidation.plansCount}** | ${report.referenceValidation.plansCount === 5 ? 'OK' : 'ERRO'} |`,
    `| Configurações (\`platform_settings\`) | **${report.referenceValidation.platformSettingsCount}** | OK |`,
    `| Papéis (\`roles\`) | **${report.referenceValidation.rolesCount}** | OK |`,
    `| Campanhas (\`promotional_campaigns\`) | **${report.referenceValidation.campaignsCount}** | OK |`,
    `| Usuários de teste restantes (\`public.users\`) | **${report.referenceValidation.testUsersRemainingPublic}** | Limpo |`,
    `| Usuários de teste restantes (\`neon_auth."user"\`) | **${report.referenceValidation.testUsersRemainingNeonAuth}** | Limpo |`,
    `| Contas administradoras reais preservadas | **${report.referenceValidation.realAdminsPreserved}** | Preservadas |`,
    '',
    '## 2. Registros Removidos e Preservados por Tabela',
    '',
    '| Schema | Tabela | Antes | Removidos | Preservados |',
    '| :--- | :--- | :---: | :---: | :---: |',
  ];

  for (const row of report.tableStats) {
    lines.push(
      `| \`${row.schema}\` | \`${row.table}\` | ${row.before} | ${row.removed} | ${row.preserved} |`
    );
  }

  lines.push(
    '',
    '## 3. Storage S3 (Bucket `assets`)',
    '',
    `- **Objetos de teste/demo/órfãos removidos (${report.s3ObjectsRemoved.length}):**`,
    ...(report.s3ObjectsRemoved.length > 0
      ? report.s3ObjectsRemoved.map((k) => `  - \`${k}\``)
      : ['  - Nenhum objeto removido.']),
    `- **Objetos restantes no bucket (${report.s3ObjectsRemaining.length}):**`,
    ...(report.s3ObjectsRemaining.length > 0
      ? report.s3ObjectsRemaining.map((k) => `  - \`${k}\``)
      : ['  - Bucket limpo (`0` objetos órfãos).']),
    ''
  );

  return lines.join('\n');
}

if (
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('cleanup-production.ts')
) {
  const confirmed = process.argv.includes('--confirm-production-cleanup');
  const dryRun = process.argv.includes('--dry-run');

  executeProductionCleanup({
    confirmProductionCleanup: confirmed,
    dryRun,
  })
    .then(async (report) => {
      const md = formatCleanupReportMarkdown(report);
      const reportPath = path.resolve(process.cwd(), 'cleanup-report.md');
      if (!dryRun) {
        writeFileSync(reportPath, md, 'utf-8');
      }
      console.log(
        `[cleanup-production] ${dryRun ? 'DRY-RUN' : 'LIMPEZA CONCLUÍDA'} — Relatório: ${reportPath}`
      );
      console.log(JSON.stringify(report.referenceValidation, null, 2));
      await pool.end();
    })
    .catch(async (err) => {
      console.error('[cleanup-production] Erro:', err?.message || err);
      await pool.end().catch(() => null);
      process.exit(1);
    });
}
