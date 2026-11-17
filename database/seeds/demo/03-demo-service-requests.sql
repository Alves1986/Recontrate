-- Seed de Demonstração 03: Solicitações de Serviço Fictícias
-- PROIBIDO EM PRODUÇÃO: executar somente em development/staging/demo com DEMO_MODE=true.

INSERT INTO service_requests (
  id, customer_user_id, category_id, category_name, problem_title, description,
  neighborhood, city, urgency, preferred_time, estimated_budget, lgpd_contact_consent, status
)
SELECT
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000101',
  c.id,
  'Elétrica',
  '[DEMO] Revisão de disjuntor e tomada 20A na cozinha',
  'Solicitação fictícia de demonstração para ilustrar matching sem leilão.',
  'Pinheiros',
  'São Paulo, SP',
  'Hoje',
  'Tarde (13h-18h)',
  'R$ 220 - R$ 350',
  true,
  'oportunidades_enviadas'
FROM categories c WHERE c.slug = 'eletrica'
ON CONFLICT (id) DO NOTHING;
