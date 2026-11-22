-- =============================================================================
-- Migration 008: Bônus de +10 dias grátis para o prestador indicado no cadastro
-- Target: Neon PostgreSQL 18
-- =============================================================================

ALTER TABLE provider_referrals
  ADD COLUMN IF NOT EXISTS referred_reward_days INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS referred_reward_status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (referred_reward_status IN ('pendente', 'disponivel', 'aplicado_na_assinatura', 'cancelado')),
  ADD COLUMN IF NOT EXISTS referred_applied_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS referred_applied_at TIMESTAMPTZ;
