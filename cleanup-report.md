# Relatório Final de Limpeza do Banco de Produção — Confiare

- **Data/Hora (UTC):** 2026-11-18T05:47:01.030Z
- **Ambiente:** `development`
- **Backup Pré-Limpeza ID:** `full-backup-1794980788109`
- **Arquivo de Backup Local:** `E:\Anderson\Recontrate\backups\confiare-backup-2026-11-18T05-46-28-108Z.json`
- **Checksum SHA-256:** `efbc346e4072ce7861dd65060c503ab6c6140d3b9386e3da50e3262d85dfbcea`

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
| `neon_auth` | `account` | 191 | 191 | 0 |
| `neon_auth` | `invitation` | 0 | 0 | 0 |
| `neon_auth` | `jwks` | 1 | 0 | 1 |
| `neon_auth` | `member` | 0 | 0 | 0 |
| `neon_auth` | `organization` | 0 | 0 | 0 |
| `neon_auth` | `project_config` | 1 | 0 | 1 |
| `neon_auth` | `session` | 253 | 253 | 0 |
| `neon_auth` | `user` | 191 | 191 | 0 |
| `neon_auth` | `verification` | 0 | 0 | 0 |
| `public` | `ad_clicks` | 1 | 1 | 0 |
| `public` | `ad_impressions` | 27 | 27 | 0 |
| `public` | `ad_slots` | 1 | 1 | 0 |
| `public` | `audit_logs` | 576 | 576 | 0 |
| `public` | `categories` | 10 | 0 | 10 |
| `public` | `customer_profiles` | 115 | 115 | 0 |
| `public` | `invoices` | 129 | 129 | 0 |
| `public` | `mentorships` | 0 | 0 | 0 |
| `public` | `notifications` | 41 | 41 | 0 |
| `public` | `opportunities` | 20 | 20 | 0 |
| `public` | `opportunity_usage` | 112 | 112 | 0 |
| `public` | `plans` | 5 | 0 | 5 |
| `public` | `platform_settings` | 8 | 0 | 8 |
| `public` | `processed_webhook_events` | 18 | 18 | 0 |
| `public` | `professional_trust_list` | 8 | 8 | 0 |
| `public` | `profiles` | 180 | 180 | 0 |
| `public` | `promotion_eligibility_checks` | 13 | 13 | 0 |
| `public` | `promotional_campaigns` | 1 | 0 | 1 |
| `public` | `promotional_redemptions` | 0 | 0 | 0 |
| `public` | `provider_custom_tags` | 0 | 0 | 0 |
| `public` | `provider_profiles` | 70 | 70 | 0 |
| `public` | `provider_services` | 0 | 0 | 0 |
| `public` | `provider_specialties` | 0 | 0 | 0 |
| `public` | `realtime_notifications` | 10 | 10 | 0 |
| `public` | `repeat_requests` | 8 | 8 | 0 |
| `public` | `reviews` | 8 | 8 | 0 |
| `public` | `roles` | 4 | 0 | 4 |
| `public` | `service_assignments` | 0 | 0 | 0 |
| `public` | `service_requests` | 15 | 15 | 0 |
| `public` | `specialties` | 81 | 0 | 81 |
| `public` | `specialty_suggestions` | 0 | 0 | 0 |
| `public` | `storage_assets` | 30 | 30 | 0 |
| `public` | `subscription_events` | 238 | 238 | 0 |
| `public` | `subscriptions` | 112 | 112 | 0 |
| `public` | `substitute_referrals` | 16 | 16 | 0 |
| `public` | `users` | 180 | 180 | 0 |

## 3. Storage S3 (Bucket `assets`)

- **Objetos de teste/demo/órfãos removidos (30):**
  - `backups/confiare-backup-1794944907191.json`
  - `backups/confiare-backup-1794944968853.json`
  - `backups/confiare-backup-1794945030617.json`
  - `backups/confiare-backup-1794947751250.json`
  - `backups/confiare-backup-1794947819489.json`
  - `backups/confiare-backup-1794947902087.json`
  - `backups/confiare-backup-1794947962751.json`
  - `backups/confiare-backup-1794948024639.json`
  - `backups/confiare-backup-1794948086014.json`
  - `backups/confiare-backup-1794948148022.json`
  - `portfolio/prov-joao/laudo-1794944904813.json`
  - `portfolio/prov-joao/laudo-1794944965877.json`
  - `portfolio/prov-joao/laudo-1794945028485.json`
  - `portfolio/prov-joao/laudo-1794947749507.json`
  - `portfolio/prov-joao/laudo-1794947817557.json`
  - `portfolio/prov-joao/laudo-1794947899087.json`
  - `portfolio/prov-joao/laudo-1794947960728.json`
  - `portfolio/prov-joao/laudo-1794948022171.json`
  - `portfolio/prov-joao/laudo-1794948084036.json`
  - `portfolio/prov-joao/laudo-1794948146173.json`
  - `verification-private/prov-0234de53/certificado_tecnico-1794947833220.txt`
  - `verification-private/prov-356777d6/certificado_tecnico-1794947929524.txt`
  - `verification-private/prov-77bf88fa/certificado_tecnico-1794944997257.txt`
  - `verification-private/prov-7dfac7f9/certificado_tecnico-1794948114205.txt`
  - `verification-private/prov-898e6b91/certificado_tecnico-1794944935121.txt`
  - `verification-private/prov-8b1e0e13/certificado_tecnico-1794947783158.txt`
  - `verification-private/prov-a7cf3a39/certificado_tecnico-1794948175626.txt`
  - `verification-private/prov-b6feae51/certificado_tecnico-1794945044601.txt`
  - `verification-private/prov-c88c97a8/certificado_tecnico-1794948053316.txt`
  - `verification-private/prov-ce88b0b3/certificado_tecnico-1794947991315.txt`
- **Objetos restantes no bucket (0):**
  - Bucket limpo (`0` objetos órfãos).
