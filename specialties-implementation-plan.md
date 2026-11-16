# Plano de Implementação — Taxonomia Oficial, Especialidades, Sugestões e Tags Moderadas (`specialties-implementation-plan.md`)

## 1. Visão Geral e Princípio Central
Permitir que prestadores selecionem especialidades oficiais estruturadas, sugiram novas especialidades para análise administrativa e complementem seu perfil com tags livres moderadas — **sem comprometer a integridade do catálogo, a busca local ou o motor de matching**.

- **Categorias e Especialidades Oficiais:** controladas exclusivamente pela Confiare (`oficial = true`). O prestador nunca cria categoria principal livre.
- **Sugestões Pendentes:** nunca aparecem no perfil público nem participam do matching até aprovação administrativa. No painel do prestador aparecem apenas com status `"Em análise"`.
- **Tags Livres:** complementam a busca textual apenas quando aprovadas na moderação; jamais criam novas categorias nem são exibidas como especialidades oficiais.

---

## 2. Modelo de Dados (Migração `005_specialties_taxonomy_and_moderation.sql`)

1. **`categories`** (evolução da tabela existente preservando compatibilidade):
   - `id` (UUID PK), `nome` (TEXT), `name` (TEXT UNIQUE — compatibilidade), `slug` (TEXT UNIQUE), `categoria_pai_id` (UUID NULL FK `categories.id`), `descricao` (TEXT), `icone` (TEXT), `ativo` (BOOLEAN), `ordem_exibicao` (INTEGER), `criado_em` (TIMESTAMPTZ), `atualizado_em` (TIMESTAMPTZ).
2. **`specialties`**:
   - `id` (UUID PK), `category_id` (UUID NOT NULL FK `categories.id` ON DELETE CASCADE), `nome` (TEXT NOT NULL), `slug` (TEXT NOT NULL UNIQUE), `descricao` (TEXT NOT NULL DEFAULT ''), `sinonimos` (TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]), `ativo` (BOOLEAN NOT NULL DEFAULT TRUE), `oficial` (BOOLEAN NOT NULL DEFAULT TRUE), `criado_por` (TEXT NOT NULL DEFAULT 'sistema'), `criado_em` (TIMESTAMPTZ), `atualizado_em` (TIMESTAMPTZ).
3. **`specialty_suggestions`**:
   - `id` (UUID PK), `provider_profile_id` (TEXT NOT NULL FK `provider_profiles.id` ON DELETE CASCADE), `category_id` (UUID NOT NULL FK `categories.id`), `specialty_pai_id` (UUID NULL FK `specialties.id`), `nome_sugerido` (TEXT NOT NULL), `nome_normalizado` (TEXT NOT NULL), `descricao` (TEXT NOT NULL DEFAULT ''), `status` (`pendente | aprovada | reprovada | duplicada | convertida | correcao_solicitada`), `motivo_rejeicao` (TEXT), `revisado_por` (UUID NULL FK `users.id`), `revisado_em` (TIMESTAMPTZ), `specialty_id_criada` (UUID NULL FK `specialties.id`), `criado_em` (TIMESTAMPTZ), `atualizado_em` (TIMESTAMPTZ).
4. **`provider_specialties`**:
   - `id` (UUID PK), `provider_profile_id` (TEXT NOT NULL FK `provider_profiles.id` ON DELETE CASCADE), `specialty_id` (UUID NOT NULL FK `specialties.id` ON DELETE CASCADE), `especialidade_principal` (BOOLEAN NOT NULL DEFAULT FALSE), `criado_em` (TIMESTAMPTZ), `UNIQUE (provider_profile_id, specialty_id)`.
5. **`provider_custom_tags`**:
   - `id` (UUID PK), `provider_profile_id` (TEXT NOT NULL FK `provider_profiles.id` ON DELETE CASCADE), `tag` (TEXT NOT NULL), `slug` (TEXT NOT NULL), `status` (`pendente | aprovado | reprovado | removido`), `motivo_moderacao` (TEXT), `criado_em` (TIMESTAMPTZ), `UNIQUE (provider_profile_id, slug)`.

---

## 3. Fluxo de Cadastro do Prestador (`/app/prestador` & `/app/onboarding`)

