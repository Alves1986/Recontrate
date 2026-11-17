# Seed de Demonstração (`database/seeds/demo/`) — Confiare

O seed de demonstração contém **exclusivamente dados fictícios** (`@demo.confiare.invalid`, telefones `(11) 90000-...`, placeholders locais `/icons/icon.svg`), sendo **estritamente bloqueado em produção**.

## Condições Obrigatórias de Execução

- `NODE_ENV` deve ser `development`, `staging` ou `demo` (**nunca** `production`).
- `DEMO_MODE` deve estar explicitamente definido como `"true"`.
- Se alguém tentar rodar em produção, [seed-demo.ts](file:///e:/Anderson/Confiare/scripts/seed-demo.ts) registra alerta em `audit_logs` (`blocked_demo_seed_in_production`) e aborta imediatamente.

## Arquivos SQL de Demonstração

1. [01-demo-users.sql](file:///e:/Anderson/Confiare/database/seeds/demo/01-demo-users.sql) — Usuários e clientes fictícios.
2. [02-demo-providers.sql](file:///e:/Anderson/Confiare/database/seeds/demo/02-demo-providers.sql) — Prestadores fictícios (`demo-prov-*`) e especialidades vinculadas.
3. [03-demo-service-requests.sql](file:///e:/Anderson/Confiare/database/seeds/demo/03-demo-service-requests.sql) — Solicitações de demonstração.
4. [04-demo-opportunities.sql](file:///e:/Anderson/Confiare/database/seeds/demo/04-demo-opportunities.sql) — Oportunidades fictícias sem contato real.
5. [05-demo-reviews.sql](file:///e:/Anderson/Confiare/database/seeds/demo/05-demo-reviews.sql) — Avaliações e lista de confiança fictícias.
6. [06-demo-referrals.sql](file:///e:/Anderson/Confiare/database/seeds/demo/06-demo-referrals.sql) — Recontratação e indicação de substituto fictícias.
7. [07-demo-subscriptions.sql](file:///e:/Anderson/Confiare/database/seeds/demo/07-demo-subscriptions.sql) — Assinatura, fatura e uso de exemplo.
8. [08-demo-ads.sql](file:///e:/Anderson/Confiare/database/seeds/demo/08-demo-ads.sql) — Banner placeholder e notificação demo.

## Execução

```bash
NODE_ENV=demo DEMO_MODE=true npm run seed:demo
```
