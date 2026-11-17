-- Seed de Demonstração 07: Assinaturas, Faturas e Uso de Exemplo
-- PROIBIDO EM PRODUÇÃO: executar somente em development/staging/demo com DEMO_MODE=true.

INSERT INTO subscriptions (
  id, provider_profile_id, plan_id, status, ciclo, inicio, fim, proxima_cobranca
) VALUES (
  'demo-sub-profissional-1',
  'demo-prov-carlos',
  'plan-profissional',
  'ativa',
  'mensal',
  NOW() - INTERVAL '10 days',
  NOW() + INTERVAL '20 days',
  NOW() + INTERVAL '20 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscription_events (
  id, subscription_id, evento, dados_novos_json
) VALUES (
  'demo-sub-evt-1',
  'demo-sub-profissional-1',
  'demo_subscription_created',
  '{"planSlug":"profissional","demo":true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (
  id, subscription_id, valor_centavos, status, metodo, vencimento, pago_em
) VALUES (
  'demo-inv-1',
  'demo-sub-profissional-1',
  5990,
  'paga',
  'pix',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO opportunity_usage (
  id, provider_profile_id, subscription_id, periodo_inicio, periodo_fim, oportunidades_utilizadas
) VALUES (
  'demo-usage-1',
  'demo-prov-carlos',
  'demo-sub-profissional-1',
  NOW() - INTERVAL '10 days',
  NOW() + INTERVAL '20 days',
  6
)
ON CONFLICT (id) DO NOTHING;
