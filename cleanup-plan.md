# Plano de Implementação, Separação de Seeds, Modo Demonstração e Limpeza Segura — Confiare

> **Status:** Aguardando aprovação explícita do usuário antes de alterar código ou executar exclusões no banco.

---

## 1. Estrutura de Migrações e Seeds (`database/`)

Criar a organização explícita em `database/`:

```text
database/
├── migrations/                  # Cópias/entradas versionadas + novas migrações (006_platform_settings_and_roles.sql)
└── seeds/
    ├── reference/               # Idempotentes, seguros para TODOS os ambientes (incl. produção)
    │   ├── 01-categories.sql    # 10 categorias oficiais (ON CONFLICT DO UPDATE)
    │   ├── 02-specialties.sql   # 81 especialidades oficiais (ON CONFLICT DO UPDATE)
    │   ├── 03-plans.sql         # 5 planos oficiais + preços em centavos (ON CONFLICT DO UPDATE)
    │   ├── 04-platform-settings.sql # DEMO_MODE default false, limites, regras LGPD e moeda BRL
    │   └── 05-roles.sql         # Papéis oficiais: cliente, prestador, padrinho, admin e permissões
    └── demo/                    # PROIBIDOS em produção; rodam apenas em development/staging/demo + DEMO_MODE=true
        ├── 01-demo-users.sql
        ├── 02-demo-providers.sql
        ├── 03-demo-service-requests.sql
        ├── 04-demo-opportunities.sql
        ├── 05-demo-reviews.sql
        ├── 06-demo-referrals.sql
        ├── 07-demo-subscriptions.sql
        └── 08-demo-ads.sql
```

- Manter compatibilidade com `migrations/` existente (ou espelhar `001..005` + adicionar `006_platform_settings_and_roles.sql`) para não quebrar scripts existentes.
- Criar executor TypeScript separado:
  - `scripts/seed-reference.ts` (`npm run seed:reference`): roda em qualquer ambiente, apenas SQL de `database/seeds/reference/`.
  - `scripts/seed-demo.ts` (`npm run seed:demo`): **aborta com erro fatal** se `NODE_ENV === 'production'` ou `DEMO_MODE !== 'true'`.
- Atualizar `src/db/index.ts` (`ensureSchemaAndSeed()`): **remover** inserção incondicional de `prov-joao`, `prov-carlos`, `prov-ana`, `notif-seed-1` e `ad_slots` de produção; executar apenas DDL + `reference` seed sempre, e opcionalmente dados demo somente se `NODE_ENV !== 'production' && DEMO_MODE === 'true'`.

---

## 2. Modo Demonstração (`DEMO_MODE=true|false`) e Rota `/demo`

### 2.1 Controle por Variável de Ambiente (`DEMO_MODE`)
- Criar módulo compartilhado de configuração de ambiente (`src/config/environment.ts` + endpoint seguro `/api/public/runtime-config` expondo `{ demoMode, nodeEnv }` sem segredos).
- Quando `DEMO_MODE=false` (padrão em produção):
  - `src/App.tsx` não popula estado inicial com `INITIAL_PROVIDERS`, `INITIAL_SERVICE_REQUESTS`, `INITIAL_PROVIDER_OPPORTUNITIES` ou `INITIAL_SUBSTITUTE_REFERRAL` fictícios — consome somente `/api/public/...` reais (ou mostra estado vazio honesto quando não houver prestadores reais).
  - `/encontrar-profissional` e landing `/` não exibem prestadores fictícios.
- Quando `DEMO_MODE=true` (ou na página dedicada `/demo`):
  - Exibir **badge fixo visível**: `"Ambiente de demonstração"`.
  - Bloquear no backend e no frontend: criação de contas reais, envio real de WhatsApp, envio real de e-mail, cobrança/gateway Asaas real e disparo/processamento de webhooks reais.
  - Usar apenas nomes, telefones (`(11) 90000-...`), e-mails (`@demo.confiare.invalid`), documentos fictícios e avatares/imagens placeholders SVG locais (sem URLs externas não licenciadas nem dados reais).

### 2.2 Página `/demo` (Rota Dedicada para Visitantes, Investidores e Prestadores)
- Criar componente dedicado (`src/components/DemoShowcasePage.tsx`) acessível em `/demo` (sem substituir `/`, que continua como landing pública direcionando ao cadastro real).
- Funcionalidades obrigatórias em `/demo`:
  - Badge fixo `"Ambiente de demonstração"`.
  - Botões de troca imediata de perspectiva sem login: **"Ver como cliente"**, **"Ver como prestador"**, **"Ver painel administrativo"**.
  - Simulação interativa ponta a ponta (em memória / sandbox local, zero efeito real em banco/gateway/mensageria):
    1. Solicitação de serviço
    2. Matching com prestadores fictícios identificados
    3. Oportunidade recebida e aceita pelo prestador
    4. Avaliação pós-atendimento e atualização de score
    5. Indicação de substituto rastreável
  - Aviso explícito de zero cobrança real, zero envio de WhatsApp/e-mail e zero dado real.

