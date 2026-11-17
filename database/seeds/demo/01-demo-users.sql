-- Seed de Demonstração 01: Usuários e Clientes Fictícios
-- PROIBIDO EM PRODUÇÃO: executar somente em development/staging/demo com DEMO_MODE=true.

INSERT INTO users (id, email, roles, active_role, status, email_verified, onboarding_completed) VALUES
  (
    '00000000-0000-4000-8000-000000000101',
    'cliente.demo@demo.confiare.invalid',
    ARRAY['cliente']::TEXT[],
    'cliente',
    'ativo',
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'joao.eletrica@demo.confiare.invalid',
    ARRAY['prestador','padrinho']::TEXT[],
    'padrinho',
    'ativo',
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    'carlos.eletrica@demo.confiare.invalid',
    ARRAY['prestador']::TEXT[],
    'prestador',
    'ativo',
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000104',
    'ana.limpeza@demo.confiare.invalid',
    ARRAY['prestador']::TEXT[],
    'prestador',
    'ativo',
    true,
    true
  )
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, full_name, phone, city, neighborhood, lgpd_consent, lgpd_consent_at) VALUES
  ('00000000-0000-4000-8000-000000000101', 'Mariana Silva (Demo)', '(11) 90000-0101', 'São Paulo, SP', 'Pinheiros', true, NOW()),
  ('00000000-0000-4000-8000-000000000102', 'João Batista (Demo)', '(11) 90000-0102', 'São Paulo, SP', 'Pinheiros', true, NOW()),
  ('00000000-0000-4000-8000-000000000103', 'Carlos Mendes (Demo)', '(11) 90000-0103', 'São Paulo, SP', 'Perdizes', true, NOW()),
  ('00000000-0000-4000-8000-000000000104', 'Ana Ribeiro (Demo)', '(11) 90000-0104', 'São Paulo, SP', 'Itaim Bibi', true, NOW())
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO customer_profiles (user_id, favorite_categories, preferred_contact) VALUES
  ('00000000-0000-4000-8000-000000000101', ARRAY['Elétrica','Hidráulica','Diarista e limpeza']::TEXT[], 'WhatsApp')
ON CONFLICT (user_id) DO NOTHING;
