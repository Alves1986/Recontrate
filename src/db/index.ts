import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { attachDatabasePool } from '@neon/functions';
import { parseEnv } from '@neon/env';
import config from '../../neon';
import * as schema from './schema';

if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
if (existsSync('.env')) {
  dotenv.config({ path: '.env' });
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
      'Perfil público básico, contato por WhatsApp e até 5 oportunidades por mês com exibição moderada de anúncios no painel.',
    precoMensalCentavos: 0,
    precoAnualCentavos: 0,
    limiteOportunidadesMensal: 5,
    prioridadeMatching: 0,
    permiteDestaque: false,
    permiteRelatoriosAvancados: false,
    permitePortfolioIlimitado: false,
    exibeAnuncios: true,
    ativo: true,
    ordemExibicao: 1,
  },
  {
    id: 'plan-essencial',
    slug: 'essencial',
    nome: 'Essencial',
    descricao:
      'Perfil profissional completo, portfólio até 10 fotos, prioridade leve no matching, relatório mensal básico e sem anúncios.',
    precoMensalCentavos: 2990,
    precoAnualCentavos: 29900,
    limiteOportunidadesMensal: 15,
    prioridadeMatching: 2,
    permiteDestaque: false,
    permiteRelatoriosAvancados: false,
    permitePortfolioIlimitado: false,
    exibeAnuncios: false,
    ativo: true,
    ordemExibicao: 2,
  },
  {
    id: 'plan-profissional',
    slug: 'profissional',
    nome: 'Profissional',
    descricao:
      'Prioridade média no matching, destaque em buscas locais, portfólio ilimitado, estatísticas de conversão e selo Profissional Confiare.',
    precoMensalCentavos: 5990,
    precoAnualCentavos: 59900,
    limiteOportunidadesMensal: 40,
    prioridadeMatching: 5,
    permiteDestaque: true,
    permiteRelatoriosAvancados: false,
    permitePortfolioIlimitado: true,
    exibeAnuncios: false,
    ativo: true,
    ordemExibicao: 3,
  },
  {
    id: 'plan-premium',
    slug: 'premium',
    nome: 'Premium',
    descricao:
      'Prioridade alta justa no matching, destaque regional e por categoria, relatórios avançados, suporte prioritário e selo Top Confiare.',
    precoMensalCentavos: 9990,
    precoAnualCentavos: 99900,
    limiteOportunidadesMensal: 100,
    prioridadeMatching: 8,
    permiteDestaque: true,
    permiteRelatoriosAvancados: true,
    permitePortfolioIlimitado: true,
    exibeAnuncios: false,
    ativo: true,
    ordemExibicao: 4,
  },
  {
    id: 'plan-padrinho',
    slug: 'padrinho',
    nome: 'Padrinho',
    descricao:
      'Mesmos recursos do Premium, selo Padrinho Verificado e ferramentas de indicação e acompanhamento de apadrinhados.',
    precoMensalCentavos: 9990,
    precoAnualCentavos: 99900,
    limiteOportunidadesMensal: 100,
    prioridadeMatching: 9,
    permiteDestaque: true,
    permiteRelatoriosAvancados: true,
    permitePortfolioIlimitado: true,
    exibeAnuncios: false,
    ativo: true,
    ordemExibicao: 5,
  },
];

let schemaInitialized = false;

/**
 * Uses the direct (unpooled) connection string to apply schema migrations and seed data,
 * following Neon Postgres best practices (direct URL for DDL/migrations, pooled URL for queries).
 */
export async function ensureSchemaAndSeed(): Promise<void> {
  if (schemaInitialized) return;

  const directPool = new Pool({
    connectionString: normalizeConnectionString(
      neonEnv.postgres.databaseUrlUnpooled
    ),
    max: 2,
  });

  try {
    await directPool.query(`
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

    const phase1MigrationPath = path.resolve(
      process.cwd(),
      'migrations/001_phase1_production_schema_and_rls.sql'
    );
    if (existsSync(phase1MigrationPath)) {
      const migrationSql = readFileSync(phase1MigrationPath, 'utf-8');
      await directPool.query(migrationSql);
    }

    const phase2MigrationPath = path.resolve(
      process.cwd(),
      'migrations/002_phase2_marketplace_rls_and_documents.sql'
    );
    if (existsSync(phase2MigrationPath)) {
      const migration2Sql = readFileSync(phase2MigrationPath, 'utf-8');
      await directPool.query(migration2Sql);
    }

    const structuralCategories = [
      {
        slug: 'eletricista',
        name: 'Eletricista',
        shortDesc:
          'Quadros elétricos, disjuntores, tomadas 20A, chuveiros e iluminação.',
        avgResponseMin: 11,
        verifiedCount: 42,
      },
      {
        slug: 'encanador',
        name: 'Encanador',
        shortDesc:
          'Caça-vazamentos, registros, válvulas Hydra, sifões e pressurizadores.',
        avgResponseMin: 14,
        verifiedCount: 35,
      },
      {
        slug: 'diarista',
        name: 'Diarista',
        shortDesc:
          'Limpeza residencial detalhada, pós-mudança e organização de ambientes.',
        avgResponseMin: 16,
        verifiedCount: 58,
      },
      {
        slug: 'pintor',
        name: 'Pintor',
        shortDesc:
          'Pintura acrílica fina, massa corrida, tratamento de trincas e umidade.',
        avgResponseMin: 19,
        verifiedCount: 29,
      },
      {
        slug: 'tecnico-de-ar-condicionado',
        name: 'Técnico de ar-condicionado',
        shortDesc:
          'Instalação Split Inverter, higienização profunda, carga de gás e dreno.',
        avgResponseMin: 13,
        verifiedCount: 24,
      },
    ];

    for (const c of structuralCategories) {
      await directPool.query(
        `INSERT INTO categories (slug, name, short_desc, avg_response_min, verified_count, active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           short_desc = EXCLUDED.short_desc,
           avg_response_min = EXCLUDED.avg_response_min`,
        [c.slug, c.name, c.shortDesc, c.avgResponseMin, c.verifiedCount]
      );
    }

    for (const p of INITIAL_PLANS_SEED) {
      await directPool.query(
        `INSERT INTO plans (
          id, slug, nome, descricao, preco_mensal_centavos, preco_anual_centavos,
          limite_oportunidades_mensal, prioridade_matching, permite_destaque,
          permite_relatorios_avancados, permite_portfolio_ilimitado, exibe_anuncios,
          ativo, ordem_exibicao
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (slug) DO UPDATE SET
          nome = EXCLUDED.nome,
          descricao = EXCLUDED.descricao,
          preco_mensal_centavos = EXCLUDED.preco_mensal_centavos,
          preco_anual_centavos = EXCLUDED.preco_anual_centavos,
          limite_oportunidades_mensal = EXCLUDED.limite_oportunidades_mensal,
          prioridade_matching = EXCLUDED.prioridade_matching,
          permite_destaque = EXCLUDED.permite_destaque,
          permite_relatorios_avancados = EXCLUDED.permite_relatorios_avancados,
          permite_portfolio_ilimitado = EXCLUDED.permite_portfolio_ilimitado,
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
          p.permiteDestaque,
          p.permiteRelatoriosAvancados,
          p.permitePortfolioIlimitado,
          p.exibeAnuncios,
          p.ativo,
          p.ordemExibicao,
        ]
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      const devProviders = [
        [
          'prov-joao',
          'joao-batista-silva',
          'João Batista Silva',
          'Eletricista',
          'São Paulo, SP',
          'padrinho',
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
        await directPool.query(
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

      await directPool.query(
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
    await directPool.end();
  }
}
