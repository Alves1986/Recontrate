-- =============================================================================
-- Migration 007: Programa de Indicação de Profissionais (+15 dias grátis)
-- Target: Neon PostgreSQL 18
-- =============================================================================

CREATE TABLE IF NOT EXISTS referral_codes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  provider_profile_id TEXT,
  code TEXT NOT NULL UNIQUE,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes (code);

CREATE TABLE IF NOT EXISTS provider_referrals (
  id TEXT PRIMARY KEY,
  referral_code_id TEXT NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referrer_provider_profile_id TEXT,
  referred_user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  referred_provider_profile_id TEXT,
  referred_name TEXT NOT NULL DEFAULT '',
  referred_email TEXT NOT NULL DEFAULT '',
  referred_phone TEXT NOT NULL DEFAULT '',
  referred_category TEXT,
  status TEXT NOT NULL DEFAULT 'convite_enviado' CHECK (status IN ('convite_enviado', 'cadastrado', 'validado', 'bloqueado')),
  reward_days INTEGER NOT NULL DEFAULT 15,
  reward_status TEXT NOT NULL DEFAULT 'pendente' CHECK (reward_status IN ('pendente', 'disponivel', 'aplicado_na_assinatura', 'cancelado')),
  applied_subscription_id TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_referrals_referrer ON provider_referrals (referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_provider_referrals_email ON provider_referrals (referred_email);
CREATE INDEX IF NOT EXISTS idx_provider_referrals_status ON provider_referrals (status);
