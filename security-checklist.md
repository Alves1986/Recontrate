# Checklist de Segurança de Ambientes — Confiare

- [x] `NODE_ENV` explicitamente suportado (`development`, `staging`, `demo`, `production`) em [environment.ts](file:///e:/Anderson/Confiare/src/config/environment.ts).
- [x] `DEMO_MODE` bloqueado quando `NODE_ENV=production` (`isDemoModeEnabled()` retorna `false`).
- [x] Validação `assertDistinctDatabaseUrls()` para impedir reuso de `DATABASE_URL` entre ambientes configurados.
- [x] Bloqueio automático de `seed:demo` em produção (`assertCanRunDemoSeed()` + registro de alerta em `audit_logs`).
- [x] Bloqueio de rotas de criação de usuário teste (`/api/neon/auth`, `/api/neon/verify-all`) quando `NODE_ENV=production`.
- [x] Diretório `backups/` e `.env*` ignorados no [`.gitignore`](file:///e:/Anderson/Confiare/.gitignore); chaves privilegiadas mantidas exclusivamente no servidor.
- [x] Backup completo de todas as tabelas `public` + metadados `neon_auth` + inventário S3 + checksum SHA-256 via `npm run backup:full` antes de qualquer limpeza.
- [ ] Próxima fase (aguardando autorização): página dedicada `/demo`, execução controlada do script de limpeza em produção (`scripts/cleanup-production.ts`) e criação do admin real.
