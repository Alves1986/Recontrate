-- =============================================================================
-- Migration 001: Confiare Phase 1 — Production Schema, Indexes, Constraints & RLS
-- Target: Neon Lakebase PostgreSQL 18
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. users (Never stores passwords in the application table; authentication credentials live in Neon Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neon_auth_user_id TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  roles TEXT[] NOT NULL DEFAULT ARRAY['cliente']::TEXT[],
  active_role TEXT NOT NULL DEFAULT 'cliente' CHECK (active_role IN ('cliente', 'prestador', 'padrinho', 'admin')),
  status TEXT NOT NULL DEFAULT 'pendente_confirmacao' CHECK (status IN ('pendente_confirmacao', 'ativo', 'suspenso')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token TEXT,
  reset_password_token TEXT,
  reset_password_expires_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE users DROP COLUMN IF EXISTS password_hash;

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);

-- 2. profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'São Paulo, SP',
  neighborhood TEXT NOT NULL DEFAULT '',
  lgpd_consent BOOLEAN NOT NULL DEFAULT FALSE,
  lgpd_consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. customer_profiles
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  favorite_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  preferred_contact TEXT NOT NULL DEFAULT 'WhatsApp' CHECK (preferred_contact IN ('WhatsApp', 'Telefone', 'Ambos')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  short_desc TEXT NOT NULL,
  common_problems TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  avg_response_min INTEGER NOT NULL DEFAULT 15,
  verified_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);

-- 5. provider_profiles (preserve existing rows and add production columns)
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS professional_name TEXT;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS neighborhoods TEXT[] NOT NULL DEFAULT ARRAY['Pinheiros']::TEXT[];
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS specialties TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS radius_km INTEGER NOT NULL DEFAULT 10;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS years_experience INTEGER NOT NULL DEFAULT 5;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS profile_completeness_percent INTEGER NOT NULL DEFAULT 90;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'aprovado' CHECK (verification_status IN ('pendente', 'aprovado', 'rejeitado'));
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS is_top_region BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS is_mentor BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS mentor_name TEXT;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_provider_profiles_category ON provider_profiles (category);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_city ON provider_profiles (city);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_slug ON provider_profiles (slug);

-- 6. provider_services
CREATE TABLE IF NOT EXISTS provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_profile_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  neighborhood TEXT NOT NULL DEFAULT '',
  service_date TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  before_after_label TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  visual_type TEXT NOT NULL DEFAULT 'electrical',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. service_requests
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,
  problem_title TEXT NOT NULL,
  description TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'São Paulo, SP',
  urgency TEXT NOT NULL CHECK (urgency IN ('Hoje', 'Amanhã', 'Esta semana', 'Flexível')),
  preferred_time TEXT NOT NULL,
  estimated_budget TEXT,
  preferred_previous_provider_id TEXT,
  lgpd_contact_consent BOOLEAN NOT NULL DEFAULT TRUE,
  photos_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'em_matching' CHECK (status IN ('em_matching', 'oportunidades_enviadas', 'prestador_interessado', 'contato_liberado', 'concluido', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_service_requests_customer ON service_requests (customer_user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_category ON service_requests (category_name);
CREATE INDEX IF NOT EXISTS idx_service_requests_neighborhood ON service_requests (neighborhood);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests (status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests (created_at DESC);

-- 8. opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
  provider_profile_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  distance_km NUMERIC(5,2) NOT NULL DEFAULT 1.5,
  urgency TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  client_name_masked TEXT NOT NULL,
  client_name_full TEXT NOT NULL,
  client_whatsapp TEXT NOT NULL,
  lgpd_contact_consent BOOLEAN NOT NULL DEFAULT TRUE,
  origin TEXT NOT NULL DEFAULT 'Matching Local',
  referred_by_provider_name TEXT,
  photos_attached INTEGER NOT NULL DEFAULT 0,
  expires_in_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceita', 'recusada', 'substituto_indicado', 'expirada')),
  decline_reason TEXT,
  contact_released BOOLEAN NOT NULL DEFAULT FALSE,
  contact_released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_provider ON opportunities (provider_profile_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities (status);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities (created_at DESC);

-- 9. service_assignments
CREATE TABLE IF NOT EXISTS service_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  provider_profile_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'em_orcamento' CHECK (status IN ('em_orcamento', 'agendado', 'concluido', 'cancelado')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  provider_profile_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name_display TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  service_title TEXT NOT NULL,
  rating NUMERIC(3,2) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  qualidade INTEGER NOT NULL CHECK (qualidade >= 1 AND qualidade <= 5),
  pontualidade INTEGER NOT NULL CHECK (pontualidade >= 1 AND pontualidade <= 5),
  comunicacao INTEGER NOT NULL CHECK (comunicacao >= 1 AND comunicacao <= 5),
  organizacao INTEGER NOT NULL CHECK (organizacao >= 1 AND organizacao <= 5),
  would_recommend BOOLEAN NOT NULL DEFAULT TRUE,
  comment TEXT NOT NULL,
  provider_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews (provider_profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews (customer_user_id);

-- 11. professional_trust_list
CREATE TABLE IF NOT EXISTS professional_trust_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_profile_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  last_service_date TEXT NOT NULL,
  last_service_summary TEXT NOT NULL,
  times_hired INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_user_id, provider_profile_id)
);

-- 12. repeat_requests
CREATE TABLE IF NOT EXISTS repeat_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_profile_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  desired_date TEXT NOT NULL,
  urgency TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  lgpd_share_consent BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'solicitado' CHECK (status IN ('solicitado', 'aceito', 'indisponivel_com_substituto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. substitute_referrals
CREATE TABLE IF NOT EXISTS substitute_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repeat_request_id UUID REFERENCES repeat_requests(id) ON DELETE SET NULL,
  original_provider_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  substitute_provider_ids TEXT[] NOT NULL,
  reason_category TEXT NOT NULL,
  custom_note TEXT NOT NULL,
  service_context TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  urgency TEXT NOT NULL,
  client_consent_shared BOOLEAN NOT NULL DEFAULT TRUE,
  client_accepted_provider_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. mentorships
CREATE TABLE IF NOT EXISTS mentorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_provider_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  mentee_provider_id TEXT NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  mentor_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mentor_provider_id, mentee_provider_id)
);

-- 15. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_profile_id TEXT REFERENCES provider_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata_json JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'confiare_rls_user') THEN
    CREATE ROLE confiare_rls_user NOLOGIN;
  END IF;
END
$$;

GRANT confiare_rls_user TO CURRENT_USER;
GRANT USAGE ON SCHEMA public TO confiare_rls_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO confiare_rls_user;

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities FORCE ROW LEVEL SECURITY;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews FORCE ROW LEVEL SECURITY;

ALTER TABLE repeat_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE repeat_requests FORCE ROW LEVEL SECURITY;

ALTER TABLE mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorships FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- Policies for service_requests: Customer only accesses own requests; Admin accesses all
DROP POLICY IF EXISTS rls_service_requests_policy ON service_requests;
CREATE POLICY rls_service_requests_policy ON service_requests
  FOR ALL
  TO confiare_rls_user
  USING (
    current_setting('app.current_user_role', true) = 'admin'
    OR customer_user_id::text = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'admin'
    OR customer_user_id::text = current_setting('app.current_user_id', true)
  );

-- Policies for customer_profiles: Customer only accesses own profile; Admin accesses all
DROP POLICY IF EXISTS rls_customer_profiles_policy ON customer_profiles;
CREATE POLICY rls_customer_profiles_policy ON customer_profiles
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

-- Policies for opportunities: Provider only accesses own opportunities; Customer accesses own request's opportunities; Admin accesses all
DROP POLICY IF EXISTS rls_opportunities_policy ON opportunities;
CREATE POLICY rls_opportunities_policy ON opportunities
  FOR ALL
  TO confiare_rls_user
  USING (
    current_setting('app.current_user_role', true) = 'admin'
    OR provider_profile_id = current_setting('app.current_provider_id', true)
    OR customer_user_id::text = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'admin'
    OR provider_profile_id = current_setting('app.current_provider_id', true)
    OR customer_user_id::text = current_setting('app.current_user_id', true)
  );

-- Policies for repeat_requests: Customer or target Provider or Admin
DROP POLICY IF EXISTS rls_repeat_requests_policy ON repeat_requests;
CREATE POLICY rls_repeat_requests_policy ON repeat_requests
  FOR ALL
  TO confiare_rls_user
  USING (
    current_setting('app.current_user_role', true) = 'admin'
    OR customer_user_id::text = current_setting('app.current_user_id', true)
    OR provider_profile_id = current_setting('app.current_provider_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'admin'
    OR customer_user_id::text = current_setting('app.current_user_id', true)
    OR provider_profile_id = current_setting('app.current_provider_id', true)
  );

-- Policies for reviews: Publicly readable, writable only by owning customer or admin
DROP POLICY IF EXISTS rls_reviews_select_policy ON reviews;
CREATE POLICY rls_reviews_select_policy ON reviews
  FOR SELECT
  TO confiare_rls_user
  USING (true);

DROP POLICY IF EXISTS rls_reviews_write_policy ON reviews;
CREATE POLICY rls_reviews_write_policy ON reviews
  FOR INSERT
  TO confiare_rls_user
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'admin'
    OR customer_user_id::text = current_setting('app.current_user_id', true)
  );

-- Policies for mentorships: Padrinho only accesses own authorized mentees; Admin accesses all
DROP POLICY IF EXISTS rls_mentorships_policy ON mentorships;
CREATE POLICY rls_mentorships_policy ON mentorships
  FOR ALL
  TO confiare_rls_user
  USING (
    current_setting('app.current_user_role', true) = 'admin'
    OR (
      current_setting('app.current_user_role', true) = 'padrinho'
      AND mentor_provider_id = current_setting('app.current_provider_id', true)
    )
    OR mentee_provider_id = current_setting('app.current_provider_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'admin'
    OR (
      current_setting('app.current_user_role', true) = 'padrinho'
      AND mentor_provider_id = current_setting('app.current_provider_id', true)
    )
  );

-- Policies for audit_logs: Only Admin can read; any authenticated actor can insert
DROP POLICY IF EXISTS rls_audit_logs_select_policy ON audit_logs;
CREATE POLICY rls_audit_logs_select_policy ON audit_logs
  FOR SELECT
  TO confiare_rls_user
  USING (current_setting('app.current_user_role', true) = 'admin');

DROP POLICY IF EXISTS rls_audit_logs_insert_policy ON audit_logs;
CREATE POLICY rls_audit_logs_insert_policy ON audit_logs
  FOR INSERT
  TO confiare_rls_user
  WITH CHECK (true);
