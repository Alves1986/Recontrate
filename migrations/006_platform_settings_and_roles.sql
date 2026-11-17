-- =============================================================================
-- Migration 006: Platform Settings & System Roles (Reference Data)
-- Target: Neon Lakebase PostgreSQL 18
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug IN ('cliente', 'prestador', 'padrinho', 'admin')),
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  permissions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_public ON platform_settings (is_public);
CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles (slug);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO confiare_rls_user;
