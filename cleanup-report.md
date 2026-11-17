# Relatório Final de Limpeza do Banco de Produção — Confiare

- **Data/Hora (UTC):** 2026-11-16T21:45:36.426Z
- **Ambiente:** `development`
- **Backup Pré-Limpeza ID:** `full-backup-1794865508940`
- **Arquivo de Backup Local:** `E:\Anderson\Confiare\backups\confiare-backup-2026-11-16T21-45-08-939Z.json`
- **Checksum SHA-256:** `fbb4639db68dfd68dad102287816e88a71bcfd56646512ee483dff8aa9bf4156`

## 1. Validação de Dados de Referência e Segurança

| Indicador | Valor Pós-Limpeza | Status |
| :--- | :---: | :---: |
| Categorias oficiais (`categories`) | **10** | OK |
| Especialidades oficiais (`specialties`) | **81** | OK |
| Especialidades sintéticas de teste | **0** | Limpo |
| Planos oficiais (`plans`) | **5** | OK |
| Configurações (`platform_settings`) | **8** | OK |
| Papéis (`roles`) | **4** | OK |
| Campanhas (`promotional_campaigns`) | **1** | OK |
| Usuários de teste restantes (`public.users`) | **0** | Limpo |
| Usuários de teste restantes (`neon_auth."user"`) | **0** | Limpo |
| Contas administradoras reais preservadas | **0** | Preservadas |

## 2. Registros Removidos e Preservados por Tabela

| Schema | Tabela | Antes | Removidos | Preservados |
| :--- | :--- | :---: | :---: | :---: |
| `neon_auth` | `account` | 103 | 103 | 0 |
| `neon_auth` | `invitation` | 0 | 0 | 0 |
| `neon_auth` | `jwks` | 1 | 0 | 1 |
| `neon_auth` | `member` | 0 | 0 | 0 |
| `neon_auth` | `organization` | 0 | 0 | 0 |
| `neon_auth` | `project_config` | 1 | 0 | 1 |
| `neon_auth` | `session` | 141 | 141 | 0 |
| `neon_auth` | `user` | 103 | 103 | 0 |
| `neon_auth` | `verification` | 0 | 0 | 0 |
| `public` | `ad_clicks` | 0 | 0 | 0 |
| `public` | `ad_impressions` | 12 | 12 | 0 |
| `public` | `ad_slots` | 2 | 2 | 0 |
| `public` | `audit_logs` | 298 | 298 | 0 |
| `public` | `categories` | 10 | 0 | 10 |
| `public` | `customer_profiles` | 61 | 61 | 0 |
| `public` | `invoices` | 42 | 42 | 0 |
| `public` | `mentorships` | 0 | 0 | 0 |
| `public` | `notifications` | 33 | 33 | 0 |
| `public` | `opportunities` | 19 | 19 | 0 |
| `public` | `opportunity_usage` | 40 | 40 | 0 |
| `public` | `plans` | 5 | 0 | 5 |
| `public` | `platform_settings` | 8 | 0 | 8 |
| `public` | `processed_webhook_events` | 14 | 14 | 0 |
| `public` | `professional_trust_list` | 2 | 2 | 0 |
| `public` | `profiles` | 102 | 102 | 0 |
| `public` | `promotion_eligibility_checks` | 22 | 22 | 0 |
| `public` | `promotional_campaigns` | 1 | 0 | 1 |
| `public` | `promotional_redemptions` | 6 | 6 | 0 |
| `public` | `provider_custom_tags` | 60 | 60 | 0 |
| `public` | `provider_profiles` | 57 | 57 | 0 |
| `public` | `provider_services` | 0 | 0 | 0 |
| `public` | `provider_specialties` | 30 | 30 | 0 |
| `public` | `realtime_notifications` | 2 | 2 | 0 |
| `public` | `repeat_requests` | 2 | 2 | 0 |
| `public` | `reviews` | 2 | 2 | 0 |
| `public` | `roles` | 4 | 0 | 4 |
| `public` | `service_assignments` | 0 | 0 | 0 |
| `public` | `service_requests` | 6 | 6 | 0 |
| `public` | `specialties` | 86 | 5 | 81 |
| `public` | `specialty_suggestions` | 37 | 37 | 0 |
| `public` | `storage_assets` | 5 | 5 | 0 |
| `public` | `subscription_events` | 84 | 84 | 0 |
| `public` | `subscriptions` | 40 | 40 | 0 |
| `public` | `substitute_referrals` | 4 | 4 | 0 |
| `public` | `users` | 102 | 102 | 0 |

## 3. Storage S3 (Bucket `assets`)

- **Objetos de teste/demo/órfãos removidos (5):**
  - `backups/confiare-backup-1794842598847.json`
  - `backups/confiare-backup-1794842682464.json`
  - `portfolio/prov-joao/laudo-1794827693719.json`
  - `verification-private/prov-8df90d37/certificado_tecnico-1794840612046.txt`
  - `verification-private/prov-dde3438b/certificado_tecnico-1794842966314.txt`
- **Objetos restantes no bucket (0):**
  - Bucket limpo (`0` objetos órfãos).
