# Confiare — Marketplace Brasileiro de Serviços Locais de Confiança

Plataforma web (React 19 + TypeScript + Vite + Express + Neon Lakebase PostgreSQL 18 + Neon Auth + Neon Object Storage + Asaas API v3) que conecta clientes a profissionais autônomos verificados por assinatura mensal previsível, **sem comissão sobre o serviço** e **sem leilão de leads**.

---

## Arquitetura de Produção (Fase 1 & Fase 2 Concluídas)

### 1. Separação entre Área Pública e Área Autenticada

#### Área Pública (Acessível sem login)
- `/` — Landing Page de captação (Hero, busca local, categorias populares, faixa de confiança, como funciona em 3 passos, recompra em 1 clique, indicação de substituto, vitrine, seção do prestador, FAQ, CTA duplo e footer).
- `/para-prestadores` — Página dedicada à captação de profissionais autônomos.
- `/como-funciona` — Explicação do fluxo de confiança e recontratação.
- `/planos` — Comparativo transparente dos 5 planos de assinatura.
- `/encontrar-profissional` — Busca pública de profissionais por categoria e bairro.
- `/profissionais/:slug` — Vitrine pública do prestador com Nota Composta e portfólio.
- `/entrar` — Login por e-mail/senha e Login Social com Google (Neon Auth).
- `/criar-conta` — Cadastro com escolha de papel (`Sou cliente`, `Sou prestador` ou ambos na mesma conta) e confirmação de e-mail.
- `/recuperar-senha` — Fluxo completo de recuperação e redefinição de senha.
- `/termos` e `/privacidade` — Governança jurídica e Política de Privacidade LGPD.

#### Área Autenticada (Exige login + Protegida por Middleware JWT/RBAC e RLS)
- `/app/onboarding` — Onboarding obrigatório após o primeiro login.
- `/app` e `/app/cliente/*` — Painel do Cliente (criação de solicitações persistidas com disparo automático de oportunidades compatíveis, recontratação em 1 clique e avaliação pós-atendimento com atualização real da Nota Composta).
- `/app/prestador` e `/app/prestador/*` — Painel do Prestador (oportunidades compatíveis com sigilo LGPD até aceite, indicação de até 2 substitutos com consentimento do cliente, upload de documentos privados de verificação no bucket `assets` e gestão de assinatura Asaas).
- `/app/padrinho` e `/app/padrinho/*` — Painel do Padrinho Verificado (geração de código de mentoria e acompanhamento de apadrinhados protegidos por RLS).
- `/admin` e `/admin/*` — Painel Administrativo (curadoria e aprovação de cadastros/documentos de prestadores, métricas MRR/ARR/Churn, CRUD de planos/anúncios moderados e logs de auditoria).

Redirecionamento automático pós-login conforme o papel ativo:
- `cliente` → `/app`
- `prestador` → `/app/prestador`
- `padrinho` → `/app/padrinho`
- `admin` → `/admin`

---

### 2. Banco de Dados de Produção e Row Level Security (RLS)

O sistema utiliza o **Neon Lakebase PostgreSQL 18** (`fancy-field-77458599`, branch `production`), com migrações seguras em:
- [`migrations/001_phase1_production_schema_and_rls.sql`](file:///e:/Anderson/Confiare/migrations/001_phase1_production_schema_and_rls.sql)
- [`migrations/002_phase2_marketplace_rls_and_documents.sql`](file:///e:/Anderson/Confiare/migrations/002_phase2_marketplace_rls_and_documents.sql)

- **Tabelas implementadas**: `users` (sem armazenar senhas na aplicação; credenciais ficam isoladas no schema `neon_auth`), `profiles`, `customer_profiles`, `provider_profiles`, `categories`, `provider_services`, `service_requests`, `opportunities`, `service_assignments`, `reviews`, `professional_trust_list`, `repeat_requests`, `substitute_referrals`, `mentorships`, `plans`, `subscriptions`, `subscription_events`, `invoices`, `opportunity_usage`, `processed_webhook_events`, `ad_slots`, `ad_impressions`, `ad_clicks`, `notifications`, `realtime_notifications`, `storage_assets`, `audit_logs`.
- **Row Level Security (RLS)**: habilitado e forçado (`FORCE ROW LEVEL SECURITY`) em todas as tabelas sensíveis (`customer_profiles`, `service_requests`, `opportunities`, `reviews`, `professional_trust_list`, `repeat_requests`, `substitute_referrals`, `service_assignments`, `mentorships`, `notifications`, `storage_assets`, `audit_logs`), com execução transacional via `withRlsContext` ([`src/db/rls.ts`](file:///e:/Anderson/Confiare/src/db/rls.ts)).

---

### 3. Integrações Essenciais (Fase 2)

Implementadas em [`src/services/essentialIntegrations.ts`](file:///e:/Anderson/Confiare/src/services/essentialIntegrations.ts):
1. **E-mail Transacional (`TransactionalEmailService`)**: confirmação de cadastro, recuperação de senha e avisos de aprovação/oportunidades (compatível com Resend API via `RESEND_API_KEY` + outbox auditável em `audit_logs`).
2. **WhatsApp Business Cloud API (`WhatsAppBusinessService`)**: disparo de templates para novas oportunidades compatíveis, recontratação em 1 clique e indicação de substituto (via `WHATSAPP_BUSINESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID`).
3. **Geocodificação & Raio de Atendimento (`GeolocationRadiusService`)**: cálculo de distância Haversine (`calculateHaversineDistanceKm`) por coordenadas de bairros e integração opcional com Google Maps Geocoding API (`GOOGLE_MAPS_API_KEY`).
4. **Gateway de Assinaturas (`AsaasBillingAdapter`)**: cobrança recorrente PIX/Cartão/Boleto e webhook idempotente (`POST /api/webhooks/asaas`).

---

## Como Executar Localmente e Fazer Deploy

1. Configure as variáveis de ambiente em `.env.local` (veja [`.env.example`](file:///e:/Anderson/Confiare/.env.example)).
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento (Frontend + API Express na porta `3000`):
   ```bash
   npm run dev
   ```
4. Para gerar o build de produção (validado com [`vercel.json`](file:///e:/Anderson/Confiare/vercel.json) contendo HSTS/HTTPS e headers de segurança):
   ```bash
   npm run build
   ```

---

## Testes Automatizados (Fase 1 + Fase 2 + Monetização + Anúncios)

- **Fase 1 (Auth, RBAC, Recuperação de Senha, Proteção de Rotas e RLS)**:
  ```bash
  npx tsx --test src/services/phase1AuthAndRls.test.ts
  ```
- **Fase 2 (Fluxo Completo do Marketplace, Matching com Raio, Avaliações, Recontratação, Substituto com Consentimento LGPD, Documentos Privados e Curadoria Admin)**:
  ```bash
  npx tsx --test src/services/phase2MarketplaceE2E.test.ts
  ```
- **Suíte Completa**:
  ```bash
  npm test
  ```