1. Prestador escolhe obrigatoriamente **1 categoria principal** oficial.
2. Sistema carrega as especialidades oficiais da categoria e disponibiliza **busca com autocomplete** (considerando também sinônimos normalizados, ex.: `"chuveiro"` / `"troca de chuveiro"` → `"Instalação de chuveiro"`).
3. Prestador seleciona de **1 a 5 especialidades oficiais** (com indicação de especialidade principal).
4. Caso não encontre, clica em **"Não encontrei minha especialidade"** abrindo o modal de sugestão:
   - Campos: nome sugerido (`3..60` caracteres), descrição opcional, categoria mais próxima.
   - Antes do envio, o sistema busca semelhanças oficiais por normalização (sem acentos, lowercase, remoção de plural simples, comparação de tokens/sinônimos) e exibe sugestões oficiais equivalentes caso existam.
   - Bloqueia envio se houver termos genéricos (`"serviços"`, `"diversos"`, `"outros"`), ofensivos/ilegais, contato externo (telefone/e-mail/URL), duplicidade oficial ou se o prestador já possuir **3 sugestões pendentes**.
   - Ao enviar, informa: *"Sua sugestão foi enviada para análise. Enquanto isso, selecione uma especialidade oficial próxima."*
5. Prestador pode adicionar até **10 tags livres** (passam por moderação automática imediata bloqueando conteúdo ofensivo, links, telefones ou preços; tags limpas ficam disponíveis e auditáveis como aprovadas, e suspeitas vão para revisão humana).

---

## 4. Fluxo de Moderação Administrativa (`/admin`)

No painel administrativo, a fila de moderação exibe para cada sugestão:
- Prestador solicitante, categoria sugerida, nome sugerido, descrição e **frequência de solicitações semelhantes** (contagem agrupada por `nome_normalizado`).
- Ações disponíveis (todas gerando registro em `audit_logs`):
  1. **Aprovar como nova especialidade oficial:** valida unicidade, cria registro em `specialties` (`oficial = true`), vincula em `provider_specialties` para o prestador e marca sugestão como `aprovada`.
  2. **Aprovar como sinônimo / Mesclar com especialidade existente:** adiciona o termo ao array `sinonimos` da especialidade oficial alvo, vincula o prestador à especialidade oficial e marca sugestão como `convertida`.
  3. **Reprovar / Solicitar correção:** exige `motivo_rejeicao` claro para o prestador e altera status para `reprovada` (ou registra orientação de correção).
- Moderação complementar de `provider_custom_tags` pendentes (`aprovar | reprovar | remover`).

---

## 5. Regras de Busca e Motor de Matching

1. **Normalização de Texto (`normalizeTaxonomyTerm`)**:
   - Remove acentos (NFD), converte para minúsculas, normaliza espaços e remove sufixos triviais de plural para comparação semântica e slug único.
2. **Motor de Matching (`rankCompatibleProviders` + `MarketplaceDataService`)**:
   - Considera exclusivamente:
     - **Categoria principal oficial** (+ equivalência histórica de nomenclatura).
     - **Especialidades oficiais selecionadas e aprovadas** (incluindo match por sinônimos oficiais).
     - **Tags aprovadas** (`status = 'aprovado'`, peso complementar na busca textual).
     - **Descrição do serviço, área/raio de atendimento, disponibilidade e Nota Composta**.
   - **Bloqueio Estrito:** sugestões com `status != 'aprovada'` / `'convertida'` e tags com `status != 'aprovado'` **nunca** entram no índice de busca pública nem no matching.

---

## 6. Seed Inicial de Categorias e Especialidades (10 Categorias, 81 Especialidades Oficiais)

1. **Elétrica** (10): Instalação elétrica residencial, Instalação elétrica comercial, Manutenção elétrica, Instalação de chuveiro, Instalação de tomadas e interruptores, Quadro de distribuição, Iluminação, Automação residencial, Aterramento, Manutenção predial elétrica.
2. **Hidráulica** (8): Instalação hidráulica residencial, Reparo de vazamento, Desentupimento, Instalação de torneira, Instalação de vaso sanitário, Manutenção de caixa d'água, Instalação de aquecedor, Manutenção predial hidráulica.
3. **Pintura** (8): Pintura residencial, Pintura comercial, Pintura de fachada, Textura, Grafiato, Verniz, Pintura de gesso, Restauração de pintura.
4. **Diarista e limpeza** (8): Limpeza residencial, Limpeza comercial, Limpeza pós-obra, Limpeza de sofá, Limpeza de carpete, Organização residencial, Passadoria, Lavanderia.
5. **Ar-condicionado** (8): Instalação de split, Manutenção de split, Higienização, Carga de gás, Instalação de ar-condicionado comercial, Manutenção preventiva, Instalação de cassete, Instalação de piso teto.
6. **Montagem e móveis** (8): Montagem de móveis, Desmontagem de móveis, Montagem de armário, Montagem de cozinha, Montagem de berço, Montagem de estante, Instalação de suporte de TV, Montagem de escritório.
7. **Reforma e construção** (10): Alvenaria, Gesso, Piso, Porcelanato, Azulejo, Reforma de banheiro, Reforma de cozinha, Drywall, Forro, Impermeabilização.
8. **Jardinagem** (7): Manutenção de jardim, Poda de árvores, Gramado, Irrigação, Paisagismo, Limpeza de área externa, Plantio.
9. **Técnico e informática** (7): Manutenção de computador, Formatação, Instalação de programas, Redes e Wi-Fi, Câmeras de segurança, Suporte técnico residencial, Suporte técnico comercial.
10. **Mudança e frete** (7): Mudança residencial, Mudança comercial, Frete, Içamento, Embalagem, Desmontagem para mudança, Transporte de móveis.

