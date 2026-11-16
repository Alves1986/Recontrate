-- =============================================================================
-- Migration 003: Confiare Pricing & Plans Display Metadata
-- Target: Neon Lakebase PostgreSQL 18
-- =============================================================================

ALTER TABLE plans ADD COLUMN IF NOT EXISTS selo TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS suporte_prioritario BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS limite_fotos_portfolio INTEGER;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS prioridade_label TEXT NOT NULL DEFAULT 'Baixa';
