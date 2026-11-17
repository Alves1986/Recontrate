# Auditoria Completa de Banco de Dados, Storage e Segurança — Confiare

**Data da auditoria:** 2026-11-16  
**Ambiente inspecionado (atual `.env.local`):** Neon Lakebase PostgreSQL 18.7 (`neondb`, branch `NEON_BRANCH` único configurado localmente)  
**Modo da inspeção:** Somente leitura (nenhum registro foi alterado ou excluído).

---

## 1. Stack Atual do Banco e Serviços Associados

| Camada | Tecnologia / Implementação Observada | Arquivos de Referência |
| :--- | :--- | :--- |
| Banco relacional principal | **PostgreSQL 18.7** (Neon Serverless / Lakebase) | [src/db/index.ts](file:///e:/Anderson/Confiare/src/db/index.ts), [src/db/schema.ts](file:///e:/Anderson/Confiare/src/db/schema.ts) |
| Driver & ORM | `pg` (pools `pool` pooled + `directPool` unpooled para DDL) + `drizzle-orm/node-postgres` + `@neon/functions` | [src/db/index.ts](file:///e:/Anderson/Confiare/src/db/index.ts) |
| Autenticação | **Neon Auth (Managed Better Auth)** no schema `neon_auth` + espelho aplicativo em `public.users` + `public.profiles` + RLS (`confiare_rls_user`) | [src/services/authService.ts](file:///e:/Anderson/Confiare/src/services/authService.ts), [src/db/rls.ts](file:///e:/Anderson/Confiare/src/db/rls.ts) |
| Object Storage | **Neon Object Storage (S3-compatível)** via `files-sdk/neon` / `@aws-sdk/client-s3` — bucket privado `assets` | [neon.ts](file:///e:/Anderson/Confiare/neon.ts), [src/server/neonServices.ts](file:///e:/Anderson/Confiare/src/server/neonServices.ts) |
| Realtime & IA | `@neon/realtime` (`public.realtime_notifications`) e `@neon/ai-sdk-provider` | [src/server/neonServices.ts](file:///e:/Anderson/Confiare/src/server/neonServices.ts) |
| Pagamentos / Mensageria | Integração Asaas (`ASAAS_*`), Resend (`RESEND_API_KEY`), WhatsApp Cloud API (`WHATSAPP_BUSINESS_TOKEN`) | [src/services/billingProvider.ts](file:///e:/Anderson/Confiare/src/services/billingProvider.ts), [src/services/essentialIntegrations.ts](file:///e:/Anderson/Confiare/src/services/essentialIntegrations.ts) |

---

## 2. Inventário Completo de Tabelas e Contagem de Registros

Total identificado no catálogo `information_schema.tables`: **43 tabelas** (**34** no schema `public` e **9** no schema `neon_auth`).

### 2.1 Schema `public` (34 tabelas)

| # | Tabela | Registros Atuais | Classificação | Observação da Auditoria |
| :-: | :--- | :---: | :--- | :--- |
| 1 | `categories` | **10** | **Referência** | Todas as 10 categorias oficiais (`Elétrica` .. `Mudança e frete`). |
| 2 | `specialties` | **86** | **Misto (81 Ref. + 5 Teste)** | 81 oficiais (`criado_por = 'sistema'`) + **5 registros sintéticos de teste** (`Iluminacao cenica exclusiva *`). |
| 3 | `plans` | **5** | **Referência** | `gratuito`, `essencial`, `profissional`, `premium`, `padrinho`. |
| 4 | `promotional_campaigns` | **1** | **Referência / Config.** | `camp-lancamento-50-off` (campanha ativa de lançamento 50% OFF). |
| 5 | `users` | **102** | **100% Teste** | Todos os 102 e-mails terminam em `@example.com` (0 usuários reais). |
| 6 | `profiles` | **102** | **100% Teste** | Vinculados 1:1 aos 102 usuários `@example.com`. |
| 7 | `customer_profiles` | **61** | **100% Teste** | Vinculados aos usuários `@example.com`. |
| 8 | `provider_profiles` | **57** | **54 Teste + 3 Demo** | 3 perfis demo (`prov-joao`, `prov-carlos`, `prov-ana`) + 54 de testes E2E (`prov-launch-*`, `Prestador Taxonomia *`, etc.). **0 reais.** |
| 9 | `provider_specialties` | **30** | **100% Teste** | Vínculos de prestadores de teste. |
| 10 | `provider_custom_tags` | **60** | **100% Teste** | Tags livres inseridas pelos testes de taxonomia. |
| 11 | `specialty_suggestions` | **37** | **100% Teste** | Sugestões enviadas nos testes de moderação. |
| 12 | `provider_services` | **0** | Transacional (vazia) | Sem registros atualmente. |
| 13 | `mentorships` | **0** | Transacional (vazia) | Sem registros atualmente. |
| 14 | `professional_trust_list` | **2** | **100% Teste** | Lista de confiança de testes E2E. |
| 15 | `service_requests` | **6** | **100% Teste** | Solicitações geradas por testes de matching/E2E. |
| 16 | `opportunities` | **19** | **100% Teste** | Oportunidades geradas em testes de limite/E2E. |
| 17 | `service_assignments` | **0** | Transacional (vazia) | Sem registros atualmente. |
| 18 | `reviews` | **2** | **100% Teste** | Avaliações de teste E2E. |
| 19 | `repeat_requests` | **2** | **100% Teste** | Pedidos de recontratação de teste E2E. |
| 20 | `substitute_referrals` | **4** | **100% Teste** | Indicações de substituto de teste E2E. |
| 21 | `subscriptions` | **40** | **100% Teste** | Assinaturas geradas por testes de checkout/webhook/oferta. |
| 22 | `subscription_events` | **84** | **100% Teste** | Eventos das assinaturas de teste. |
| 23 | `invoices` | **42** | **100% Teste** | Faturas das assinaturas de teste. |
| 24 | `opportunity_usage` | **40** | **100% Teste** | Contadores mensais de oportunidades de teste. |
| 25 | `promotional_redemptions` | **6** | **100% Teste** | Resgates da campanha em testes automatizados. |
| 26 | `promotion_eligibility_checks` | **22** | **100% Teste** | Registros de checagem de elegibilidade em testes. |
| 27 | `processed_webhook_events` | **14** | **100% Teste/Logs** | Eventos simulados de webhook de cobrança. |
| 28 | `ad_slots` | **2** | **100% Demo/Seed** | `ad-ferramentas-1` e `ad-google-adsense-1` (banners seed de exemplo). |
| 29 | `ad_impressions` | **12** | **100% Teste/Dev** | Impressões registradas dos `ad_slots` de exemplo. |
| 30 | `ad_clicks` | **0** | Operacional (vazia) | Sem cliques registrados. |
| 31 | `notifications` | **33** | **100% Teste** | Notificações internas geradas em testes. |
| 32 | `realtime_notifications` | **2** | **Demo + Teste** | Inclui `notif-seed-1` (seed demo para `prov-joao`) + 1 registro de teste. |
| 33 | `audit_logs` | **297** | **100% Teste/Logs** | Logs gerados exclusivamente pelas execuções de testes (`user_registered` 102, `email_verified` 69, etc.). |
| 34 | `storage_assets` | **5** | **1 Demo + 4 Teste** | 1 portfólio demo (`prov-joao`), 2 docs privados de teste (`prov-8df90d37`, `prov-dde3438b`), 2 snapshots de teste (`backups/confiare-backup-*.json`). |

> **Lacuna de schema identificada:** As tabelas de referência `platform_settings` e `roles` solicitadas para o novo modelo de referência ainda **não existem** no schema atual e serão criadas via nova migração SQL (`database/migrations/`). A tabela `provider_documents` citada na ordem sugerida corresponde no schema atual a `storage_assets` (com `visibility = 'private_verification'`), portanto o script de limpeza contemplará ambas de forma condicional (`IF EXISTS`).

### 2.2 Schema `neon_auth` (9 tabelas gerenciadas pelo Neon Auth / Better Auth)

| Tabela | Registros Atuais | Observação |
| :--- | :---: | :--- |
| `neon_auth."user"` | **103** | Todos os 103 e-mails são `@example.com` (102 sincronizados + 1 criado por `testAuthService`). **0 usuários reais.** |
| `neon_auth.account` | **103** | Credenciais de teste associadas aos 103 usuários `@example.com`. |
| `neon_auth.session` | **141** | Sessões ativas/expiradas de teste. |
| `neon_auth.jwks` | **1** | Chaves públicas/privadas gerenciadas pelo Neon Auth (**NÃO excluir**). |
| `neon_auth.project_config` | **1** | Configuração do projeto Neon Auth (**NÃO excluir**). |
| `neon_auth.invitation` | **0** | Vazia. |
| `neon_auth.member` | **0** | Vazia. |
| `neon_auth.organization` | **0** | Vazia. |
| `neon_auth.verification` | **0** | Vazia. |

---

## 3. Identificação de Dados de Teste, Fictícios, Duplicados ou Inválidos vs. Dados de Referência

### 3.1 Dados que DEVEM permanecer em produção (Referência)
1. `categories`: **10** categorias oficiais (`eletrica`, `hidraulica`, `pintura`, `diarista-e-limpeza`, `ar-condicionado`, `montagem-e-moveis`, `reforma-e-construcao`, `jardinagem`, `tecnico-e-informatica`, `mudanca-e-frete`).
2. `specialties`: apenas as **81** especialidades oficiais com `criado_por = 'sistema' AND oficial = true`.
3. `plans`: os **5** planos oficiais (`gratuito`, `essencial`, `profissional`, `premium`, `padrinho`).
4. `promotional_campaigns`: campanha oficial `camp-lancamento-50-off` (`lancamento-50-off-3-meses`), se mantida ativa para produção; caso contrário, pode ser pausada/recriada via painel admin.
5. `neon_auth.jwks` e `neon_auth.project_config`: infraestrutura do provedor Neon Auth.
6. Novas tabelas a criar via seed de referência: `platform_settings` e `roles`.

### 3.2 Dados de Teste, Fictícios ou Sintéticos a Remover na Limpeza de Produção
1. **Especialidades sintéticas de teste (`specialties`):** 5 registros criados por testes (`Iluminacao cenica exclusiva ragykn`, `ytkntw`, `ldljns`, `tvvtcs`, `glydmg` — `criado_por <> 'sistema'`).
2. **Usuários e Perfis (`users`, `profiles`, `customer_profiles`, `neon_auth."user"`, `neon_auth.account`, `neon_auth.session`):** todos os 102 usuários em `public` e 103 em `neon_auth` possuem domínio `@example.com` criados por scripts de teste.
3. **Prestadores fictícios e de teste (`provider_profiles`):**
   - 3 registros de demonstração hardcoded em `ensureSchemaAndSeed()`: `prov-joao`, `prov-carlos`, `prov-ana`.
   - 54 registros gerados por suítes de teste (`prov-launch-*`, `prov-abuse-*`, `prov-notice-*`, `Prestador Taxonomia *`, `Marcos Prestador Fase 1`, `rbac.fase1.*`, `Prestador A/B RLS`, `Prestador Dono do Documento`, `Outro Prestador Curioso`, etc.).
4. **Fluxo transacional e assinatura de teste:** todos os registros de `provider_specialties` (30), `provider_custom_tags` (60), `specialty_suggestions` (37), `professional_trust_list` (2), `service_requests` (6), `opportunities` (19), `reviews` (2), `repeat_requests` (2), `substitute_referrals` (4), `subscriptions` (40), `subscription_events` (84), `invoices` (42), `opportunity_usage` (40), `promotional_redemptions` (6), `promotion_eligibility_checks` (22).
5. **Anúncios de exemplo e métricas (`ad_slots`, `ad_impressions`):** 2 slots seed (`ad-ferramentas-1`, `ad-google-adsense-1`) e 12 impressões de dev.
6. **Logs, webhooks, notificações e storage de teste:** `audit_logs` (297), `processed_webhook_events` (14), `notifications` (33), `realtime_notifications` (2), `storage_assets` (5).

### 3.3 Dados Duplicados e Inválidos Identificados
Consultas de integridade realizadas na base atual revelaram:
1. **Duplicidades em `provider_profiles`:**
   - **Nomes profissionais repetidos:** `Marcos Prestador Fase 1` (**5x**), `Prestador A RLS` (**4x**), `Prestador B RLS` (**4x**), `Mestre Eletricista Avaliado` (**2x**), `Outro Prestador Curioso` (**2x**), `Prestador Dono do Documento` (**2x**), `Prestador Original Ocupado` (**2x**), `Prestador Substituto Indicado` (**2x**).
   - **Telefones (`whatsapp`) repetidos em massa:** `(11) 99123-4455` (**18x**), `(11) 99000-0000` (**13x**), `(11) 99111-2233` (**10x**), `(11) 99888-7766` (**5x**).
   - `specialties`: `0` duplicatas normalizadas, porém `5` especialidades sintéticas de teste (`Iluminacao cenica exclusiva *`).
   - `specialty_suggestions`: `0` duplicatas normalizadas entre as `37` sugestões de teste.
2. **Registros inválidos / inconsistentes para produção:**
   - **5** perfis em `provider_profiles` gravados com e-mail no campo `name` (`rbac.fase1.*@example.com`).
   - **11** perfis em `provider_profiles` sem vínculo com usuário (`user_id IS NULL`: `3` demo + `8` sintéticos de testes de campanha).
   - **13** perfis usando telefone placeholder `(11) 99000-0000`.
   - **39** perfis ainda com rótulo de categoria legado (`Eletricista`, `Diarista`) em vez da taxonomia oficial (`Elétrica`, `Diarista e limpeza`).
   - Em `users`: **23** contas com `status = 'pendente_confirmacao'`, **5** `suspenso`, **33** com `email_verified = false`, **49** com `onboarding_completed = false` e **100% (102/102)** usando domínio reservado `@example.com`.
   - Dessincronização de `1` conta entre `neon_auth."user"` (**103**) e `public.users` (**102**), gerada pela chamada ao endpoint diagnóstico `/api/neon/auth`.

> **Observação importante:** O runtime atual em [src/db/index.ts](file:///e:/Anderson/Confiare/src/db/index.ts) (`ensureSchemaAndSeed()`) e em [src/App.tsx](file:///e:/Anderson/Confiare/src/App.tsx) (`INITIAL_PROVIDERS`, `INITIAL_SERVICE_REQUESTS`, `INITIAL_PROVIDER_OPPORTUNITIES`) injeta automaticamente dados de demonstração (`prov-joao`, `prov-carlos`, `prov-ana`, `notif-seed-1`) independentemente do ambiente. Limpar o banco sem antes separar os seeds faria o próprio servidor reinserir os fictícios na inicialização!

---

## 4. Relação de Dependências (Foreign Keys) e Ordem Segura de Exclusão

Consultando `information_schema.table_constraints` e `referential_constraints`, foram mapeadas todas as dependências reais:

- `ad_clicks` / `ad_impressions` → `ad_slots`
- `subscription_events` / `invoices` → `subscriptions`
- `promotional_redemptions` → `promotional_campaigns`, `users` (`SET NULL`), `provider_profiles` / `subscriptions` (lógico)
- `promotion_eligibility_checks` → `promotional_campaigns`, `users` (`SET NULL`)
- `reviews` → `provider_profiles` (`CASCADE`), `service_requests` (`SET NULL`), `users` (`CASCADE`)
- `service_assignments` → `opportunities` (`SET NULL`), `provider_profiles` (`CASCADE`), `service_requests` (`CASCADE`), `users` (`CASCADE`)
- `substitute_referrals` → `provider_profiles` (`CASCADE`), `repeat_requests` (`SET NULL`), `users` (`SET NULL`)
- `opportunities` → `provider_profiles` (`CASCADE`), `service_requests` (`CASCADE`), `users` (`SET NULL`)
- `service_requests` → `categories` (`SET NULL`), `users` (`CASCADE`)
- `repeat_requests` / `professional_trust_list` → `provider_profiles` (`CASCADE`), `users` (`CASCADE`)
- `mentorships` → `provider_profiles` (`CASCADE`)
- `notifications` → `provider_profiles` (`CASCADE`), `users` (`CASCADE`)
- `provider_custom_tags`, `provider_specialties`, `provider_services` → `provider_profiles` (`CASCADE`), `specialties` (`CASCADE`)
- `specialty_suggestions` → `categories` (`CASCADE`), `provider_profiles` (`CASCADE`), `specialties` (`SET NULL`), `users` (`SET NULL`)
- `storage_assets` → `users.verified_by_admin_id` (`SET NULL`)
- `provider_profiles` → `users` (`SET NULL`)
- `customer_profiles`, `profiles`, `audit_logs` → `users`
- `specialties` → `categories` (`CASCADE`)
- `categories.categoria_pai_id` → `categories.id` (`SET NULL`)
- `neon_auth.session` / `neon_auth.account` → `neon_auth."user"`

### Ordem Segura de Exclusão (Filhas → Pais)
1. `ad_clicks`
2. `ad_impressions`
3. `ad_slots` (somente anúncios de teste/demo)
4. `realtime_notifications` e `notifications` (teste/demo)
5. `audit_logs` (referentes a contas/ações de teste)
6. `processed_webhook_events` (eventos de teste)
7. `invoices` (de teste)
8. `subscription_events` (de teste)
9. `subscriptions` (de teste)
10. `opportunity_usage` (de teste)
11. `promotional_redemptions` (de teste)
12. `promotion_eligibility_checks` (de teste)
13. `promotional_campaigns` (**preservar** `camp-lancamento-50-off` se ativa em produção; remover apenas se marcada como teste)
14. `reviews` (de teste)
15. `service_assignments` (de teste)
16. `opportunities` (de teste)
17. `substitute_referrals` (de teste) *(antes de `repeat_requests` devido à FK `repeat_request_id`)*
18. `repeat_requests` (de teste)
19. `service_requests` (de teste)
20. `professional_trust_list` (de teste)
21. `mentorships` (de teste)
22. `provider_custom_tags` (de teste)
23. `provider_specialties` (de teste)
24. `specialty_suggestions` (de teste)
25. `specialties` (somente onde `criado_por <> 'sistema' OR oficial = false` — **nunca** remover as 81 oficiais)
26. `storage_assets` (de teste/demo) e remoção correspondente no S3 bucket `assets`
27. `provider_services` (de teste)
28. `provider_profiles` (de teste/demo: `@example.com` + `prov-joao`, `prov-carlos`, `prov-ana`, `prov-launch-*`, etc.)
29. `customer_profiles` (de usuários de teste)
30. `profiles` (de usuários de teste)
31. `users` (de usuários de teste; preservando contas reais)
32. `neon_auth.session`, `neon_auth.account`, `neon_auth."user"` (correspondentes aos `@example.com` de teste)

---

## 5. Usuários Administradores e Contas de Teste com Senhas Conhecidas

- **Administradores atuais:** **28 contas** com papel `admin`, porém **100% delas (28/28)** são contas sintéticas `@example.com` criadas durante testes automatizados (`Phase 1`, `Phase 2`, `Phase 3`, `Specialties`). **Não há nenhum administrador real cadastrado no banco.**
- **Contas de teste com senhas hardcoded/conhecidas:** Todas as **103 contas** em `neon_auth."user"` (`@example.com`) foram criadas por scripts com senhas conhecidas no repositório (`Confiare#2026!Password` nos testes e `Confiare#2026!SecurePassword` em `src/server/neonServices.ts`). Todas devem ser removidas antes de ir para produção, e **uma conta administradora real** deve ser provisionada fora de testes com senha forte gerada via segredo/env após a limpeza.

---

## 6. Auditoria de Chaves, Tokens, Segredos e Credenciais

1. `.gitignore` bloqueia `.env*` permitindo apenas `.env.example`, e `git ls-files` confirmou que **nenhum `.env` real ou chave privada está versionado no Git**.
2. **Problema crítico de separação de ambientes:**
   - Existe apenas um arquivo `.env.local` local com variáveis `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`, `AWS_*`, `ASAAS_*`, `NEON_REALTIME_SECRET`, sem definição explícita de `NODE_ENV` nem `DEMO_MODE`.
   - Os testes em `package.json` (`npm test`) executam diretamente contra o banco configurado em `.env.local` — se alguém apontar `DATABASE_URL` para produção e rodar `npm test`, poluirá a produção novamente!
   - `vite.config.ts` / `.env.example` expõem apenas prefixos `VITE_` públicos (`VITE_NEON_AUTH_URL`, `VITE_NEON_REALTIME_URL`, `VITE_GOOGLE_ADSENSE_*`); as chaves privilegiadas (`DATABASE_URL`, `AWS_SECRET_ACCESS_KEY`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `NEON_REALTIME_SECRET`) permanecem apenas no backend, mas precisam de validação rígida de `NODE_ENV`.
3. **Endpoints de diagnóstico abertos:** `/api/neon/auth` em `src/server/neonServices.ts` cria usuários `@example.com` ao vivo na base quando acionado — deve ser bloqueado quando `NODE_ENV=production`.

---

## 7. Auditoria de Storage (S3 Bucket `assets` e Estáticos Locais)

- **Bucket S3 `assets` (Neon Object Storage):** Contém **5 objetos** no total, todos correspondentes aos 5 registros em `storage_assets` (**0 objetos órfãos técnicos sem registro**, porém **5/5 pertencem a demo ou teste**):
  1. `portfolio/prov-joao/laudo-1794827693719.json` (131 B — demo `prov-joao`)
  2. `verification-private/prov-8df90d37/certificado_tecnico-1794840612046.txt` (38 B — teste)
  3. `verification-private/prov-dde3438b/certificado_tecnico-1794842966314.txt` (38 B — teste)
  4. `backups/confiare-backup-1794842598847.json` (70.550 B — snapshot criado durante teste)
  5. `backups/confiare-backup-1794842682464.json` (75.063 B — snapshot criado durante teste)
- **Diretório estático `public/assets/aistudio/`:** contém 3 imagens (`IMG_4301_44bea319.jpeg`, `IMG_4302_70417a90.jpeg`, `IMG_4303_4b239f28.jpeg`) e 2 arquivos `.txt` residuais do scaffold AI Studio que não são usados em produção.
- **Lacuna no serviço de backup existente:** `MonitoringAndBackupService.createDatabaseBackupSnapshot` em [src/services/monitoringAndBackupService.ts](file:///e:/Anderson/Confiare/src/services/monitoringAndBackupService.ts) atualmente exporta apenas **6 tabelas** (`plans`, `categories`, `provider_profiles` parcial, `subscriptions`, `invoices`, `audit_logs` limitado a 250). Precisa ser expandido para exportar **todas** as tabelas antes da limpeza.

---

## 8. Planos Resumidos e Riscos/Mitigações

Os detalhes completos de execução estão nos documentos dedicados:
- Plano de Backup: [backup-plan.md](file:///e:/Anderson/Confiare/backup-plan.md)
- Plano de Migração, Seeds, Modo Demo (`/demo`), Proteções e Limpeza: [cleanup-plan.md](file:///e:/Anderson/Confiare/cleanup-plan.md)

### Riscos e Mitigações Principais

| Risco | Impacto | Mitigação |
| :--- | :--- | :--- |
| `ensureSchemaAndSeed()` reinserir `prov-joao`/`carlos`/`ana` após a limpeza | Alto | Separar seed de referência de seed de demo; só rodar demo quando `NODE_ENV` ∈ `{development, staging, demo}` **e** `DEMO_MODE=true`. |
| Exclusão acidental de referências (`categories`, `specialties`, `plans`) | Crítico | Lista explícita de preservação, filtros estritos por padrão de teste (`@example.com` / IDs sintéticos) e checagem pós-limpeza exigindo 10 categorias, 81 especialidades e 5 planos. |
| Frontend continuar exibindo prestadores fictícios em produção (`INITIAL_PROVIDERS`) | Alto | Ocultar dados estáticos de demonstração quando `DEMO_MODE !== true`; carregá-los apenas na rota `/demo` ou com `DEMO_MODE=true`. |
| Desbalanceamento entre `public.users` e `neon_auth."user"` | Médio | Limpar ambas as pontas (`public` e `neon_auth`) dentro da mesma janela controlada, preservando `neon_auth.jwks` e `neon_auth.project_config`. |
| Rodar `npm test` em produção | Crítico | Guardião obrigatório nos testes e scripts destrutivos bloqueando execução se `NODE_ENV === 'production'`. |
