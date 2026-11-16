-- =============================================================================
-- Migration 004: Confiare Launch Offer Campaign (50% off for 3 monthly cycles)
-- Target: Neon Lakebase PostgreSQL 18
-- =============================================================================

ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS cpf_cnpj_normalizado TEXT;

CREATE TABLE IF NOT EXISTS promotional_campaigns (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'introducao_novos_prestadores',
  desconto_percentual INTEGER NOT NULL DEFAULT 50,
  duracao_ciclos INTEGER NOT NULL DEFAULT 3,
  planos_elegiveis_json JSONB NOT NULL,
  preco_cheio_json JSONB NOT NULL,
  preco_promocional_json JSONB NOT NULL,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  limite_total_resgates INTEGER NOT NULL DEFAULT 10000,
  limite_por_prestador INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('rascunho', 'ativo', 'pausado', 'encerrado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotional_redemptions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES promotional_campaigns(id) ON DELETE CASCADE,
  provider_profile_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subscription_id TEXT NOT NULL,
  plano_id TEXT NOT NULL,
  ciclo_promocional_atual INTEGER NOT NULL DEFAULT 1,
  data_inicio_promocao TIMESTAMPTZ NOT NULL,
  data_fim_promocao TIMESTAMPTZ NOT NULL,
  data_retorno_preco_cheio TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado', 'expirado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotional_redemptions_provider ON promotional_redemptions (provider_profile_id);
CREATE INDEX IF NOT EXISTS idx_promotional_redemptions_sub ON promotional_redemptions (subscription_id);

CREATE TABLE IF NOT EXISTS promotion_eligibility_checks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider_profile_id TEXT,
  campaign_id TEXT NOT NULL REFERENCES promotional_campaigns(id) ON DELETE CASCADE,
  email_normalizado TEXT NOT NULL DEFAULT '',
  telefone_normalizado TEXT NOT NULL DEFAULT '',
  documento_normalizado TEXT NOT NULL DEFAULT '',
  fingerprint_dispositivo TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  resultado TEXT NOT NULL CHECK (resultado IN ('elegivel', 'inelegivel', 'bloqueado')),
  motivo TEXT NOT NULL DEFAULT '',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_checks_email ON promotion_eligibility_checks (email_normalizado);
CREATE INDEX IF NOT EXISTS idx_promo_checks_phone ON promotion_eligibility_checks (telefone_normalizado);
CREATE INDEX IF NOT EXISTS idx_promo_checks_doc ON promotion_eligibility_checks (documento_normalizado);
CREATE INDEX IF NOT EXISTS idx_promo_checks_fp ON promotion_eligibility_checks (fingerprint_dispositivo);
