-- Seed de Referência 01: Categorias Oficiais da Confiare (10 categorias)
-- Seguro para execução idempotente em todos os ambientes, inclusive produção.

INSERT INTO categories (slug, name, nome, short_desc, descricao, icone, avg_response_min, verified_count, active, ativo, ordem_exibicao)
VALUES ('eletrica', 'Elétrica', 'Elétrica', 'Instalações residenciais e comerciais, quadros de distribuição, chuveiros, iluminação e automação.', 'Instalações residenciais e comerciais, quadros de distribuição, chuveiros, iluminação e automação.', 'zap', 11, 42, true, true, 1)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, nome = EXCLUDED.nome, short_desc = EXCLUDED.short_desc, descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone, ordem_exibicao = EXCLUDED.ordem_exibicao, active = true, ativo = true, atualizado_em = NOW();

INSERT INTO categories (slug, name, nome, short_desc, descricao, icone, avg_response_min, verified_count, active, ativo, ordem_exibicao)
VALUES ('hidraulica', 'Hidráulica', 'Hidráulica', 'Reparos de vazamentos, desentupimento, registros, torneiras, aquecedores e manutenção predial hidráulica.', 'Reparos de vazamentos, desentupimento, registros, torneiras, aquecedores e manutenção predial hidráulica.', 'droplets', 14, 35, true, true, 2)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, nome = EXCLUDED.nome, short_desc = EXCLUDED.short_desc, descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone, ordem_exibicao = EXCLUDED.ordem_exibicao, active = true, ativo = true, atualizado_em = NOW();

INSERT INTO categories (slug, name, nome, short_desc, descricao, icone, avg_response_min, verified_count, active, ativo, ordem_exibicao)
VALUES ('pintura', 'Pintura', 'Pintura', 'Pintura residencial e comercial, fachadas, textura, grafiato, verniz e restauração.', 'Pintura residencial e comercial, fachadas, textura, grafiato, verniz e restauração.', 'paintbrush', 19, 29, true, true, 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, nome = EXCLUDED.nome, short_desc = EXCLUDED.short_desc, descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone, ordem_exibicao = EXCLUDED.ordem_exibicao, active = true, ativo = true, atualizado_em = NOW();

INSERT INTO categories (slug, name, nome, short_desc, descricao, icone, avg_response_min, verified_count, active, ativo, ordem_exibicao)
VALUES ('diarista-e-limpeza', 'Diarista e limpeza', 'Diarista e limpeza', 'Limpeza residencial e comercial, pós-obra, estofados, organização e passadoria.', 'Limpeza residencial e comercial, pós-obra, estofados, organização e passadoria.', 'sparkles', 16, 58, true, true, 4)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, nome = EXCLUDED.nome, short_desc = EXCLUDED.short_desc, descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone, ordem_exibicao = EXCLUDED.ordem_exibicao, active = true, ativo = true, atualizado_em = NOW();

INSERT INTO categories (slug, name, nome, short_desc, descricao, icone, avg_response_min, verified_count, active, ativo, ordem_exibicao)
VALUES ('ar-condicionado', 'Ar-condicionado', 'Ar-condicionado', 'Instalação de split, cassete e piso teto, higienização, carga de gás e manutenção preventiva.', 'Instalação de split, cassete e piso teto, higienização, carga de gás e manutenção preventiva.', 'wind', 13, 24, true, true, 5)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, nome = EXCLUDED.nome, short_desc = EXCLUDED.short_desc, descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone, ordem_exibicao = EXCLUDED.ordem_exibicao, active = true, ativo = true, atualizado_em = NOW();

INSERT INTO categories (slug, name, nome, short_desc, descricao, icone, avg_response_min, verified_count, active, ativo, ordem_exibicao)
VALUES ('montagem-e-moveis', 'Montagem e móveis', 'Montagem e móveis', 'Montagem e desmontagem de móveis planejados e modulados, armários, cozinhas, suportes de TV e escritórios.', 'Montagem e desmontagem de móveis planejados e modulados, armários, cozinhas, suportes de TV e escritórios.', 'hammer', 15, 31, true, true, 6)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, nome = EXCLUDED.nome, short_desc = EXCLUDED.short_desc, descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone, ordem_exibicao = EXCLUDED.ordem_exibicao, active = true, ativo = true, atualizado_em = NOW();

INSERT INTO categories (slug, name, nome, short_desc, descricao, icone, avg_response_min, verified_count, active, ativo, ordem_exibicao)
VALUES ('reforma-e-construcao', 'Reforma e construção', 'Reforma e construção', 'Alvenaria, pisos, porcelanato, drywall, forro, impermeabilização e reformas de banheiro e cozinha.', 'Alvenaria, pisos, porcelanato, drywall, forro, impermeabilização e reformas de banheiro e cozinha.', 'hard-hat', 22, 27, true, true, 7)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, nome = EXCLUDED.nome, short_desc = EXCLUDED.short_desc, descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone, ordem_exibicao = EXCLUDED.ordem_exibicao, active = true, ativo = true, atualizado_em = NOW();

INSERT INTO categories (slug, name, nome, short_desc, descricao, icone, avg_response_min, verified_count, active, ativo, ordem_exibicao)
VALUES ('jardinagem', 'Jardinagem', 'Jardinagem', 'Manutenção de jardins, poda, gramado, irrigação, paisagismo, limpeza de área externa e plantio.', 'Manutenção de jardins, poda, gramado, irrigação, paisagismo, limpeza de área externa e plantio.', 'trees', 20, 18, true, true, 8)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, nome = EXCLUDED.nome, short_desc = EXCLUDED.short_desc, descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone, ordem_exibicao = EXCLUDED.ordem_exibicao, active = true, ativo = true, atualizado_em = NOW();

INSERT INTO categories (slug, name, nome, short_desc, descricao, icone, avg_response_min, verified_count, active, ativo, ordem_exibicao)
VALUES ('tecnico-e-informatica', 'Técnico e informática', 'Técnico e informática', 'Manutenção de computadores, formatação, redes Wi-Fi, câmeras de segurança e suporte técnico.', 'Manutenção de computadores, formatação, redes Wi-Fi, câmeras de segurança e suporte técnico.', 'laptop', 14, 22, true, true, 9)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, nome = EXCLUDED.nome, short_desc = EXCLUDED.short_desc, descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone, ordem_exibicao = EXCLUDED.ordem_exibicao, active = true, ativo = true, atualizado_em = NOW();

INSERT INTO categories (slug, name, nome, short_desc, descricao, icone, avg_response_min, verified_count, active, ativo, ordem_exibicao)
VALUES ('mudanca-e-frete', 'Mudança e frete', 'Mudança e frete', 'Mudanças residenciais e comerciais, fretes rápidos, içamento, embalagem e transporte de móveis.', 'Mudanças residenciais e comerciais, fretes rápidos, içamento, embalagem e transporte de móveis.', 'truck', 18, 20, true, true, 10)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, nome = EXCLUDED.nome, short_desc = EXCLUDED.short_desc, descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone, ordem_exibicao = EXCLUDED.ordem_exibicao, active = true, ativo = true, atualizado_em = NOW();
