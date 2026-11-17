-- Seed de Referência 05: Papéis e Permissões Oficiais da Confiare
-- Seguro para execução idempotente em todos os ambientes, inclusive produção.

INSERT INTO roles (slug, nome, descricao, permissions_json, is_system) VALUES
  (
    'cliente',
    'Cliente',
    'Solicita serviços, acompanha matching, avalia atendimentos, gerencia lista de confiança e recontrata prestadores.',
    '["service_request:create","service_request:read_own","repeat_request:create","review:create","trust_list:manage","substitute_referral:accept"]'::jsonb,
    true
  ),
  (
    'prestador',
    'Prestador de Serviços',
    'Gerencia perfil profissional, escolhe 1 a 5 especialidades oficiais, recebe/aceita oportunidades, indica substitutos e assina planos.',
    '["provider_profile:manage_own","specialties:select","specialty_suggestion:submit","opportunity:read_own","opportunity:accept_decline","subscription:manage_own","substitute_referral:send"]'::jsonb,
    true
  ),
  (
    'padrinho',
    'Padrinho / Mentor Confiare',
    'Todos os privilégios do prestador acrescidos de código de apadrinhamento, mentoria de novos profissionais e acompanhamento de indicados.',
    '["provider_profile:manage_own","specialties:select","specialty_suggestion:submit","opportunity:read_own","opportunity:accept_decline","subscription:manage_own","substitute_referral:send","mentorship:manage_own"]'::jsonb,
    true
  ),
  (
    'admin',
    'Administrador da Plataforma',
    'Governança completa: moderação de especialidades, aprovação documental, campanhas, planos, backups, alertas e auditoria.',
    '["admin:*","taxonomy:moderate","providers:verify","campaigns:manage","plans:configure","backup:create","audit:read"]'::jsonb,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  permissions_json = EXCLUDED.permissions_json,
  is_system = EXCLUDED.is_system,
  updated_at = NOW();
