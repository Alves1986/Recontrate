import { createHash } from 'node:crypto';
import { ensureSchemaAndSeed, neonEnv, pool } from '../db/index';
import { withRlsContext } from '../db/rls';
import { assetsFiles } from '../server/neonServices';
import { sanitizeUserText } from './authService';

export const EXPECTED_RLS_TABLES = [
  'customer_profiles',
  'service_requests',
  'opportunities',
  'reviews',
  'professional_trust_list',
  'repeat_requests',
  'substitute_referrals',
  'service_assignments',
  'mentorships',
  'notifications',
  'storage_assets',
  'audit_logs',
] as const;

export interface SystemHealthReport {
  status: 'healthy' | 'degraded';
  dbLatencyMs: number;
  database: string;
  rlsProtectedTablesCount: number;
  expectedRlsTablesCount: number;
  rlsProtectedTables: string[];
  missingRlsTables: string[];
  environment: string;
  branch: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface ErrorAlertInput {
  source: string;
  message: string;
  severity: 'warning' | 'critical';
  metadata?: Record<string, unknown>;
  actorUserId?: string;
}

export interface ErrorAlertResult {
  alertId: string;
  recordedAt: string;
  severity: 'warning' | 'critical';
  notified: boolean;
}

export interface DatabaseBackupSnapshotResult {
  backupId: string;
  objectKey: string;
  sizeBytes: number;
  sha256: string;
  tablesBackedUp: Record<string, number>;
  createdAt: string;
}

export async function collectFullDatabaseSnapshotPayload(
  backupId: string,
  createdAt: string
): Promise<{
  tablesBackedUp: Record<string, number>;
  payloadJson: string;
  sha256: string;
}> {
  const { rows: tableRows } = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
     ORDER BY table_name ASC`
  );

  const tablesBackedUp: Record<string, number> = {};
  const data: Record<string, unknown[]> = {};

  for (const row of tableRows) {
    const tbl = row.table_name;
    const { rows } = await pool.query(`SELECT * FROM public."${tbl}"`);
    tablesBackedUp[tbl] = rows.length;
    data[tbl] = rows;
  }

  // Metadados seguros de neon_auth (sem hashes/tokens de sessão)
  let neonAuthUsers: unknown[] = [];
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, role, "emailVerified", "createdAt" FROM neon_auth."user" ORDER BY "createdAt" ASC`
    );
    neonAuthUsers = rows;
  } catch {
    neonAuthUsers = [];
  }

  const payloadJson = JSON.stringify(
    {
      backupId,
      generatedAt: createdAt,
      branch: neonEnv.branch?.name || 'production',
      environment: process.env.NODE_ENV || 'development',
      tablesBackedUp,
      neonAuthUsersCount: neonAuthUsers.length,
      data,
      neonAuthUsers,
    },
    null,
    2
  );
  const sha256 = createHash('sha256').update(payloadJson, 'utf-8').digest('hex');
  return { tablesBackedUp, payloadJson, sha256 };
}

/**
 * Serviço de monitoramento de disponibilidade, alertas de falha e snapshots de backup
 * para operação de produção e staging da plataforma Confiare.
 */
