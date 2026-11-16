-- =============================================================================
-- Migration 002: Confiare Phase 2 — Full Marketplace RLS, Verification Documents & Consent Policies
-- Target: Neon Lakebase PostgreSQL 18
-- =============================================================================

-- 1. Add verification document metadata to storage_assets and provider_profiles
ALTER TABLE storage_assets ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public_portfolio'
  CHECK (visibility IN ('public_portfolio', 'private_verification'));
ALTER TABLE storage_assets ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE storage_assets ADD COLUMN IF NOT EXISTS verified_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE storage_assets ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6) DEFAULT -23.561414;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6) DEFAULT -46.691415;

-- 2. Grant permissions on all tables to confiare_rls_user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO confiare_rls_user;

-- 3. Enable and Force RLS on Phase 2 operational tables
ALTER TABLE professional_trust_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_trust_list FORCE ROW LEVEL SECURITY;

ALTER TABLE substitute_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitute_referrals FORCE ROW LEVEL SECURITY;

ALTER TABLE service_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE storage_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_assets FORCE ROW LEVEL SECURITY;

-- 4. RLS Policy: professional_trust_list (Customer only accesses own trust list; Admin accesses all)
DROP POLICY IF EXISTS rls_trust_list_policy ON professional_trust_list;
CREATE POLICY rls_trust_list_policy ON professional_trust_list
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

-- 5. RLS Policy: substitute_referrals
-- Data shared with a substitute provider requires explicit client consent (client_consent_shared = true)
DROP POLICY IF EXISTS rls_substitute_referrals_policy ON substitute_referrals;
CREATE POLICY rls_substitute_referrals_policy ON substitute_referrals
  FOR ALL
  TO confiare_rls_user
  USING (
    current_setting('app.current_user_role', true) = 'admin'
    OR original_provider_id = current_setting('app.current_provider_id', true)
    OR customer_user_id::text = current_setting('app.current_user_id', true)
    OR (
      client_consent_shared = true
      AND current_setting('app.current_provider_id', true) = ANY(substitute_provider_ids)
    )
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'admin'
    OR original_provider_id = current_setting('app.current_provider_id', true)
    OR customer_user_id::text = current_setting('app.current_user_id', true)
  );

-- 6. RLS Policy: service_assignments (Customer or assigned Provider or Admin)
DROP POLICY IF EXISTS rls_service_assignments_policy ON service_assignments;
CREATE POLICY rls_service_assignments_policy ON service_assignments
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

-- 7. RLS Policy: notifications (User only sees own notifications or own provider notifications; Admin sees all)
DROP POLICY IF EXISTS rls_notifications_policy ON notifications;
CREATE POLICY rls_notifications_policy ON notifications
  FOR ALL
  TO confiare_rls_user
  USING (
    current_setting('app.current_user_role', true) = 'admin'
    OR user_id::text = current_setting('app.current_user_id', true)
    OR provider_profile_id = current_setting('app.current_provider_id', true)
  )
  WITH CHECK (true);

-- 8. RLS Policy: storage_assets
-- Verification documents ('private_verification') can ONLY be accessed by the owning provider and authorized admins.
DROP POLICY IF EXISTS rls_storage_assets_policy ON storage_assets;
CREATE POLICY rls_storage_assets_policy ON storage_assets
  FOR ALL
  TO confiare_rls_user
  USING (
    visibility = 'public_portfolio'
    OR current_setting('app.current_user_role', true) = 'admin'
    OR provider_profile_id = current_setting('app.current_provider_id', true)
  )
  WITH CHECK (
    current_setting('app.current_user_role', true) = 'admin'
    OR provider_profile_id = current_setting('app.current_provider_id', true)
  );
