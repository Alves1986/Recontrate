-- Seed de Demonstração 06: Recontratação e Indicação de Substituto Fictícia
-- PROIBIDO EM PRODUÇÃO: executar somente em development/staging/demo com DEMO_MODE=true.

INSERT INTO repeat_requests (
  id, customer_user_id, provider_profile_id, category_name, service_type,
  desired_date, urgency, notes, lgpd_share_consent, status
) VALUES (
  '00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000101',
  'demo-prov-joao',
  'Elétrica',
  '[DEMO] Instalação de tomadas 20A na lavanderia',
  'Amanhã à tarde',
  'Amanhã',
  'Pedido fictício de recontratação para ilustrar agenda cheia e substituto de confiança.',
  true,
  'indisponivel_com_substituto'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO substitute_referrals (
  id, repeat_request_id, original_provider_id, customer_user_id,
  substitute_provider_ids, reason_category, custom_note, service_context,
  neighborhood, urgency, client_consent_shared
) VALUES (
  '00000000-0000-4000-8000-000000000601',
  '00000000-0000-4000-8000-000000000501',
  'demo-prov-joao',
  '00000000-0000-4000-8000-000000000101',
  ARRAY['demo-prov-carlos']::TEXT[],
  'Agenda lotada nesta janela',
  'Indicação fictícia de demonstração: Carlos atuou comigo em instalações NBR 5410.',
  '[DEMO] Instalação de tomadas 20A na lavanderia',
  'Pinheiros',
  'Amanhã',
  true
)
ON CONFLICT (id) DO NOTHING;
