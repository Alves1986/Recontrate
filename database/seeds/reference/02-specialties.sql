-- Seed de Referência 02: Especialidades Oficiais da Confiare (81 especialidades)
-- Seguro para execução idempotente em todos os ambientes, inclusive produção.

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação elétrica residencial', 'instalacao-eletrica-residencial', '', ARRAY['eletrica residencial', 'fiacao residencial', 'eletricista residencial']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'eletrica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação elétrica comercial', 'instalacao-eletrica-comercial', '', ARRAY['eletrica comercial', 'loja', 'escritorio']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'eletrica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Manutenção elétrica', 'manutencao-eletrica', '', ARRAY['reparo eletrico', 'curto circuito', 'manutencao de eletrica']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'eletrica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação de chuveiro', 'instalacao-de-chuveiro', '', ARRAY['chuveiro', 'troca de chuveiro', 'chuveiro eletrico', 'disjuntor chuveiro']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'eletrica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação de tomadas e interruptores', 'instalacao-de-tomadas-e-interruptores', '', ARRAY['tomada 20a', 'troca de tomada', 'interruptor']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'eletrica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Quadro de distribuição', 'quadro-de-distribuicao', '', ARRAY['quadro eletrico', 'disjuntor', 'idr', 'dps']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'eletrica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Iluminação', 'iluminacao', '', ARRAY['luminaria', 'lustre', 'fita de led', 'spot led']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'eletrica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Automação residencial', 'automacao-residencial', '', ARRAY['casa inteligente', 'interruptor smart', 'alexa']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'eletrica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Aterramento', 'aterramento', '', ARRAY['haste de aterramento', 'protecao eletrica']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'eletrica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Manutenção predial elétrica', 'manutencao-predial-eletrica', '', ARRAY['condominio eletrica', 'manutencao predial']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'eletrica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação hidráulica residencial', 'instalacao-hidraulica-residencial', '', ARRAY['encanador residencial', 'tubulacao', 'agua fria e quente']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'hidraulica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Reparo de vazamento', 'reparo-de-vazamento', '', ARRAY['caca vazamento', 'vazamento de cano', 'registro pingando']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'hidraulica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Desentupimento', 'desentupimento', '', ARRAY['desentupidor', 'pia entupida', 'ralo entupido']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'hidraulica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação de torneira', 'instalacao-de-torneira', '', ARRAY['troca de torneira', 'misturador', 'torneira gourmet']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'hidraulica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação de vaso sanitário', 'instalacao-de-vaso-sanitario', '', ARRAY['troca de vaso sanitario', 'caixa acoplada', 'valvula hydra']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'hidraulica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Manutenção de caixa d''água', 'manutencao-de-caixa-d-agua', '', ARRAY['limpeza de caixa dagua', 'boia caixa dagua']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'hidraulica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação de aquecedor', 'instalacao-de-aquecedor', '', ARRAY['aquecedor a gas', 'pressurizador']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'hidraulica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Manutenção predial hidráulica', 'manutencao-predial-hidraulica', '', ARRAY['hidraulica condominio', 'prumada']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'hidraulica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Pintura residencial', 'pintura-residencial', '', ARRAY['pintor residencial', 'pintura apartamento']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'pintura'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Pintura comercial', 'pintura-comercial', '', ARRAY['pintura escritorio', 'pintura loja']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'pintura'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Pintura de fachada', 'pintura-de-fachada', '', ARRAY['pintura externa', 'fachada']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'pintura'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Textura', 'textura', '', ARRAY['efeito cimento queimado', 'textura parede']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'pintura'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Grafiato', 'grafiato', '', ARRAY['aplicacao de grafiato']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'pintura'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Verniz', 'verniz', '', ARRAY['envernizamento', 'verniz madeira']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'pintura'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Pintura de gesso', 'pintura-de-gesso', '', ARRAY['pintura teto gesso', 'massa corrida']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'pintura'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Restauração de pintura', 'restauracao-de-pintura', '', ARRAY['tratamento de trincas', 'umidade parede']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'pintura'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Limpeza residencial', 'limpeza-residencial', '', ARRAY['faxina residencial', 'diarista apartamento']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'diarista-e-limpeza'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Limpeza comercial', 'limpeza-comercial', '', ARRAY['limpeza escritorio', 'limpeza consultorio']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'diarista-e-limpeza'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Limpeza pós-obra', 'limpeza-pos-obra', '', ARRAY['limpeza pos reforma', 'faxina pos obra']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'diarista-e-limpeza'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Limpeza de sofá', 'limpeza-de-sofa', '', ARRAY['higienizacao de sofa', 'lavagem de estofado']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'diarista-e-limpeza'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Limpeza de carpete', 'limpeza-de-carpete', '', ARRAY['higienizacao de tapete']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'diarista-e-limpeza'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Organização residencial', 'organizacao-residencial', '', ARRAY['personal organizer', 'organizacao armarios']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'diarista-e-limpeza'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Passadoria', 'passadoria', '', ARRAY['passar roupas', 'passadeira']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'diarista-e-limpeza'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Lavanderia', 'lavanderia', '', ARRAY['lavagem de roupas']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'diarista-e-limpeza'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação de split', 'instalacao-de-split', '', ARRAY['instalacao ar inverter', 'split hi wall']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'ar-condicionado'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Manutenção de split', 'manutencao-de-split', '', ARRAY['conserto de ar condicionado', 'reparo split']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'ar-condicionado'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Higienização', 'higienizacao', '', ARRAY['limpeza de ar condicionado', 'higienizacao ar']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'ar-condicionado'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Carga de gás', 'carga-de-gas', '', ARRAY['recarga de gas', 'gas refrigerante']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'ar-condicionado'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação de ar-condicionado comercial', 'instalacao-de-ar-condicionado-comercial', '', ARRAY['ar condicionado empresa']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'ar-condicionado'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Manutenção preventiva', 'manutencao-preventiva', '', ARRAY['pmoc', 'revisao ar condicionado']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'ar-condicionado'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação de cassete', 'instalacao-de-cassete', '', ARRAY['ar cassete']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'ar-condicionado'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação de piso teto', 'instalacao-de-piso-teto', '', ARRAY['ar piso teto']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'ar-condicionado'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Montagem de móveis', 'montagem-de-moveis', '', ARRAY['montador de moveis']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'montagem-e-moveis'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Desmontagem de móveis', 'desmontagem-de-moveis', '', ARRAY['desmontar guarda roupa']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'montagem-e-moveis'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Montagem de armário', 'montagem-de-armario', '', ARRAY['montagem guarda roupa', 'closet']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'montagem-e-moveis'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Montagem de cozinha', 'montagem-de-cozinha', '', ARRAY['armario de cozinha']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'montagem-e-moveis'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Montagem de berço', 'montagem-de-berco', '', ARRAY['quarto infantil']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'montagem-e-moveis'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Montagem de estante', 'montagem-de-estante', '', ARRAY['rack e painel']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'montagem-e-moveis'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação de suporte de TV', 'instalacao-de-suporte-de-tv', '', ARRAY['suporte tv parede']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'montagem-e-moveis'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Montagem de escritório', 'montagem-de-escritorio', '', ARRAY['mesa escritorio', 'estacao de trabalho']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'montagem-e-moveis'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Alvenaria', 'alvenaria', '', ARRAY['pedreiro', 'levantamento de parede']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'reforma-e-construcao'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Gesso', 'gesso', '', ARRAY['sanca', 'moldura de gesso']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'reforma-e-construcao'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Piso', 'piso', '', ARRAY['contrapiso', 'assentamento de piso']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'reforma-e-construcao'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Porcelanato', 'porcelanato', '', ARRAY['assentamento porcelanato', 'azulejista']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'reforma-e-construcao'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Azulejo', 'azulejo', '', ARRAY['revestimento ceramico']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'reforma-e-construcao'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Reforma de banheiro', 'reforma-de-banheiro', '', ARRAY['reforma wc']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'reforma-e-construcao'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Reforma de cozinha', 'reforma-de-cozinha', '', ARRAY['reforma gourmet']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'reforma-e-construcao'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Drywall', 'drywall', '', ARRAY['parede drywall', 'divisoria gesso acartonado']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'reforma-e-construcao'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Forro', 'forro', '', ARRAY['forro pvc', 'forro drywall']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'reforma-e-construcao'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Impermeabilização', 'impermeabilizacao', '', ARRAY['manta asfaltica', 'infiltracao laje']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'reforma-e-construcao'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Manutenção de jardim', 'manutencao-de-jardim', '', ARRAY['jardineiro']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'jardinagem'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Poda de árvores', 'poda-de-arvores', '', ARRAY['poda ornamental', 'poda cerca viva']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'jardinagem'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Gramado', 'gramado', '', ARRAY['corte de grama', 'plantio de grama']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'jardinagem'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Irrigação', 'irrigacao', '', ARRAY['sistema de irrigacao']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'jardinagem'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Paisagismo', 'paisagismo', '', ARRAY['projeto paisagistico']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'jardinagem'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Limpeza de área externa', 'limpeza-de-area-externa', '', ARRAY['limpeza quintal']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'jardinagem'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Plantio', 'plantio', '', ARRAY['plantio de mudas', 'horta']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'jardinagem'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Manutenção de computador', 'manutencao-de-computador', '', ARRAY['conserto notebook', 'reparo pc']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'tecnico-e-informatica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Formatação', 'formatacao', '', ARRAY['formatar notebook', 'reinstalacao windows']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'tecnico-e-informatica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Instalação de programas', 'instalacao-de-programas', '', ARRAY['configuracao software']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'tecnico-e-informatica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Redes e Wi-Fi', 'redes-e-wi-fi', '', ARRAY['repetidor wifi', 'rede mesh', 'roteador']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'tecnico-e-informatica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Câmeras de segurança', 'cameras-de-seguranca', '', ARRAY['cftv', 'instalacao camera']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'tecnico-e-informatica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Suporte técnico residencial', 'suporte-tecnico-residencial', '', ARRAY['tecnico informatica casa']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'tecnico-e-informatica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Suporte técnico comercial', 'suporte-tecnico-comercial', '', ARRAY['ti empresa']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'tecnico-e-informatica'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Mudança residencial', 'mudanca-residencial', '', ARRAY['caminhao de mudanca']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'mudanca-e-frete'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Mudança comercial', 'mudanca-comercial', '', ARRAY['mudanca escritorio']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'mudanca-e-frete'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Frete', 'frete', '', ARRAY['carreto', 'frete rapido']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'mudanca-e-frete'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Içamento', 'icamento', '', ARRAY['icamento de moveis']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'mudanca-e-frete'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Embalagem', 'embalagem', '', ARRAY['embalagem para mudanca']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'mudanca-e-frete'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Desmontagem para mudança', 'desmontagem-para-mudanca', '', ARRAY['desmontagem e montagem mudanca']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'mudanca-e-frete'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();

INSERT INTO specialties (category_id, nome, slug, descricao, sinonimos, ativo, oficial, criado_por)
SELECT id, 'Transporte de móveis', 'transporte-de-moveis', '', ARRAY['carreto de moveis']::TEXT[], true, true, 'sistema' FROM categories WHERE slug = 'mudanca-e-frete'
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, nome = EXCLUDED.nome, sinonimos = EXCLUDED.sinonimos, ativo = true, oficial = true, atualizado_em = NOW();
