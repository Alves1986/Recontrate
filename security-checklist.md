# Checklist de Segurança e Conformidade LGPD (`security-checklist.md`)

## 1. Autenticação e Gestão de Sessão (Neon Auth + JWT)
- [ ] Cadastro e login reais por e-mail e senha via **Neon Auth (Managed Better Auth)** (`@neon/auth`).
- [ ] Login social com Google configurado via Neon Auth (`signIn.social({ provider: 'google' })`).
- [ ] Fluxo de recuperação de senha (`/recuperar-senha`) e confirmação de e-mail antes de liberar ações sensíveis.
- [ ] Verificação criptográfica de JWT no backend usando `jose` (`jwtVerify` contra `NEON_AUTH_JWKS_URL`) em todas as rotas `/api/app/*` e `/api/admin/*`.
- [ ] Bloqueio imediato de contas com `status = 'suspenso'` no middleware de autenticação (`403 Conta suspensa`).
- [ ] Suporte a múltiplos papéis por usuário (`roles: ['cliente', 'prestador']`) sem escalonamento de privilégio para `padrinho` ou `admin`.

## 2. Controle de Acesso por Papel (RBAC) e Políticas RLS / Isolamento de Dados
- [ ] Policies de Row Level Security (RLS) habilitadas no PostgreSQL e isolamento estrito por `user_id` nas queries do backend:
  - **Cliente**: acessa exclusivamente seus próprios registros em `service_requests`, `repeat_requests`, `professional_trust_list` e `reviews`.
  - **Prestador**: acessa exclusivamente suas próprias `opportunities`, `provider_profiles`, `subscriptions`, `invoices` e `opportunity_usage`.
  - **Padrinho**: acessa exclusivamente seus apadrinhados vinculados em `mentorships`.
  - **Admin**: acessa dados operacionais, aprovação de cadastros e métricas, sem exposição de chaves secretas.
  - **Visitante Anônimo**: acessa apenas dados públicos de vitrine (`/api/public/providers`, `/api/public/categories`, `/api/plans`).

## 3. Proteção de Dados Pessoais e Consentimento LGPD
- [ ] **Sigilo do Contato do Cliente**: `clientNameFull` e `clientWhatsapp` nunca são enviados ao navegador do prestador enquanto a oportunidade estiver `pendente`, `recusada` ou `expirada`. Só são liberados após `lgpd_contact_consent = true` do cliente **e** aceite formal do prestador (`status = 'aceita'`).
- [ ] **Consentimento para Substituto**: dados do pedido só são compartilhados com profissionais substitutos quando `lgpd_share_consent = true` for autorizado pelo cliente.
- [ ] **Proteção de Documentos de Verificação**: comprovantes de identidade e residência enviados ao **Neon Object Storage** (bucket privado `assets`) nunca têm URL pública; apenas o prestador dono e administradores autorizados podem gerar URL pré-assinada temporária (`expiresIn: 300s`).
- [ ] **Senhas**: jamais armazenadas nas tabelas da aplicação (gerenciadas exclusivamente pelo schema isolado `neon_auth`).

## 4. Proteção de API, Webhooks e Infraestrutura
- [ ] Rate limiting ativo em rotas de autenticação (`/api/auth/*`), criação de conta, abertura de solicitações, checkout (`/api/subscriptions/checkout`) e webhooks (`/api/webhooks/billing`).
- [ ] Validação estrita de entrada com **Zod** e sanitização contra XSS/injeção em todos os campos de texto livre (descrição de solicitação, bio, comentários de avaliação, notas de substituto).
- [ ] Headers de segurança HTTP configurados no Express (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` em HTTPS).
- [ ] Registro automático em `audit_logs` para ações críticas (login, aprovação/rejeição de prestador, liberação de contato, alteração de plano, suspensão de conta, ações administrativas).
- [ ] Nenhum segredo (`DATABASE_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `NEON_REALTIME_SECRET`, `AWS_SECRET_ACCESS_KEY`) exposto no código cliente (`import.meta.env`).
