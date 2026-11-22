import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { attachDatabasePool } from '@neon/functions';
import { parseEnv } from '@neon/env';
import config from '../../neon';
import * as schema from './schema';
import {
  INITIAL_TAXONOMY_CATEGORIES,
  slugifyTaxonomyTerm,
} from '../data/taxonomySeed';
import {
  getNodeEnvironment,
  isDemoModeEnabled,
  isProductionEnvironment,
} from '../config/environment';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: false });
}
if (existsSync('.env')) {
  dotenv.config({ path: '.env', override: false });
}

const isExplicitOfflineUnitTest =
  process.env.NODE_ENV === 'test' &&
  process.env.RECONTRATE_UNIT_TEST_NO_DB === 'true';

if (isExplicitOfflineUnitTest) {
  const UNIT_TEST_NO_DB_ENV: Record<string, string> = {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/recontrate_unit_test',
    DATABASE_URL_UNPOOLED:
      'postgresql://test:test@localhost:5432/recontrate_unit_test',
    NEON_AUTH_BASE_URL: 'https://unit-test.invalid/neondb/auth',
    NEON_AUTH_JWKS_URL:
      'https://unit-test.invalid/neondb/auth/.well-known/jwks.json',
    NEON_REALTIME_URL: 'wss://unit-test.invalid',
    NEON_REALTIME_SECRET: 'unit_test_realtime_secret_placeholder_32_chars',
    AWS_ACCESS_KEY_ID: 'unit-test-access-key',
    AWS_SECRET_ACCESS_KEY: 'unit-test-secret-key',
    AWS_ENDPOINT_URL_S3: 'https://unit-test-s3.invalid',
    AWS_REGION: 'us-east-2',
    NEON_AI_GATEWAY_TOKEN: 'unit-test-ai-gateway-token',
    NEON_AI_GATEWAY_BASE_URL: 'https://unit-test-ai.invalid',
  };
  for (const [key, fallbackValue] of Object.entries(UNIT_TEST_NO_DB_ENV)) {
    if (!process.env[key] || process.env[key]?.trim() === '') {
      process.env[key] = fallbackValue;
    }
  }
}

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
  throw new Error(
    `[Config] DATABASE_URL obrigatória ausente no ambiente "${getNodeEnvironment()}". Configure a string de conexão PostgreSQL/Neon nas variáveis de ambiente.`
  );
}
if (
  !process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL_UNPOOLED.trim() === ''
) {
  process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
}

export const neonEnv = parseEnv(config);

function normalizeConnectionString(connStr: string): string {
  return connStr.replace('sslmode=require', 'sslmode=verify-full');
}

// Pooled connection for application query traffic (Neon Functions & Express handlers)
export const pool = new Pool({
  connectionString: normalizeConnectionString(neonEnv.postgres.databaseUrl),
  max: 5,
});

attachDatabasePool(pool);

export const db = drizzle(pool, { schema });

