# Plano de Implementação — Módulo de Valores, Planos e Página de Preços (`/planos`) (`pricing-implementation-plan.md`)

> [!IMPORTANT]
> **Diagnóstico Atual:** Em [`src/App.tsx`](file:///e:/Anderson/Confiare/src/App.tsx#L431-L433), a rota `/planos` está renderizando `<ForProvidersPage />` (a mesma página de `/para-prestadores`). A infraestrutura de banco de dados (`plans`, `subscriptions`, `invoices`, `opportunity_usage`, `processed_webhook_events`), gateway Asaas e ciclo de vida já existe no backend, portanto a implementação focará em **criar a página pública dedicada `/planos`**, seus componentes modulares (`BillingCycleToggle`, `PlanCard`, `PlansComparisonTable`), completar os metadados de exibição/confirmação por e-mail/WhatsApp e adicionar os testes faltantes sem impactar outras áreas.

---

## 1. Estrutura de Dados

### Tabelas Envolvidas (Neon Lakebase PostgreSQL 18)
1. **`plans`** ([`src/db/schema.ts`](file:///e:/Anderson/Confiare/src/db/schema.ts)):
   - `id` (TEXT PK), `slug` (TEXT UNIQUE: `gratuito | essencial | profissional | premium | padrinho`), `nome`, `descricao`
   - `preco_mensal_centavos` (`INTEGER NOT NULL`, BRL em centavos)
   - `preco_anual_centavos` (`INTEGER NOT NULL`, BRL em centavos = 10x mensal)
   - `limite_oportunidades_mensal` (`INTEGER NOT NULL`)
   - `prioridade_matching` (`INTEGER NOT NULL`)
   - `permite_destaque` (`BOOLEAN`), `permite_relatorios_avancados` (`BOOLEAN`), `permite_portfolio_ilimitado` (`BOOLEAN`), `exibe_anuncios` (`BOOLEAN`), `ativo` (`BOOLEAN`), `ordem_exibicao` (`INTEGER`)
   - **Novas colunas (Migração `003_plans_display_metadata.sql`)**:
     - `selo` (`TEXT`, ex.: `null`, `'Essencial'`, `'Profissional Confiare'`, `'Top Confiare'`, `'Padrinho Verificado'`)
     - `suporte_prioritario` (`BOOLEAN NOT NULL DEFAULT FALSE`)
     - `limite_fotos_portfolio` (`INTEGER`, `5` para Gratuito, `10` para Essencial, `null` para ilimitado)
     - `prioridade_label` (`TEXT`, `'Baixa' | 'Leve' | 'Média' | 'Alta'`)
2. **`subscriptions`**: `id`, `provider_profile_id`, `plan_id`, `scheduled_plan_id`, `status` (`trial | ativa | pendente | inadimplente | cancelada | expirada`), `ciclo` (`mensal | anual`), `inicio`, `fim`, `proxima_cobranca`, `tolerancia_ate`, `gateway_subscription_id`, `gateway_customer_id`, `cancelada_em`, `motivo_cancelamento`.
3. **`invoices`**: `id`, `subscription_id`, `valor_centavos`, `status`, `metodo` (`pix | cartao | boleto`), `vencimento`, `pago_em`, `gateway_invoice_id`, `url_checkout`.
4. **`opportunity_usage`**: `id`, `provider_profile_id`, `subscription_id`, `periodo_inicio`, `periodo_fim`, `oportunidades_utilizadas`.
5. **`processed_webhook_events`** e **`subscription_events`**: auditoria e idempotência de webhooks.

---

## 2. Valores Oficiais em Centavos (BRL — Inteiros, Sem Float)

| Plano | Slug | Mensal (`centavos`) | Anual (`centavos`, 10 meses) | Equivalente Mensal no Anual | Economia Anual | Limite/Mês | Prioridade | Anúncios | Selo |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Gratuito** | `gratuito` | `0` (R\$ 0,00) | `0` (R\$ 0,00) | R\$ 0,00/mês | R\$ 0,00 | 5 | Baixa (`0`) | `true` | Nenhum |
| **Essencial** | `essencial` | `2990` (R\$ 29,90) | `29900` (R\$ 299,00) | R\$ 24,92/mês | R\$ 59,80 | 15 | Leve (`2`) | `false` | `"Essencial"` |
| **Profissional** | `profissional` | `5990` (R\$ 59,90) | `59900` (R\$ 599,00) | R\$ 49,92/mês | R\$ 119,80 | 40 | Média (`5`) | `false` | `"Profissional Confiare"` |
| **Premium** | `premium` | `9990` (R\$ 99,90) | `99900` (R\$ 999,00) | R\$ 83,25/mês | R\$ 199,80 | 100 | Alta (`8`) | `false` | `"Top Confiare"` |
| **Padrinho** | `padrinho` | `9990` (R\$ 99,90) | `99900` (R\$ 999,00) | R\$ 83,25/mês | R\$ 199,80 | 100 | Alta (`9`) | `false` | `"Padrinho Verificado"` |

> **Regra de proteção de preço:** alterações feitas pelo administrador em `PATCH /api/admin/plans/:id` atualizam a tabela `plans` para novas assinaturas e renovações futuras; assinaturas ativas preservam o ciclo já contratado até `proxima_cobranca`.

---

## 3. Fluxo de Checkout (`/planos` → `/api/subscriptions/checkout`)

1. **Visitante não autenticado** (ou usuário sem papel `prestador`):
   - Clicar em `"Começar grátis"`, `"Assinar Essencial"`, `"Assinar Profissional"`, `"Assinar Premium"` ou `"Tornar-me Padrinho"` redireciona para `/criar-conta?role=prestador&plan=<slug>&cycle=<mensal|anual>`.
2. **Prestador autenticado sem assinatura paga ativa**:
   - Aciona `POST /api/subscriptions/checkout` informando `providerProfileId`, `planSlug`, `cycle` (`mensal` | `anual`) e `paymentMethod` (`pix` | `cartao` | `boleto`).
   - Backend cria cliente e assinatura no **Asaas (`AsaasBillingAdapter`)**, grava `subscriptions` (`pendente` ou `ativa` para Gratuito) e `invoices` (`pendente`), retornando `urlCheckout`.
3. **Prestador autenticado com assinatura ativa**:
   - A página `/planos` identifica e destaca o **plano atual**, exibindo ações contextuais de **Upgrade**, **Downgrade** ou **Cancelamento**.

---

## 4. Fluxo de Webhook (`POST /api/webhooks/billing`)

1. Lê o corpo bruto (`express.raw`) e valida o token secreto (`asaas-access-token` / `ASAAS_WEBHOOK_TOKEN`).
2. Verifica idempotência em `processed_webhook_events` (`event_id` único).
3. Ao receber confirmação de pagamento (`PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED`):
   - Marca a fatura em `invoices` como `paga` com `pago_em`.
   - Ativa a assinatura (`status = 'ativa'`), define `inicio`, `fim` (`+30 dias` se mensal ou `+1 ano` se anual) e `proxima_cobranca`.
   - Atualiza `provider_profiles.plan_slug`.
   - Cria/reinicia o contador do ciclo em `opportunity_usage` (`oportunidades_utilizadas = 0`).
   - **Dispara confirmação por E-mail (`TransactionalEmailService`) e WhatsApp (`WhatsAppBusinessService`)** informando o plano ativo, ciclo e data da próxima renovação.

---

## 5. Regras de Upgrade, Downgrade, Cancelamento e Inadimplência

- **Upgrade:** troca imediata de plano/limite com cálculo proporcional (`calculateProRataUpgradeCents`) do saldo restante do ciclo atual; registra evento em `subscription_events` e atualiza o limite de oportunidades imediatamente.
- **Downgrade:** agenda `scheduled_plan_id` para entrar em vigor apenas na próxima renovação, mantendo todos os benefícios já pagos até o fim do ciclo vigente.
- **Cancelamento:** altera status para `cancelada`, registra `cancelada_em` e `motivo_cancelamento`, e **mantém acesso integral até `fim`** do período já pago.
- **Inadimplência:** falha de pagamento altera para `inadimplente` com **7 dias de tolerância** (`tolerancia_ate = now + 7 dias`). Após expirar a tolerância (`processGracePeriodExpirations`), rebaixa automaticamente para o plano **Gratuito** (`gratuito`, `5 oportunidades/mês`), **sem nunca excluir perfil, avaliações, portfólio ou histórico do prestador**.

---

## 6. Layout da Página `/planos` (`src/components/PlansPricingPage.tsx`)

1. **Roteamento Dedicado:** em [`src/App.tsx`](file:///e:/Anderson/Confiare/src/App.tsx), desacoplar `/planos` de `<ForProvidersPage />` para renderizar `<PlansPricingPage />` (consumindo `GET /api/plans`).
2. **Cabeçalho de Preços:**
   - Título: *"Escolha o plano ideal para crescer com a Confiare"*
   - Subtítulo: *"Receba oportunidades compatíveis, construa reputação e apareça para clientes da sua região."*
   - Aviso de destaque: *"A Confiare não cobra comissão sobre o valor do seu serviço."*
3. **Componente `BillingCycleToggle`:**
   - Botões `"Mensal"` e `"Anual — economize 2 meses"`.
   - No modo **Anual**, exibe valor anual total, equivalente mensal em destaque (ex.: Profissional `R$ 599,00/ano` → `R$ 49,92/mês`) e economia exata no ano (`Economize R$ 119,80/ano`).
   - No modo **Mensal**, exibe apenas o valor mensal e a garantia de *"Cancele a qualquer momento"*.
4. **Cards dos 5 Planos (`PlanCard`):**
   - Ordem obrigatória: `Gratuito` → `Essencial` → `Profissional` (destaque visual **"Mais escolhido"**) → `Premium` → `Padrinho` (identificado como opção avançada de mentoria).
   - Preço sempre visível acima da dobra; responsivo em carrossel horizontal / cards verticais no mobile.
   - Textos e CTAs exatamente conforme especificação (`"Começar grátis"`, `"Assinar Essencial"`, `"Assinar Profissional"`, `"Assinar Premium"`, `"Tornar-me Padrinho"`).
5. **Tabela Comparativa de Recursos (`PlansComparisonTable`):**
   - 12 linhas obrigatórias:
     1. Oportunidades por mês
     2. Prioridade no matching
     3. Perfil profissional
     4. Portfólio
     5. Destaque local
     6. Relatórios
     7. Suporte
     8. Anúncios
     9. Selo
     10. Ferramentas de indicação
     11. Preço mensal
     12. Preço anual
6. **FAQ de Cobrança, Cancelamento, Limite e Anúncios.**

---

## 7. Lista de Testes Obrigatórios

- Valores exatos em centavos (inteiros, sem float) para todos os 5 planos.
- Limites mensais corretos por plano (`5`, `15`, `40`, `100`, `100`).
- Helper de cálculo e formatação do toggle Mensal/Anual: equivalente mensal do plano anual e cálculo exato da economia anual (`(mensal * 12) - anual`).
- Criação de assinatura mensal e criação de assinatura anual (próxima cobrança `+30 dias` vs `+1 ano`).
- Renovação no prazo correto e reinício do contador de `opportunity_usage`.
- Cancelamento mantendo acesso até o fim do período pago.
- Falha de pagamento com 7 dias de tolerância e rebaixamento automático para Gratuito após tolerância (sem excluir dados).
- Bloqueio de novas oportunidades ao atingir o limite mensal sem bloquear o perfil.
- Exibição de anúncios moderados **somente** para prestadores do plano Gratuito e **nunca** no fluxo do cliente.
- Confirmação de assinatura por e-mail e WhatsApp após webhook confirmado.

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
| :--- | :--- |
| Alterar `/planos` afetar links vindos de `/para-prestadores` | Manter `/para-prestadores` com botão apontando para `/planos`, e validar ambos os caminhos em [`src/App.tsx`](file:///e:/Anderson/Confiare/src/App.tsx). |
| Divergência entre valores exibidos no frontend e valores configurados pelo Admin | Fazer `PlansPricingPage` consumir dinamicamente `GET /api/plans` do PostgreSQL, usando helper puro (`src/utils/pricingCalculations.ts`) para formatar centavos, equivalente mensal e economia anual. |
| Disputas de preço após ajuste administrativo | Manter o valor contratado vinculado ao ciclo ativo em `invoices` / `subscriptions` até a data de `proxima_cobranca`. |
| Erro de arredondamento em centavos | Armazenar e operar exclusivamente com inteiros (`Math.round` apenas para exibição do equivalente mensal anual `precoAnualCentavos / 12`). |

---

**Aguardando sua aprovação para iniciar a implementação deste plano.**
