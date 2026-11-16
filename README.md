# Confiare — Marketplace Brasileiro de Serviços Locais de Confiança

Plataforma web (React 19 + TypeScript + Vite + Express + Neon Lakebase PostgreSQL 18 + Neon Auth) que conecta clientes a profissionais autônomos verificados por assinatura mensal previsível, **sem comissão sobre o serviço** e **sem leilão de leads**.

---

## Arquitetura Fase 1 (Produção)

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
- `/app` e `/app/cliente/*` — Painel do Cliente (criação de solicitações persistidas, recontratação e avaliação).
- `/app/prestador` e `/app/prestador/*` — Painel do Prestador (oportunidades compatíveis com sigilo LGPD, reputação composta e assinatura).
- `/app/padrinho` e `/app/padrinho/*` — Painel do Padrinho Verificado (acompanhamento de apadrinhados).
- `/admin` e `/admin/*` — Painel Administrativo (métricas, planos, anúncios moderados e logs de auditoria).

Redirecionamento automático pós-login conforme o papel ativo:
- `cliente` → `/app`
- `prestador` → `/app/prestador`
- `padrinho` → `/app/padrinho`
- `admin` → `/admin`

---

### 2. Banco de Dados de Produção e Row Level Security (RLS)

O sistema utiliza o **Neon Lakebase PostgreSQL 18** (`fancy-field-77458599`, branch `production`), com migrações seguras em [`migrations/001_phase1_production_schema_and_rls.sql`](file:///e:/Anderson/Confiare/migrations/001_phase1_production_schema_and_rls.sql):

- **Tabelas implementadas**: `users` (sem armazenar senhas na aplicação; credenciais ficam isoladas no schema `neon_auth`), `profiles`, `customer_profiles`, `provider_profiles`, `categories`, `provider_services`, `service_requests`, `opportunities`, `service_assignments`, `reviews`, `professional_trust_list`, `repeat_requests`, `substitute_referrals`, `mentorships`, `plans`, `subscriptions`, `subscription_events`, `invoices`, `opportunity_usage`, `processed_webhook_events`, `ad_slots`, `ad_impressions`, `ad_clicks`, `notifications`, `realtime_notifications`, `storage_assets`, `audit_logs`.
- **Row Level Security (RLS)**: habilitado e forçado (`FORCE ROW LEVEL SECURITY`) com políticas baseadas em `app.current_user_id`, `app.current_user_role` e `app.current_provider_id` via `withRlsContext` ([`src/db/rls.ts`](file:///e:/Anderson/Confiare/src/db/rls.ts)).

---

## Como Executar Localmente

1. Configure as variáveis de ambiente em `.env.local` (veja [`.env.example`](file:///e:/Anderson/Confiare/.env.example)).
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento (Frontend + API Express na porta `3000`):
   ```bash
   npm run dev
   ```
4. Para gerar o build de produção:
   ```bash
   npm run build
   ```

---

## Testes Automatizados

Para rodar os testes de **login, cadastro, recuperação de senha, proteção de rotas, papéis, RLS e bloqueio de acesso indevido**:

```bash
npx tsx --test src/services/phase1AuthAndRls.test.ts
```

Para rodar toda a suíte do projeto:

```bash
npm test
```