export function getDatabaseNameFromUrl(connStr: string): string {
  try {
    const parsed = new URL(connStr);
    return parsed.pathname.replace(/^\//, '') || 'neondb';
  } catch {
    return 'neondb';
  }
}

export const INITIAL_PLANS_SEED = [
  {
    id: 'plan-gratuito',
    slug: 'gratuito',
    nome: 'Gratuito',
    descricao:
      'Perfil público básico, contato por WhatsApp, avaliações visíveis e até 5 oportunidades por mês com anúncios moderados no painel.',
    precoMensalCentavos: 0,
    precoAnualCentavos: 0,
    limiteOportunidadesMensal: 5,
    prioridadeMatching: 0,
    prioridadeLabel: 'Baixa',
    permiteDestaque: false,
    permiteRelatoriosAvancados: false,
    permitePortfolioIlimitado: false,
    limiteFotosPortfolio: 5,
    suportePrioritario: false,
    selo: null as string | null,
    exibeAnuncios: true,
    ativo: true,
    ordemExibicao: 1,
  },
  {
    id: 'plan-essencial',
    slug: 'essencial',
    nome: 'Essencial',
    descricao:
      'Perfil profissional completo, portfólio com até 10 fotos, prioridade leve no matching, relatório mensal básico e sem anúncios.',
    precoMensalCentavos: 2990,
    precoAnualCentavos: 29900,
    limiteOportunidadesMensal: 15,
    prioridadeMatching: 2,
    prioridadeLabel: 'Leve',
    permiteDestaque: false,
    permiteRelatoriosAvancados: false,
    permitePortfolioIlimitado: false,
    limiteFotosPortfolio: 10,
    suportePrioritario: false,
    selo: 'Essencial',
    exibeAnuncios: false,
    ativo: true,
    ordemExibicao: 2,
  },
  {
    id: 'plan-profissional',
    slug: 'profissional',
    nome: 'Profissional',
    descricao:
      'Prioridade média no matching, destaque em buscas locais, portfólio ilimitado, estatísticas de resposta e conversão e selo Profissional Recontrate.',
    precoMensalCentavos: 5990,
    precoAnualCentavos: 59900,
    limiteOportunidadesMensal: 40,
    prioridadeMatching: 5,
    prioridadeLabel: 'Média',
    permiteDestaque: true,
    permiteRelatoriosAvancados: false,
    permitePortfolioIlimitado: true,
    limiteFotosPortfolio: null as number | null,
    suportePrioritario: false,
    selo: 'Profissional Recontrate',
    exibeAnuncios: false,
    ativo: true,
    ordemExibicao: 3,
  },
  {
    id: 'plan-premium',
    slug: 'premium',
    nome: 'Premium',
    descricao:
      'Prioridade alta no matching, destaque regional e por categoria, relatórios avançados, portfólio ilimitado, suporte prioritário e selo Top Recontrate.',
    precoMensalCentavos: 9990,
    precoAnualCentavos: 99900,
    limiteOportunidadesMensal: 100,
    prioridadeMatching: 8,
    prioridadeLabel: 'Alta',
    permiteDestaque: true,
    permiteRelatoriosAvancados: true,
    permitePortfolioIlimitado: true,
    limiteFotosPortfolio: null as number | null,
    suportePrioritario: true,
    selo: 'Top Recontrate',
    exibeAnuncios: false,
    ativo: true,
    ordemExibicao: 4,
  },
];

let schemaInitialized = false;
let schemaInitPromise: Promise<void> | null = null;

export async function seedInitialTaxonomy(
  targetPool: Pool = pool
): Promise<{ categoriesCount: number; specialtiesCount: number }> {
  let categoriesCount = 0;
  let specialtiesCount = 0;

  for (const cat of INITIAL_TAXONOMY_CATEGORIES) {
    if (cat.legacySlug) {
      await targetPool.query(
        `UPDATE categories
         SET slug = $1,
             name = $2,
             nome = $2,
             short_desc = $3,
             descricao = $3,
             icone = $4,
             ordem_exibicao = $5,
             ativo = true,
             active = true,
             atualizado_em = NOW()
         WHERE slug = $6
           AND NOT EXISTS (SELECT 1 FROM categories WHERE slug = $1)`,
        [
          cat.slug,
          cat.nome,
          cat.descricao,
          cat.icone,
          cat.ordemExibicao,
          cat.legacySlug,
        ]
      );
    }

    const { rows: catRows } = await targetPool.query<{ id: string }>(
      `INSERT INTO categories (
        slug, name, nome, short_desc, descricao, icone,
        avg_response_min, verified_count, active, ativo, ordem_exibicao
      ) VALUES ($1,$2,$2,$3,$3,$4,$5,$6,true,true,$7)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        nome = EXCLUDED.nome,
        short_desc = EXCLUDED.short_desc,
        descricao = EXCLUDED.descricao,
        icone = EXCLUDED.icone,
        ordem_exibicao = EXCLUDED.ordem_exibicao,
        active = true,
        ativo = true,
        atualizado_em = NOW()
      RETURNING id`,
      [
        cat.slug,
        cat.nome,
        cat.descricao,
        cat.icone,
        cat.avgResponseMin,
        cat.verifiedCount,
        cat.ordemExibicao,
      ]
    );
    const categoryId = catRows[0].id;
    categoriesCount += 1;

    for (const spec of cat.specialties) {
      const specSlug = slugifyTaxonomyTerm(spec.nome);
      await targetPool.query(
        `INSERT INTO specialties (
          category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por
        ) VALUES ($1, $2, $3, $4, $5, true, true, 'sistema')
        ON CONFLICT (slug) DO UPDATE SET
          category_id = EXCLUDED.category_id,
          nome = EXCLUDED.nome,
          sinonimos = EXCLUDED.sinonimos,
          ativo = true,
          oficial = true,
          atualizado_em = NOW()`,
        [
          categoryId,
          spec.nome,
          specSlug,
          spec.descricao || '',
          spec.sinonimos || [],
        ]
      );
      specialtiesCount += 1;
    }
  }

  return { categoriesCount, specialtiesCount };
}

/**
 * Uses the direct (unpooled) connection string to apply schema migrations and seed data,
 * following Neon Postgres best practices (direct URL for DDL/migrations, pooled URL for queries).
 */
export async function ensureSchemaAndSeed(): Promise<void> {
  if (schemaInitialized) return;
  if (schemaInitPromise) return schemaInitPromise;

  schemaInitPromise = runEnsureSchemaAndSeed().catch((err) => {
    schemaInitPromise = null;
    throw err;
  });
  return schemaInitPromise;
}

async function runEnsureSchemaAndSeed(): Promise<void> {
  if (schemaInitialized) return;

  const directPool = new Pool({
    connectionString: normalizeConnectionString(
      neonEnv.postgres.databaseUrlUnpooled
    ),
    max: 2,
  });

  const client = await directPool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(84729103)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        nome TEXT NOT NULL,
        descricao TEXT NOT NULL,
        preco_mensal_centavos INTEGER NOT NULL,
        preco_anual_centavos INTEGER NOT NULL,
        limite_oportunidades_mensal INTEGER NOT NULL,
        prioridade_matching INTEGER NOT NULL,
        permite_destaque BOOLEAN NOT NULL DEFAULT FALSE,
        permite_relatorios_avancados BOOLEAN NOT NULL DEFAULT FALSE,
        permite_portfolio_ilimitado BOOLEAN NOT NULL DEFAULT FALSE,
        exibe_anuncios BOOLEAN NOT NULL DEFAULT FALSE,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        ordem_exibicao INTEGER NOT NULL DEFAULT 1,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS provider_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        city TEXT NOT NULL,
        plan_slug TEXT NOT NULL DEFAULT 'gratuito',
        rating_avg TEXT NOT NULL DEFAULT '5.00',
        reviews_count INTEGER NOT NULL DEFAULT 0,
        completed_jobs INTEGER NOT NULL DEFAULT 0,
        response_time_minutes INTEGER NOT NULL DEFAULT 10,
        response_rate_percent INTEGER NOT NULL DEFAULT 100,
        attendance_rate_percent INTEGER NOT NULL DEFAULT 100,
        is_verified BOOLEAN NOT NULL DEFAULT TRUE,
        available_today BOOLEAN NOT NULL DEFAULT TRUE,
        whatsapp TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        provider_profile_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        scheduled_plan_id TEXT,
        status TEXT NOT NULL,
        ciclo TEXT NOT NULL DEFAULT 'mensal',
        inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        fim TIMESTAMPTZ NOT NULL,
        proxima_cobranca TIMESTAMPTZ,
        tolerancia_ate TIMESTAMPTZ,
        gateway_subscription_id TEXT,
        gateway_customer_id TEXT,
        cancelada_em TIMESTAMPTZ,
        motivo_cancelamento TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS scheduled_plan_id TEXT;
      ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tolerancia_ate TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS subscription_events (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        evento TEXT NOT NULL,
        dados_anteriores_json JSONB,
        dados_novos_json JSONB,
        gateway_event_id TEXT,
        processado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        valor_centavos INTEGER NOT NULL,
        status TEXT NOT NULL,
        metodo TEXT NOT NULL,
        vencimento TIMESTAMPTZ NOT NULL,
        pago_em TIMESTAMPTZ,
        gateway_invoice_id TEXT,
        url_checkout TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS opportunity_usage (
        id TEXT PRIMARY KEY,
        provider_profile_id TEXT NOT NULL,
        subscription_id TEXT NOT NULL,
        periodo_inicio TIMESTAMPTZ NOT NULL,
        periodo_fim TIMESTAMPTZ NOT NULL,
        oportunidades_utilizadas INTEGER NOT NULL DEFAULT 0,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS processed_webhook_events (
        id TEXT PRIMARY KEY,
        gateway TEXT NOT NULL DEFAULT 'asaas',
        event_id TEXT NOT NULL UNIQUE,
        tipo_evento TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        erro TEXT,
        processado_em TIMESTAMPTZ,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ad_slots (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL,
        categoria TEXT NOT NULL,
        anunciante TEXT NOT NULL,
        imagem_url TEXT NOT NULL,
        link_destino TEXT NOT NULL,
        texto TEXT NOT NULL,
        data_inicio TIMESTAMPTZ NOT NULL,
        data_fim TIMESTAMPTZ NOT NULL,
        prioridade INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'ativo',
        impressoes INTEGER NOT NULL DEFAULT 0,
        cliques INTEGER NOT NULL DEFAULT 0,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ad_impressions (
        id TEXT PRIMARY KEY,
        ad_slot_id TEXT NOT NULL,
        provider_profile_id TEXT NOT NULL,
        exibido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        origem TEXT NOT NULL DEFAULT 'painel_prestador'
      );

      CREATE TABLE IF NOT EXISTS ad_clicks (
        id TEXT PRIMARY KEY,
        ad_slot_id TEXT NOT NULL,
        provider_profile_id TEXT NOT NULL,
        clicado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS realtime_notifications (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        client_name TEXT NOT NULL,
        neighborhood TEXT NOT NULL,
        urgency_or_scope TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS storage_assets (
        id TEXT PRIMARY KEY,
        provider_profile_id TEXT NOT NULL,
        bucket TEXT NOT NULL DEFAULT 'assets',
        object_key TEXT NOT NULL UNIQUE,
        content_type TEXT NOT NULL,
        label TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const { rows: migCheck } = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'storage_assets'
         AND column_name = 'visibility'`
    );

    if (migCheck.length === 0) {
      const phase1MigrationPath = path.resolve(
        process.cwd(),
        'migrations/001_phase1_production_schema_and_rls.sql'
      );
      if (existsSync(phase1MigrationPath)) {
        const migrationSql = readFileSync(phase1MigrationPath, 'utf-8');
        await client.query(migrationSql);
      }

      const phase2MigrationPath = path.resolve(
        process.cwd(),
        'migrations/002_phase2_marketplace_rls_and_documents.sql'
      );
      if (existsSync(phase2MigrationPath)) {
        const migration2Sql = readFileSync(phase2MigrationPath, 'utf-8');
        await client.query(migration2Sql);
      }
    }

    const { rows: mig3Check } = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'plans'
         AND column_name = 'selo'`
    );
    if (mig3Check.length === 0) {
      const phase3PlansMigrationPath = path.resolve(
        process.cwd(),
        'migrations/003_plans_display_metadata.sql'
      );
      if (existsSync(phase3PlansMigrationPath)) {
        const migration3Sql = readFileSync(phase3PlansMigrationPath, 'utf-8');
        await client.query(migration3Sql);
      }
    }

    const { rows: mig4Check } = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = 'promotional_campaigns'`
    );
    if (mig4Check.length === 0) {
      const phase4CampaignMigrationPath = path.resolve(
        process.cwd(),
        'migrations/004_launch_offer_campaign.sql'
      );
      if (existsSync(phase4CampaignMigrationPath)) {
        const migration4Sql = readFileSync(phase4CampaignMigrationPath, 'utf-8');
        await client.query(migration4Sql);
      }
    }

    const { rows: mig5Check } = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = 'specialty_suggestions'`
    );
    if (mig5Check.length === 0) {
      const phase5TaxonomyMigrationPath = path.resolve(
        process.cwd(),
        'migrations/005_specialties_taxonomy_and_moderation.sql'
      );
      if (existsSync(phase5TaxonomyMigrationPath)) {
        const migration5Sql = readFileSync(
          phase5TaxonomyMigrationPath,
          'utf-8'
        );
        await client.query(migration5Sql);
      }
    }

    const { rows: mig6Check } = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = 'platform_settings'`
    );
    if (mig6Check.length === 0) {
      const migration6Path = path.resolve(
        process.cwd(),
        'migrations/006_platform_settings_and_roles.sql'
      );
      if (existsSync(migration6Path)) {
        const migration6Sql = readFileSync(migration6Path, 'utf-8');
        await client.query(migration6Sql);
      }

      // Seed de Referência: platform_settings e roles (idempotente em todos os ambientes)
      const refSqlFiles = [
        'database/seeds/reference/04-platform-settings.sql',
        'database/seeds/reference/05-roles.sql',
      ];
      for (const relPath of refSqlFiles) {
        const fullPath = path.resolve(process.cwd(), relPath);
        if (existsSync(fullPath)) {
          await client.query(readFileSync(fullPath, 'utf-8'));
        }
      }
    }

    const { rows: mig7Check } = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = 'referral_codes'`
    );
    if (mig7Check.length === 0) {
      const migration7Path = path.resolve(
        process.cwd(),
        'migrations/007_provider_referrals.sql'
      );
      if (existsSync(migration7Path)) {
        await client.query(readFileSync(migration7Path, 'utf-8'));
      }
    }

    const { rows: mig8Check } = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'provider_referrals'
         AND column_name = 'referred_reward_days'`
    );
    if (mig8Check.length === 0) {
      const migration8Path = path.resolve(
        process.cwd(),
        'migrations/008_referred_provider_bonus_days.sql'
      );
      if (existsSync(migration8Path)) {
        await client.query(readFileSync(migration8Path, 'utf-8'));
      }
    }

    const [{ rows: mig9ColCheck }, { rows: mig9TableCheck }] = await Promise.all([
      client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
           AND column_name = 'verification_token_hash'`
      ),
      client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'waitlist_leads'`
      ),
    ]);
    if (mig9ColCheck.length === 0 || mig9TableCheck.length === 0) {
      const migration9Path = path.resolve(
        process.cwd(),
        'migrations/009_security_and_compliance.sql'
      );
      if (existsSync(migration9Path)) {
        await client.query(readFileSync(migration9Path, 'utf-8'));
      }
    }

    const expectedCategorySlugs = INITIAL_TAXONOMY_CATEGORIES.map((c) => c.slug);
    const expectedSpecialtySlugs = INITIAL_TAXONOMY_CATEGORIES.flatMap((c) =>
      c.specialties.map((s) => slugifyTaxonomyTerm(s.nome))
    );
    const [{ rows: catMatchRows }, { rows: specMatchRows }] = await Promise.all([
      client.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM categories WHERE slug = ANY($1::text[]) AND ativo = true AND active = true`,
        [expectedCategorySlugs]
      ),
      client.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM specialties WHERE slug = ANY($1::text[]) AND ativo = true AND oficial = true`,
        [expectedSpecialtySlugs]
      ),
    ]);
    if (
      Number(catMatchRows[0]?.total || 0) < expectedCategorySlugs.length ||
      Number(specMatchRows[0]?.total || 0) < expectedSpecialtySlugs.length
    ) {
      await seedInitialTaxonomy(directPool);
    }

    for (const p of INITIAL_PLANS_SEED) {
      await client.query(
        `INSERT INTO plans (
          id, slug, nome, descricao, preco_mensal_centavos, preco_anual_centavos,
          limite_oportunidades_mensal, prioridade_matching, prioridade_label, permite_destaque,
          permite_relatorios_avancados, permite_portfolio_ilimitado, limite_fotos_portfolio,
          suporte_prioritario, selo, exibe_anuncios, ativo, ordem_exibicao
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT (slug) DO UPDATE SET
          nome = EXCLUDED.nome,
          descricao = EXCLUDED.descricao,
          preco_mensal_centavos = EXCLUDED.preco_mensal_centavos,
          preco_anual_centavos = EXCLUDED.preco_anual_centavos,
          limite_oportunidades_mensal = EXCLUDED.limite_oportunidades_mensal,
          prioridade_matching = EXCLUDED.prioridade_matching,
          prioridade_label = EXCLUDED.prioridade_label,
          permite_destaque = EXCLUDED.permite_destaque,
          permite_relatorios_avancados = EXCLUDED.permite_relatorios_avancados,
          permite_portfolio_ilimitado = EXCLUDED.permite_portfolio_ilimitado,
          limite_fotos_portfolio = EXCLUDED.limite_fotos_portfolio,
          suporte_prioritario = EXCLUDED.suporte_prioritario,
          selo = EXCLUDED.selo,
          exibe_anuncios = EXCLUDED.exibe_anuncios,
          ordem_exibicao = EXCLUDED.ordem_exibicao,
          atualizado_em = NOW()`,
        [
          p.id,
          p.slug,
          p.nome,
          p.descricao,
          p.precoMensalCentavos,
          p.precoAnualCentavos,
          p.limiteOportunidadesMensal,
          p.prioridadeMatching,
          p.prioridadeLabel,
          p.permiteDestaque,
          p.permiteRelatoriosAvancados,
          p.permitePortfolioIlimitado,
          p.limiteFotosPortfolio,
          p.suportePrioritario,
          p.selo,
          p.exibeAnuncios,
          p.ativo,
          p.ordemExibicao,
        ]
      );
    }

    await client.query(
      `DELETE FROM plans
       WHERE slug = 'padrinho'
         AND NOT EXISTS (
           SELECT 1
           FROM subscriptions s
           JOIN plans p ON p.id = s.plan_id
           WHERE p.slug = 'padrinho'
         )`
    );
    await client.query(
      `UPDATE plans
       SET ativo = false,
           atualizado_em = NOW()
       WHERE slug = 'padrinho' AND ativo = true`
    );

    // Seed da Campanha de Lançamento (90 dias grátis nos 3 primeiros meses para novos prestadores)
    await client.query(
      `INSERT INTO promotional_campaigns (
        id, nome, slug, descricao, tipo, desconto_percentual, duracao_ciclos,
        planos_elegiveis_json, preco_cheio_json, preco_promocional_json,
        data_inicio, data_fim, limite_total_resgates, limite_por_prestador, status
      ) VALUES (
        'camp-lancamento-50-off',
        'Promoção de lançamento: 90 dias grátis',
        'lancamento-50-off-3-meses',
        'Válida para a primeira assinatura mensal de novos prestadores nos planos Essencial, Profissional e Premium. Os 90 primeiros dias (3 primeiros ciclos mensais) são 100% gratuitos (R$ 0,00); a partir do 4º mês aplica-se o preço padrão do plano, com cancelamento livre sem multa.',
        'introducao_novos_prestadores',
        100,
        3,
        '["essencial","profissional","premium"]'::jsonb,
        '{"essencial":2990,"profissional":5990,"premium":9990}'::jsonb,
        '{"essencial":0,"profissional":0,"premium":0}'::jsonb,
        NOW() - INTERVAL '1 day',
        NOW() + INTERVAL '180 days',
        10000,
        1,
        'ativo'
      )
      ON CONFLICT (slug) DO UPDATE SET
        nome = EXCLUDED.nome,
        descricao = EXCLUDED.descricao,
        desconto_percentual = EXCLUDED.desconto_percentual,
        duracao_ciclos = EXCLUDED.duracao_ciclos,
        planos_elegiveis_json = EXCLUDED.planos_elegiveis_json,
        preco_cheio_json = EXCLUDED.preco_cheio_json,
        preco_promocional_json = EXCLUDED.preco_promocional_json,
        atualizado_em = NOW()`
    );

    if (!isProductionEnvironment() && isDemoModeEnabled()) {
      const devProviders = [
        [
          'prov-joao',
          'joao-batista-silva',
          'João Batista Silva',
          'Eletricista',
          'São Paulo, SP',
          'premium',
          '4.96',
          94,
          128,
          9,
          98,
          100,
          true,
          true,
          '(11) 99812-4401',
          ['Pinheiros', 'Vila Madalena', 'Itaim Bibi', 'Jardins'],
          true,
        ],
        [
          'prov-carlos',
          'carlos-eduardo-mendes',
          'Carlos Eduardo Mendes',
          'Eletricista',
          'São Paulo, SP',
          'profissional',
          '4.89',
          52,
          76,
          12,
          96,
          99,
          true,
          true,
          '(11) 99451-8830',
          ['Pinheiros', 'Perdizes', 'Butantã'],
          false,
        ],
        [
          'prov-ana',
          'ana-paula-ribeiro',
          'Ana Paula Ribeiro',
          'Diarista',
          'São Paulo, SP',
          'premium',
          '4.98',
          112,
          164,
          11,
          99,
          100,
          true,
          true,
          '(11) 99104-2290',
          ['Pinheiros', 'Itaim Bibi', 'Moema'],
          false,
        ],
      ];

      for (const dp of devProviders) {
        await client.query(
          `INSERT INTO provider_profiles (
            id, slug, name, category, city, plan_slug, rating_avg, reviews_count, completed_jobs,
            response_time_minutes, response_rate_percent, attendance_rate_percent, is_verified, available_today,
            whatsapp, neighborhoods, is_mentor, verification_status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'aprovado')
          ON CONFLICT (id) DO UPDATE SET
            slug = EXCLUDED.slug,
            neighborhoods = EXCLUDED.neighborhoods,
            is_mentor = EXCLUDED.is_mentor`,
          dp
        );
      }

      await client.query(
        `INSERT INTO realtime_notifications (
          id, provider_id, type, title, message, client_name, neighborhood, urgency_or_scope, read
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO NOTHING`,
        [
          'notif-seed-1',
          'prov-joao',
          'nova_oportunidade',
          'Nova oportunidade compatível em Pinheiros',
          'Disjuntor do chuveiro desarmando e revisão de tomada 20A',
          'Mariana Souza',
          'Pinheiros (1.1 km)',
          'Urgência: Hoje · Tarde (13h–18h)',
          false,
        ]
      );
    }

    schemaInitialized = true;
  } finally {
    await client.query('SELECT pg_advisory_unlock(84729103)').catch(() => null);
    client.release();
    await directPool.end();
  }
}
