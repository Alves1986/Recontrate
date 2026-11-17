-- =============================================================================
-- Migration 005: Official Taxonomy, Specialties, Suggestions & Moderated Custom Tags
-- Target: Neon Lakebase PostgreSQL 18
-- =============================================================================

-- 1. Evolve categories table with full taxonomy metadata
ALTER TABLE categories ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS categoria_pai_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS descricao TEXT NOT NULL DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icone TEXT NOT NULL DEFAULT 'wrench';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS ordem_exibicao INTEGER NOT NULL DEFAULT 10;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE categories SET nome = COALESCE(nome, name), descricao = CASE WHEN descricao = '' THEN short_desc ELSE descricao END;

-- 2. specialties (official Confiare catalog)
CREATE TABLE IF NOT EXISTS specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL DEFAULT '',
  sinonimos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  oficial BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por TEXT NOT NULL DEFAULT 'sistema',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_specialties_category ON specialties (category_id);
CREATE INDEX IF NOT EXISTS idx_specialties_slug ON specialties (slug);
CREATE INDEX IF NOT EXISTS idx_specialties_active ON specialties (ativo, oficial);

-- 3. specialty_suggestions (provider suggestions pending admin moderation)
CREATE TABLE IF NOT EXISTS specialty_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_profile_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  specialty_pai_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  nome_sugerido TEXT NOT NULL,
  nome_normalizado TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovada', 'reprovada', 'duplicada', 'convertida', 'correcao_solicitada')),
  motivo_rejeicao TEXT,
  revisado_por UUID REFERENCES users(id) ON DELETE SET NULL,
  revisado_em TIMESTAMPTZ,
  specialty_id_criada UUID REFERENCES specialties(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_specialty_suggestions_provider ON specialty_suggestions (provider_profile_id);
CREATE INDEX IF NOT EXISTS idx_specialty_suggestions_status ON specialty_suggestions (status);
CREATE INDEX IF NOT EXISTS idx_specialty_suggestions_norm ON specialty_suggestions (nome_normalizado);

-- 4. provider_specialties (structured 1..5 official specialties linked to provider)
CREATE TABLE IF NOT EXISTS provider_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_profile_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
  especialidade_principal BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_profile_id, specialty_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_specialties_provider ON provider_specialties (provider_profile_id);
CREATE INDEX IF NOT EXISTS idx_provider_specialties_spec ON provider_specialties (specialty_id);

-- 5. provider_custom_tags (free complementary tags with automated/human moderation, max 10 per provider)
CREATE TABLE IF NOT EXISTS provider_custom_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_profile_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aprovado', 'reprovado', 'removido')),
  motivo_moderacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_profile_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_provider_custom_tags_provider ON provider_custom_tags (provider_profile_id);
CREATE INDEX IF NOT EXISTS idx_provider_custom_tags_status ON provider_custom_tags (status);

-- Grant permissions to RLS role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO confiare_rls_user;