---

## 7. Rotas e Telas

### Rotas de API
- `GET /api/taxonomy/categories`: lista categorias ativas e contagem/especialidades oficiais.
- `GET /api/taxonomy/specialties?categoryId=...&q=...`: busca com autocomplete e sinônimos.
- `GET /api/app/prestador/taxonomy`: retorna especialidades oficiais, sugestões (com status `"Em análise"` / `"Aprovada"` / `"Reprovada"`) e tags do prestador autenticado.
- `PUT /api/app/prestador/specialties`: salva categoria principal e `1..5` especialidades oficiais selecionadas.
- `POST /api/app/prestador/specialty-suggestions`: cria nova sugestão após verificar semelhanças, duplicidade e limite de `3` pendentes.
- `POST /api/app/prestador/custom-tags` e `DELETE /api/app/prestador/custom-tags/:tagId`: gerencia até `10` tags livres com moderação automática.
- `GET /api/admin/taxonomy/suggestions`: lista sugestões com prestador, categoria e frequência de pedidos semelhantes.
- `POST /api/admin/taxonomy/suggestions/:id/moderate`: decisões `aprovar_nova | aprovar_sinonimo | mesclar | reprovar | solicitar_correcao`.
- `PATCH /api/admin/taxonomy/tags/:tagId`: moderação humana de tags livres.

### Telas / Componentes
- `ProviderSpecialtiesManager` (integrado ao Onboarding e ao Painel do Prestador `/app/prestador`): seletor de categoria única, autocomplete de especialidades (`1..5`), modal **"Não encontrei minha especialidade"** com busca de semelhanças, painel de status de sugestões e editor de tags livres (`máx. 10`).
- `ProviderProfileScreen` (`/profissionais/[slug]`): exibe apenas categoria oficial, especialidades oficiais verificadas e tags aprovadas (ocultando sugestões pendentes e dados internos de moderação).
- `AdminMonetizationScreen` (`/admin`): seção **7. Moderação de Especialidades Sugeridas & Tags**.

---

## 8. Plano de Testes (`src/services/specialtiesTaxonomy.test.ts`)
Validar todos os 15 cenários obrigatórios:
1. Seleção de categoria e especialidades oficiais (`1..5`).
2. Limite máximo de 5 especialidades oficiais bloqueado.
3. Envio de sugestão de nova especialidade.
4. Bloqueio de limite máximo de 3 sugestões pendentes.
5. Sugestão pendente não aparece no perfil público (`/api/public/providers/:slug`).
6. Sugestão pendente não entra no matching (`POST /api/app/cliente/requests` / busca).
7. Sugestão duplicada / semelhante ou genérica (`"outros"`, `"diversos"`, `"serviços"`) detectada e bloqueada.
8. Sugestão ofensiva, com link/telefone ou promessa de preço bloqueada.
9. Moderação automática de tags livres (bloqueia ofensas/links e não cria categoria nova).
10. Limite máximo de 10 tags livres bloqueado.
11. Administrador aprova sugestão como nova especialidade → entra no catálogo e no perfil do prestador.
12. Administrador reprova sugestão com motivo claro e mescla/aprova como sinônimo.
13. Matching encontra prestador por especialidade oficial e por sinônimo aprovado.
14. Matching encontra prestador por tag aprovada (e ignora tag pendente/reprovada).
15. Auditoria (`audit_logs`) registrada em todas as decisões administrativas.

---

## 9. Riscos e Mitigações
- **Quebra de compatibilidade com os dados de exemplo existentes (`Eletricista`, `Encanador`, `Diarista`):** mitigado mapeando equivalências entre os slugs clássicos e as 10 categorias expandidas nas consultas públicas e de matching.
- **Explosão de termos duplicados por variação ortográfica:** mitigado com `normalizeTaxonomyTerm` (sem acentos, lowercase, singularização básica) e índice `UNIQUE (slug)` em `specialties`.
- **Spam de tags ou contatos externos disfarçados em tags:** mitigado com filtro automático de regex (telefones, `@`, URLs, palavras bloqueadas) e limite rígido de 10 tags por prestador.
