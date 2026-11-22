# Planos Comerciais Oficiais — Recontrate

> **Regra de Negócio Central:** O Recontrate cobra exclusivamente assinatura mensal/anual fixa do prestador de serviços pelos recursos de visibilidade e gestão de oportunidades. **Comissão sobre serviços = 0%.** Todo orçamento, negociação, pagamento e execução ocorre diretamente entre cliente e profissional, fora da plataforma.

---

## 1. Tabela de Planos Ativos (Fonte Única de Verdade)

| Slug | Nome | Preço Mensal | Preço Anual (10 meses = 2 grátis) | Limite de Oportunidades/Mês | Prioridade de Matching | Destaque | Portfólio | Anúncios no Painel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `gratuito` | **Gratuito** | **R$ 0,00** | **R$ 0,00** | 5/mês | Baixa (`+0`) | Não | Até 5 fotos | Sim (banner contextual NPA=1, máx. 1 por sessão / 3 por dia) |
| `essencial` | **Essencial** | **R$ 29,90** (`2990` centavos) | **R$ 299,00** (`29900` centavos) | 15/mês | Leve (`+2`) | Não | Até 10 fotos | Não |
| `profissional` | **Profissional** | **R$ 59,90** (`5990` centavos) | **R$ 599,00** (`59900` centavos) | 40/mês | Média (`+5`) | Sim (buscas locais) | Ilimitado | Não |
| `premium` | **Premium** | **R$ 99,90** (`9990` centavos) | **R$ 999,00** (`99900` centavos) | 100/mês | Alta (`+8`) | Sim (regional e categoria) | Ilimitado | Não |

---

## 2. Promoção de Lançamento & Programa de Indicação

### 2.1 Promoção de Lançamento (90 dias grátis)
- **Campanha:** `lancamento-50-off-3-meses`
- **Escopo:** Primeira assinatura mensal de novos prestadores nos planos `essencial`, `profissional` ou `premium`.
- **Benefício:** Os **3 primeiros ciclos mensais (90 dias)** têm 100% de desconto (**R$ 0,00**).
- **Transição:** A partir do 4º ciclo mensal passa a vigorar o valor padrão integral do plano escolhido, com notificação prévia enviada por e-mail e WhatsApp antes da transição e cancelamento livre sem multa.
- **Exclusões:** Não acumulável com plano `gratuito`, ciclo `anual` nem múltiplas contas com mesmo e-mail, telefone ou CPF/CNPJ.

### 2.2 Programa de Indicação (Somente Usuários Cadastrados)
- **Regra:** Apenas usuários autenticados podem gerar link ou convidar outros profissionais.
- **Bônus ao Indicador:** **+15 dias grátis** na assinatura a cada profissional indicado que concluir o cadastro e onboarding.
- **Bônus ao Indicado:** **+10 dias grátis extras** para quem se cadastra utilizando um código/link de indicação válido.

---

## 3. Depreciação do Plano Legado `padrinho`

- O plano comercial antigo `padrinho` foi **descontinuado comercialmente**.
- As sementes iniciais (`src/db/index.ts` e `database/seeds/reference/03-plans.sql`) utilizam `ON CONFLICT (slug) DO NOTHING` para jamais sobrescrever preços/limites editados em produção ou staging após o bootstrap inicial, além de garantir que qualquer linha legada `slug = 'padrinho'` permaneça marcada com `ativo = false` (ou removida quando não houver assinaturas históricas vinculadas, preservando integridade referencial).

---

## 4. Direitos do Assinante (CDC art. 31 e art. 49)

- **Transparência de preço total (CDC art. 31):** Exibição explícita do valor total em reais, periodicidade de renovação automática e ausência de taxas ocultas ou multas contratuais.
- **Direito de arrependimento (CDC art. 49):** Cancelamento solicitado em até **7 (sete) dias corridos** a contar da contratação inicial gera **reembolso integral automático** do valor eventualmente pago no ciclo vigente, via gateway Asaas.
- **Cancelamento direto pós-7 dias:** Pode ser feito com 1 clique no painel do prestador (`POST /api/subscriptions/:id/cancel`), mantendo o acesso aos benefícios até o fim do período já pago, sem multa.
