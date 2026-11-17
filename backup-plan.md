# Plano de Backup Obrigatório Pré-Limpeza — Confiare

**Regra absoluta:** Nenhuma exclusão no banco de dados ou no bucket S3 deve ocorrer antes da conclusão e validação do backup completo abaixo.

---

## 1. Estratégia em Duas Camadas (Neon + Snapshot Lógico Completo)

### Camada A — Branch/Snapshot Nativo no Neon (Ponto de Restauração Instantâneo)
Antes de iniciar a limpeza em produção:
1. Criar um branch imutável/ponto de restauração no projeto Neon (ou via `neonctl branches create --name backup-pre-cleanup-YYYYMMDD` / painel Neon / ferramenta MCP `create_branch` antes da janela de limpeza).
2. Anotar `branch_id`, timestamp UTC exato (LSN / PITR Neon) e manter o branch por no mínimo **7 dias** após validação da produção limpa.

### Camada B — Exportação Lógica Completa (`backups/` local protegido + S3 privado)
Como o `createDatabaseBackupSnapshot` atual cobre apenas 6 tabelas, o novo script seguro de backup (`scripts/backup-full-database.ts`) deverá:
1. Consultar dinamicamente todas as **34 tabelas do schema `public`** e metadados não sensíveis de `neon_auth` (`"user"`, `project_config`).
2. Gerar arquivo JSON/SQL versionado com timestamp em diretório local ignorado pelo Git (`backups/pre-cleanup-YYYYMMDD-HHmmss.json`) + checksum SHA-256.
3. Opcionalmente enviar cópia criptografada/privada para o bucket `assets` em prefixo segregado `backups/production/` (não confundir com backups de teste).
4. Registrar inventário completo do bucket S3 (`ListObjectsV2Command`) antes de remover objetos de teste.

---

## 2. Verificação Obrigatória do Backup (Antes da Limpeza)

O script de limpeza deve **recusar continuar** caso qualquer etapa falhe:
- [ ] Arquivo de backup existe e tem tamanho > 0 bytes.
- [ ] Checksum SHA-256 calculado e impresso no log.
- [ ] Contagem de registros no JSON de backup confere 100% com `SELECT COUNT(*)` das 34 tabelas de `public`.
- [ ] Backup contém explicitamente `categories` (10), `specialties` (86 atuais), `plans` (5) e `promotional_campaigns` (1).
- [ ] Inventário de objetos S3 salvo no mesmo manifesto antes da exclusão de arquivos de teste/órfãos.

---

## 3. Procedimento de Restauração (Rollback)

Em caso de necessidade de rollback:
1. **Via Neon Branch / PITR (preferencial, < 1 min):** restaurar a produção para o timestamp/branch anterior (`restore_snapshot` / promover branch de backup).
2. **Via Dump Lógico JSON/SQL:** reexecutar inserção transacional na ordem inversa (pais → filhos: `categories` → `specialties` → `plans` → `users` → `profiles` → `provider_profiles` → tabelas dependentes).