---

## 3. Proteções Obrigatórias de Produção

1. **Separação explícita de variáveis:** atualizar `.env.example` documentando `NODE_ENV` (`development` | `staging` | `production`), `DEMO_MODE` (`true` | `false`), e URLs distintas (`DATABASE_URL` por ambiente).
2. **Bloqueio de comandos destrutivos:** criar helper central `assertNonProductionDatabaseGuard(operationName)` impedindo seeds de demo, resets, truncates ou suítes de teste (`npm test`) se `NODE_ENV === 'production'`.
3. **Bloqueio de rotas de teste/debug em produção:** proteger `/api/neon/auth` (que hoje cria usuário `@example.com` ao vivo) e afins quando `NODE_ENV === 'production'`.
4. **Chaves somente no servidor:** garantir ausência total de segredos em `VITE_*` e em bundles client.
5. **Auditoria de exclusão em massa:** todo comando de limpeza gera registro estruturado com operador, ambiente, timestamp e contagens por tabela antes/depois.

---

## 4. Plano de Limpeza Segura do Banco Atual

### Critérios de Preservação vs. Exclusão
- **Preservados:**
  - `categories` (10)
  - `specialties` (81 oficiais com `criado_por = 'sistema' AND oficial = true`)
  - `plans` (5)
  - `platform_settings` e `roles` (novas tabelas de referência)
  - `promotional_campaigns` (`camp-lancamento-50-off` — ou confirmação do usuário se deseja zerar ou manter)
  - `neon_auth.jwks` e `neon_auth.project_config`
  - Quaisquer usuários/contas **não-`@example.com`** (caso existam reais no momento da execução)
- **Excluídos (com backup completo obrigatório antes):**
  - 5 especialidades sintéticas de teste (`Iluminacao cenica exclusiva *`)
  - Todos os registros de teste/demo nas 28+ tabelas dependentes na ordem exata de FK (de `ad_clicks` até `users` e `neon_auth."user"` `@example.com`)
  - Os 3 prestadores seed hardcoded (`prov-joao`, `prov-carlos`, `prov-ana`), `ad_slots` seed (`ad-ferramentas-1`, `ad-google-adsense-1`) e `notif-seed-1`
  - Os 5 arquivos de teste/demo/snapshot de teste no bucket S3 `assets` (e limpeza de órfãos que possam existir sem referência)

### Script de Limpeza (`scripts/cleanup-production.ts`)
Fluxo seguro passo a passo:
1. Exigir `NODE_ENV=production` **+** flag explícita `--confirm-production-cleanup` **+** confirmação interativa digitada pelo administrador (ex.: `LIMPAR-PRODUCAO-CONFIARE`).
2. Executar backup completo (`scripts/backup-full-database.ts`) e abortar se não for verificado com sucesso.
3. Contar e exibir prévia (dry-run por padrão sem `--execute`) de exatamente quantas linhas serão removidas e preservadas em cada tabela.
4. Executar exclusão transacional (`BEGIN ... COMMIT`) seguindo a ordem topológica das 32 etapas (incluindo `neon_auth`).
5. Limpar objetos de teste/órfãos no S3 `assets`.
6. Rodar verificação de integridade pós-limpeza (`0` usuários de teste, `0` solicitações/oportunidades/avaliações/assinaturas de teste, `10` categorias, `81` especialidades oficiais, `5` planos, `0` arquivos órfãos) e salvar relatório final (`cleanup-report.md`).

---

## 5. Documentação e Testes Entregáveis (após aprovação)
- Documentos adicionais: `seed-reference.md`, `seed-demo.md`, `demo-mode.md`, `security-checklist.md`, e relatório pós-execução.
- Testes automatizados:
  - Idempotência dos seeds de referência (`10` categorias, `81` especialidades, `5` planos, `platform_settings`, `roles`).
  - Bloqueio rigoroso de seed demo, endpoints de teste e comandos destrutivos quando `NODE_ENV=production`.
  - Comportamento `DEMO_MODE=false` (nenhum dado fictício exposto) vs `DEMO_MODE=true` / rota `/demo` (badge `"Ambiente de demonstração"`, zero efeitos reais em WhatsApp/e-mail/pagamento/webhook).
  - Verificação de `/planos` e cadastro real funcionando após a limpeza.
