-- Seed de Demonstração 04: Oportunidades Fictícias
-- PROIBIDO EM PRODUÇÃO: executar somente em development/staging/demo com DEMO_MODE=true.

INSERT INTO opportunities (
  id, service_request_id, provider_profile_id, customer_user_id, category_name,
  title, description, neighborhood, distance_km, urgency, preferred_time,
  client_name_masked, client_name_full, client_whatsapp, lgpd_contact_consent,
  origin, status, contact_released
) VALUES (
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000201',
  'demo-prov-joao',
  '00000000-0000-4000-8000-000000000101',
  'Elétrica',
  '[DEMO] Revisão de disjuntor e tomada 20A na cozinha',
  'Oportunidade fictícia de demonstração com contato protegido até o aceite.',
  'Pinheiros',
  1.2,
  'Hoje',
  'Tarde (13h-18h)',
  'Mariana S. (Demo)',
  'Mariana Silva (Demo)',
  '(11) 90000-0101',
  true,
  'Matching Local Demo',
  'pendente',
  false
)
ON CONFLICT (id) DO NOTHING;
