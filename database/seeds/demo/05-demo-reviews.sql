-- Seed de Demonstração 05: Avaliações Fictícias e Lista de Confiança
-- PROIBIDO EM PRODUÇÃO: executar somente em development/staging/demo com DEMO_MODE=true.

INSERT INTO reviews (
  id, service_request_id, provider_profile_id, customer_user_id,
  client_name_display, neighborhood, service_title,
  rating, qualidade, pontualidade, comunicacao, organizacao,
  would_recommend, comment
) VALUES (
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000201',
  'demo-prov-joao',
  '00000000-0000-4000-8000-000000000101',
  'Mariana S. (Demo)',
  'Pinheiros',
  '[DEMO] Adequação de disjuntor DR',
  5.00,
  5,
  5,
  5,
  5,
  true,
  'Avaliação fictícia de demonstração: atendimento pontual, orçamento claro e ambiente limpo.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO professional_trust_list (
  customer_user_id, provider_profile_id, last_service_date, last_service_summary, times_hired
) VALUES (
  '00000000-0000-4000-8000-000000000101',
  'demo-prov-joao',
  'Out 2026',
  '[DEMO] Substituição de disjuntor DR e tomada 20A',
  2
)
ON CONFLICT (customer_user_id, provider_profile_id) DO NOTHING;
