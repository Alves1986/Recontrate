# Plano de Migração do Protótipo para Produção (`migration-plan.md`)

## 1. Princípios da Migração

1. **Preservação Integral dos Fluxos Validados**:
   - Nenhuma regra de negócio validada no protótipo (Nota Composta de 5 critérios, Matching Justo sem leilão, Recontratação em 1 clique, Indicação de até 2 substitutos de confiança, Apadrinhamento verificado, 5 Planos sem comissão com Asaas e Anúncios Moderados no plano Gratuito) será descartada.
2. **Separação Estrita entre Dados de Desenvolvimento e Produção**:
   - Os dados de `src/data/seedData.ts` serão migrados para um script de seed controlado por ambiente (`NODE_ENV === 'development' || NODE_ENV === 'test'`).
   - Em `NODE_ENV === 'production'`, apenas as tabelas estruturais (`plans` e `categories`) recebem seed inicial; nenhum cliente, prestador, pedido ou avaliação fictícia é inserido em produção.
3. **Separação Clara entre Área Pública (Captação) e Área Autenticada (Operação)**:
   - Remoção da barra `"Fluxos do Protótipo"` e dos seletores de alternância de visão/profissional que existiam apenas para demonstração.
   - Implementação de roteamento real por URL com proteção por middleware de sessão e papel (`cliente`, `prestador`, `padrinho`, `admin`).

---

## 2. Mapa de Migração de Rotas e Telas

| Tela Atual no Protótipo (`ScreenId`) | Destino na Nova Arquitetura | Tipo de Acesso | Mudança Principal |
| :--- | :--- | :--- | :--- |
| `home` (`HomeScreen.tsx`) | `/` (Landing Page Pública) + `/como-funciona` + `/planos` | Público | Remove o mapa de 9 telas do protótipo; adiciona seções de Como Funciona em 3 passos, Recompra, Substituto, Prestador, Depoimentos, FAQ, CTA duplo e Footer completo. |
| Nova página dedicada | `/para-prestadores` | Público | Foco em aumentar faturamento, oportunidades compatíveis, reputação, busca local, assinatura previsível sem leilão e CTA `"Quero receber clientes"`. |
| `profissionais-compativeis` | `/encontrar-profissional` | Público (Busca) / Autenticado (Solicitação) | Busca no PostgreSQL com índices por categoria, cidade e bairro. |
| `perfil-prestador` | `/profissionais/[slug]` | Público | Vitrine pública SEO-friendly por slug sem `<select>` de protótipo; oculta WhatsApp até consentimento/solicitação autenticada. |
| Novas telas de Autenticação | `/entrar`, `/criar-conta`, `/recuperar-senha` | Público | Integradas ao **Neon Auth (Managed Better Auth)** com e-mail/senha, login Google, confirmação de e-mail e onboarding obrigatório. |
| Novas páginas institucionais | `/termos`, `/privacidade` | Público | Termos de Uso (0% comissão, autonomia do prestador) e Política de Privacidade LGPD. |
| `cadastro-cliente` / `criar-solicitacao` / `solicitar-novamente` / `avaliacao-pos-atendimento` | `/app` e `/app/cliente/*` | Privado (`cliente`) | Persistência real em `customer_profiles`, `service_requests`, `repeat_requests`, `reviews` e `professional_trust_list`. |
| `cadastro-prestador` / `painel-prestador` / `indicacao-substituto` | `/app/prestador/*` | Privado (`prestador`) | Persistência real em `provider_profiles`, `opportunities`, `substitute_referrals`, upload seguro no bucket `assets` e assinatura Asaas. |
| Nova área de Mentoria | `/app/padrinho/*` | Privado (`padrinho`) | Gestão de código de padrinho, acompanhamento de apadrinhados (`mentorships`) e indicações. |
| `painel-admin` (`AdminMonetizationScreen.tsx`) | `/admin/*` | Privado (`admin`) | Aprovação de cadastros/documentos de prestadores, métricas de MRR/ARR/Churn, CRUD de planos/anúncios e logs de auditoria (`audit_logs`). |

---

## 3. Padronização de Componentes e Estados de UI

- **Componentes Reutilizáveis Extraídos**:
  - `PublicHeader` e `PublicFooter` (para todas as rotas públicas).
  - `AuthenticatedShell` (barra de navegação autenticada com seletor de papel quando o usuário é `cliente` e `prestador` ao mesmo tempo, e botão de Logout seguro).
  - `ProtectedRoute` (guard de rota no cliente + validação de sessão `/api/auth/me` com redirecionamento para `/entrar` ou `/app/onboarding`).
  - `UiStateFeedback` (estados padronizados de `LoadingSkeleton`, `EmptyState`, `ErrorBanner` e `SuccessToast`).
