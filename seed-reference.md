# Seed de Referência (`database/seeds/reference/`) — Confiare

O seed de referência contém **apenas dados essenciais de operação da plataforma**, sendo idempotente (`ON CONFLICT DO UPDATE`) e seguro para execução em todos os ambientes, inclusive **produção**.

## Arquivos SQL de Referência

1. [01-categories.sql](file:///e:/Anderson/Confiare/database/seeds/reference/01-categories.sql) — As **10** categorias oficiais (`Elétrica`, `Hidráulica`, `Pintura`, `Diarista e limpeza`, `Ar-condicionado`, `Montagem e móveis`, `Reforma e construção`, `Jardinagem`, `Técnico e informática`, `Mudança e frete`).
2. [02-specialties.sql](file:///e:/Anderson/Confiare/database/seeds/reference/02-specialties.sql) — As **81** especialidades oficiais (`oficial = true`, `criado_por = 'sistema'`) com sinônimos.
3. [03-plans.sql](file:///e:/Anderson/Confiare/database/seeds/reference/03-plans.sql) — Os **5** planos oficiais (`gratuito`, `essencial`, `profissional`, `premium`, `padrinho`) com valores exatos em centavos.
4. [04-platform-settings.sql](file:///e:/Anderson/Confiare/database/seeds/reference/04-platform-settings.sql) — Regras padrão e parâmetros operacionais em `platform_settings` (`demo_mode_default = false`, limites de 5 especialidades / 3 sugestões / 10 tags, modelo sem leilão, LGPD).
5. [05-roles.sql](file:///e:/Anderson/Confiare/database/seeds/reference/05-roles.sql) — Os **4** papéis oficiais (`cliente`, `prestador`, `padrinho`, `admin`) e suas permissões base em `roles`.

## Execução

```bash
npm run seed:reference
```
