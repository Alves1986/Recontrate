-- Seed de Demonstração 02: Prestadores Fictícios e Especialidades Oficiais
-- PROIBIDO EM PRODUÇÃO: executar somente em development/staging/demo com DEMO_MODE=true.

INSERT INTO provider_profiles (
  id, user_id, slug, name, professional_name, category, city, plan_slug,
  rating_avg, reviews_count, completed_jobs, response_time_minutes,
  response_rate_percent, attendance_rate_percent, is_verified, is_top_region,
  is_mentor, available_today, whatsapp, neighborhoods, verification_status, bio
) VALUES
  (
    'demo-prov-joao',
    '00000000-0000-4000-8000-000000000102',
    'demo-joao-eletrica',
    'João Batista (Demo)',
    'João Batista (Demo)',
    'Elétrica',
    'São Paulo, SP',
    'padrinho',
    '4.96',
    94,
    128,
    9,
    98,
    100,
    true,
    true,
    true,
    true,
    '(11) 90000-0102',
    ARRAY['Pinheiros','Vila Madalena','Jardins']::TEXT[],
    'aprovado',
    'Perfil fictício de demonstração para fluxo de elétrica residencial, quadros DIN e mentoria.'
  ),
  (
    'demo-prov-carlos',
    '00000000-0000-4000-8000-000000000103',
    'demo-carlos-eletrica',
    'Carlos Mendes (Demo)',
    'Carlos Mendes (Demo)',
    'Elétrica',
    'São Paulo, SP',
    'profissional',
    '4.89',
    52,
    76,
    12,
    96,
    99,
    true,
    false,
    false,
    true,
    '(11) 90000-0103',
    ARRAY['Pinheiros','Perdizes','Butantã']::TEXT[],
    'aprovado',
    'Perfil fictício de demonstração apadrinhado na rede para atendimentos rápidos em elétrica.'
  ),
  (
    'demo-prov-ana',
    '00000000-0000-4000-8000-000000000104',
    'demo-ana-limpeza',
    'Ana Ribeiro (Demo)',
    'Ana Ribeiro (Demo)',
    'Diarista e limpeza',
    'São Paulo, SP',
    'premium',
    '4.98',
    112,
    164,
    11,
    99,
    100,
    true,
    true,
    false,
    true,
    '(11) 90000-0104',
    ARRAY['Pinheiros','Itaim Bibi','Moema']::TEXT[],
    'aprovado',
    'Perfil fictício de demonstração para serviços residenciais e organização pós-obra.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO provider_specialties (provider_profile_id, specialty_id, especialidade_principal)
SELECT 'demo-prov-joao', id, true FROM specialties WHERE slug = 'quadro-de-distribuicao'
ON CONFLICT (provider_profile_id, specialty_id) DO NOTHING;

INSERT INTO provider_specialties (provider_profile_id, specialty_id, especialidade_principal)
SELECT 'demo-prov-carlos', id, true FROM specialties WHERE slug = 'instalacao-eletrica-residencial'
ON CONFLICT (provider_profile_id, specialty_id) DO NOTHING;

INSERT INTO provider_specialties (provider_profile_id, specialty_id, especialidade_principal)
SELECT 'demo-prov-ana', id, true FROM specialties WHERE slug = 'limpeza-residencial'
ON CONFLICT (provider_profile_id, specialty_id) DO NOTHING;