export class MonitoringAndBackupService {
  async getSystemHealth(): Promise<SystemHealthReport> {
    await ensureSchemaAndSeed();

    const startedAt = Date.now();
    const { rows: pingRows } = await pool.query<{
      server_time: Date;
      database: string;
    }>(`SELECT NOW() AS server_time, current_database() AS database`);
    const dbLatencyMs = Date.now() - startedAt;

    const { rows: rlsRows } = await pool.query<{ tablename: string }>(
      `SELECT tablename
       FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename = ANY($1::text[])
         AND rowsecurity = true
       ORDER BY tablename ASC`,
      [Array.from(EXPECTED_RLS_TABLES)]
    );

    const rlsProtectedTables = rlsRows.map((r) => r.tablename);
    const missingRlsTables = EXPECTED_RLS_TABLES.filter(
      (t) => !rlsProtectedTables.includes(t)
    );

    const healthy =
      pingRows.length > 0 &&
      rlsProtectedTables.length >= EXPECTED_RLS_TABLES.length;

    return {
      status: healthy ? 'healthy' : 'degraded',
      dbLatencyMs,
      database: pingRows[0]?.database || 'neondb',
      rlsProtectedTablesCount: rlsProtectedTables.length,
      expectedRlsTablesCount: EXPECTED_RLS_TABLES.length,
      rlsProtectedTables,
      missingRlsTables,
      environment: process.env.NODE_ENV || 'development',
      branch: neonEnv.branch?.name || 'production',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async recordErrorAlert(input: ErrorAlertInput): Promise<ErrorAlertResult> {
    await ensureSchemaAndSeed();
    const alertId = `alert-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const recordedAt = new Date().toISOString();
    const safeSource = sanitizeUserText(input.source || 'backend');
    const safeMessage = sanitizeUserText(input.message || 'Erro operacional');

    await withRlsContext(
      {
        userId: input.actorUserId || null,
        role: 'admin',
      },
      async (client) => {
        await client.query(
          `INSERT INTO audit_logs (
            actor_user_id, actor_role, action, target_type, target_id, metadata_json
          ) VALUES ($1, 'system', 'system_error_alert', $2, $3, $4::jsonb)`,
          [
            input.actorUserId || null,
            safeSource,
            alertId,
            JSON.stringify({
              severity: input.severity,
              message: safeMessage,
              metadata: input.metadata || {},
              recordedAt,
            }),
          ]
        );

        await client.query(
          `INSERT INTO notifications (
            user_id, type, title, message
          ) VALUES ($1, 'system_error_alert', $2, $3)`,
          [
            input.actorUserId || null,
            `Alerta [${input.severity.toUpperCase()}]: ${safeSource}`,
            safeMessage,
          ]
        );
      }
    );

    return {
      alertId,
      recordedAt,
      severity: input.severity,
      notified: true,
    };
  }

  async createDatabaseBackupSnapshot(
    actorUserId?: string
  ): Promise<DatabaseBackupSnapshotResult> {
    await ensureSchemaAndSeed();

    const createdAt = new Date().toISOString();
    const timestampMs = Date.now();
    const backupId = `backup-${timestampMs}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const objectKey = `backups/confiare-backup-${timestampMs}.json`;

    const { tablesBackedUp, payloadJson, sha256 } =
      await collectFullDatabaseSnapshotPayload(backupId, createdAt);

    const bytes = Buffer.from(payloadJson, 'utf-8');
    await assetsFiles.upload(objectKey, bytes, {
      contentType: 'application/json',
    });

    await withRlsContext(
      {
        userId: actorUserId || null,
        role: 'admin',
      },
      async (client) => {
        await client.query(
          `INSERT INTO storage_assets (
            id, provider_profile_id, bucket, object_key, content_type,
            label, size_bytes, visibility, document_type, verified_by_admin_id, verified_at
          ) VALUES ($1, 'system-backup', 'assets', $2, 'application/json', $3, $4, 'private_verification', 'db_backup_snapshot', $5, NOW())`,
          [
            backupId,
            objectKey,
            `Backup Snapshot ${createdAt}`,
            bytes.byteLength,
            actorUserId || null,
          ]
        );

        await client.query(
          `INSERT INTO audit_logs (
            actor_user_id, actor_role, action, target_type, target_id, metadata_json
          ) VALUES ($1, 'admin', 'database_backup_snapshot_created', 'storage_asset', $2, $3::jsonb)`,
          [
            actorUserId || null,
            backupId,
            JSON.stringify({
              objectKey,
              sizeBytes: bytes.byteLength,
              sha256,
              tablesBackedUp,
            }),
          ]
        );
      }
    );

    return {
      backupId,
      objectKey,
      sizeBytes: bytes.byteLength,
      sha256,
      tablesBackedUp,
      createdAt,
    };
  }
}
