-- Seed de Demonstração 08: Anúncios e Notificações de Demonstração (Placeholders Locais)
-- PROIBIDO EM PRODUÇÃO: executar somente em development/staging/demo com DEMO_MODE=true.

INSERT INTO ad_slots (
  id, nome, tipo, categoria, anunciante, imagem_url, link_destino,
  texto, data_inicio, data_fim, prioridade, status, impressoes, cliques
) VALUES (
  'demo-ad-slot-1',
  '[DEMO] Banner Exemplo Ferramentas Profissionais',
  'banner_painel_prestador',
  'ferramentas',
  'Fornecedor Parceiro (Demo)',
  '/icons/icon.svg',
  '/demo',
  'Exemplo ilustrativo de anúncio exibido apenas para prestadores no plano gratuito em modo demonstração.',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '365 days',
  10,
  'ativo',
  0,
  0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO realtime_notifications (
  id, provider_id, type, title, message, client_name, neighborhood, urgency_or_scope, read
) VALUES (
  'demo-notif-1',
  'demo-prov-joao',
  'nova_oportunidade',
  '[DEMO] Nova oportunidade compatível em Pinheiros',
  'Revisão de disjuntor e tomada 20A (dado fictício de demonstração)',
  'Mariana S. (Demo)',
  'Pinheiros (1.2 km)',
  'Urgência: Hoje · Tarde (13h-18h)',
  false
)
ON CONFLICT (id) DO NOTHING;
