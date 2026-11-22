-- =============================================================================
-- Migration 009: Security Hardening (Hashed Tokens) & Legal Compliance (LGPD/CDC)
-- Target: Neon Lakebase PostgreSQL 18
-- =============================================================================

-- 1. Hash-only storage & expiration for one-time email verification and password reset tokens
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_users_verification_token_hash
  ON users (verification_token_hash)
  WHERE verification_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_reset_password_token_hash
  ON users (reset_password_token_hash)
  WHERE reset_password_token_hash IS NOT NULL;

-- 2. Consent versioning, age verification (+18), marketing opt-in & AI training opt-out
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_verified_18_plus BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_version TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marketing_opt_in_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_training_opt_out BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cookie_preferences_json JSONB;

-- 3. Prevent duplicate review per completed service request by the same customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_service_request_customer
  ON reviews (service_request_id, customer_user_id)
  WHERE service_request_id IS NOT NULL;

-- 4. Explicit LGPD Consent Audit Trail (consent_logs)
CREATE TABLE IF NOT EXISTS consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  document_version TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_user ON consent_logs (user_id, created_at DESC);

-- 5. Real Landing Page Waitlist / Interest List (waitlist_leads)
CREATE TABLE IF NOT EXISTS waitlist_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  role_interest TEXT NOT NULL DEFAULT 'cliente',
  lgpd_consent BOOLEAN NOT NULL,
  lgpd_consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_leads_email ON waitlist_leads (LOWER(email));

-- 6. UGC / Copyright / Illicit Content Moderation Reports (content_reports)
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('provider_profile', 'review', 'other')),
  target_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('conteudo_ilicito', 'direitos_autorais', 'fraude_golpe', 'dados_pessoais', 'assedio')),
  description TEXT NOT NULL,
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_email TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'resolvida', 'arquivada')),
  resolution_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports (status, created_at DESC);

-- 7. One-Click Email Unsubscribes (List-Unsubscribe RFC 8058)
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. RLS and role grants
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'confiare_rls_user') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON consent_logs, waitlist_leads, content_reports, email_unsubscribes TO confiare_rls_user;
  END IF;
END
$$;

ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_consent_logs_policy ON consent_logs;
CREATE POLICY rls_consent_logs_policy ON consent_logs
  FOR ALL
  TO confiare_rls_user
  USING (
    current_setting('app.current_user_role', true) = 'admin'
    OR user_id::text = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'admin'
    OR user_id::text = current_setting('app.current_user_id', true)
  );
