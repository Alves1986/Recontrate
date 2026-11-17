# Modo Demonstração (`DEMO_MODE`) — Confiare

Controlado por [environment.ts](file:///e:/Anderson/Confiare/src/config/environment.ts) com a variável `DEMO_MODE`.

## Comportamento

- **`DEMO_MODE=false` (padrão em produção):**
  - Nenhum dado fictício é carregado em `ensureSchemaAndSeed()` ou no estado inicial de [App.tsx](file:///e:/Anderson/Confiare/src/App.tsx).
  - `/api/public/providers` oculta registros legados/demo de sementes antigas.
  - Criação de contas reais, e-mail, WhatsApp, cobrança e webhooks operam normalmente conforme configuração do ambiente.

- **`DEMO_MODE=true` (somente quando `NODE_ENV !== 'production'`):**
  - O frontend exibe o banner/badge fixo: **`Ambiente de demonstração`**.
  - Bloqueios obrigatórios ativos no servidor:
    - `POST /api/auth/register` bloqueia criação de contas reais (`403`).
    - `POST /api/subscriptions/checkout`, `upgrade`, `downgrade`, `cancel` bloqueiam cobranças e gateway real (`403`).
    - `POST /api/webhooks/billing` bloqueia processamento de webhooks reais (`403`).
    - [essentialIntegrations.ts](file:///e:/Anderson/Confiare/src/services/essentialIntegrations.ts) suprime chamadas externas à API do Resend e da Meta WhatsApp Cloud API.
