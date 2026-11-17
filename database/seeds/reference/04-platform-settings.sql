-- Seed de Referência 04: Configurações Essenciais da Plataforma
-- Seguro para execução idempotente em todos os ambientes, inclusive produção.

INSERT INTO platform_settings (key, value_json, description, is_public) VALUES
  (
    'demo_mode_default',
    'false'::jsonb,
    'Em produção, dados fictícios permanecem sempre desativados salvo variável explícita fora de produção.',
    true
  ),
  (
    'marketplace_currency',
    '"BRL"'::jsonb,
    'Moeda oficial de precificação da plataforma em centavos (BRL).',
    true
  ),
  (
    'max_official_specialties_per_provider',
    '5'::jsonb,
    'Quantidade máxima de especialidades oficiais que um prestador pode vincular ao perfil (1 a 5).',
    true
  ),
  (
    'max_pending_suggestions_per_provider',
    '3'::jsonb,
    'Limite máximo de sugestões de especialidades pendentes de moderação por prestador.',
    true
  ),
  (
    'max_custom_tags_per_provider',
    '10'::jsonb,
    'Limite máximo de tags complementares livres por perfil de prestador.',
    true
  ),
  (
    'release_contact_only_on_accept',
    'true'::jsonb,
    'Regra LGPD: contato direto do cliente só é liberado após aceite da oportunidade pelo prestador.',
    false
  ),
  (
    'auction_model_disabled',
    'true'::jsonb,
    'Confiare opera por assinatura sem leilão de lances ou venda avulsa de leads.',
    true
  ),
  (
    'lgpd_terms_version',
    '"2026.1"'::jsonb,
    'Versão vigente de Termos de Uso e Política de Privacidade LGPD.',
    true
  )
ON CONFLICT (key) DO UPDATE SET
  value_json = EXCLUDED.value_json,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();
