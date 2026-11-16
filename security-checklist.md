# Checklist de Segurança e Conformidade LGPD (`security-checklist.md`)

## 1. Autenticação e Gestão de Sessão (Neon Auth + JWT)
- [x] Cadastro e login reais por e-mail e senha via **Neon Auth (Managed Better Auth)** (`@neon/auth`, `src/services/authService.ts`, `src/components/AuthPages.tsx`).
- [x] Login social com Google configurado via Neon Auth (`signIn.social({ provider: 'google' })` em `src/components/AuthPages.tsx` e `GET /api/auth/google-url`).
- [x] Fluxo de recuperação de senha (`/recuperar-senha`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`) e confirmação de e-mail (`POST /api/auth/verify-email`) antes de liberar ações sensíveis.
- [x] Verificação criptográfica de JWT no backend usando `jose` (`jwtVerify` contra `NEON_AUTH_JWKS_URL` e sessão assinada Confiare via `src/server/authMiddleware.ts` + `src/services/authService.ts`) em todas as rotas `/api/app/*` e `/api/admin/*`.
- [x] Bloqueio imediato de contas com `status = 'suspenso'` no login e no middleware de autenticação (`403 Conta suspensa`), validado em `src/services/phase1AuthAndRls.test.ts`.
- [x] Suporte a múltiplos papéis por usuário (`roles: ['cliente', 'prestador']` via `POST /api/auth/switch-role`) sem escalonamento de privilégio para `padrinho` ou `admin`.

## 2. Controle de Acesso por Papel (RBAC) e Políticas RLS / Isolamento de Dados
- [x] Policies de Row Level Security (RLS) habilitadas e forçadas (`FORCE ROW LEVEL SECURITY`) em `migrations/001_phase1_production_schema_and_rls.sql` e `migrations/002_phase2_marketplace_rls_and_documents.sql` via role `confiare_rls_user` e `withRlsContext` (`src/db/rls.ts`):
  - **Cliente**: acessa exclusivamente seus próprios registros em `service_requests`, `repeat_requests`, `professional_trust_list` e `reviews`.
  - **Prestador**: acessa exclusivamente suas próprias `opportunities`, `provider_profiles`, `subscriptions`, `invoices` e `opportunity_usage`.
  - **Padrinho**: acessa exclusivamente seus apadrinhados vinculados em `mentorships` (`rls_mentorships_policy`).
  - **Admin**: acessa dados operacionais, aprovação de cadastros (`PATCH /api/admin/providers/:providerId/verify`) e métricas, sem exposição de chaves secretas.
  - **Visitante Anônimo**: acessa apenas dados públicos de vitrine (`/api/public/providers`, `/api/public/categories`, `/api/plans`, `/api/health`).

## 3. Proteção de Dados Pessoais e Consentimento LGPD
- [x] **Sigilo do Contato do Cliente**: `clientNameFull` e `clientWhatsapp` nunca são enviados ao navegador do prestador enquanto a oportunidade estiver `pendente`, `recusada` ou `expirada`. Só são liberados após `lgpd_contact_consent = true` do cliente **e** aceite formal do prestador (`status = 'aceita'`) em `GET /api/app/prestador/opportunities` e `POST /api/app/prestador/opportunities/:id/accept`.
- [x] **Consentimento para Substituto**: dados do pedido em `substitute_referrals` só são visíveis ao prestador substituto sob RLS (`rls_substitute_referrals_policy`) quando `client_consent_shared = true`, validado em `src/services/phase2MarketplaceE2E.test.ts`.
- [x] **Proteção de Documentos de Verificação**: comprovantes enviados ao **Neon Object Storage** (bucket privado `assets`, `visibility = 'private_verification'`) têm acesso restrito via `rls_storage_assets_policy` exclusivamente ao prestador dono e administradores autorizados (`PRESIGNED URL` temporária de 15 minutos em `src/services/marketplaceDataService.ts`).
- [x] **Senhas**: jamais armazenadas nas tabelas da aplicação (`ALTER TABLE users DROP COLUMN IF EXISTS password_hash`; credenciais gerenciadas exclusivamente pelo schema isolado `neon_auth`).

## 4. Proteção de API, Webhooks, Monitoramento, Backups e Infraestrutura
- [x] Rate limiting ativo em rotas de autenticação (`/api/auth/*` via `authRateLimit`), checkout (`/api/subscriptions/checkout`) e webhooks (`/api/webhooks/billing`).
- [x] Validação estrita de entrada com **Zod** e sanitização contra XSS/injeção (`sanitizeUserText`) em todos os campos de texto livre.
- [x] Headers de segurança HTTP e HSTS/HTTPS configurados tanto no Express (`securityHeadersMiddleware` em `src/server/authMiddleware.ts`) quanto no deploy Vercel (`vercel.json`).
- [x] Registro automático em `audit_logs` para ações críticas (login, aprovação/rejeição de prestador, liberação de contato, alteração de plano, suspensão de conta, alertas e snapshots de backup).
- [x] Monitoramento de disponibilidade (`GET /api/health`, `GET /api/admin/system-health`), alertas de falha (`POST /api/admin/monitoring/alerts`) e backups sob demanda/snapshot no Neon Object Storage (`POST /api/admin/backups/snapshot` em `src/services/monitoringAndBackupService.ts`), validados em `src/services/phase3GoLiveReadiness.test.ts`.
- [x] Nenhum segredo (`DATABASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `NEON_REALTIME_SECRET`, `AWS_SECRET_ACCESS_KEY`) exposto no código cliente (`import.meta.env`) ou respostas públicas de API; rotas de diagnóstico `/api/neon/*` protegidas com `requireAdminInProd` em produção.
