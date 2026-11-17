import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { ensureSchemaAndSeed, neonEnv, pool } from '../src/db/index';
import { collectFullDatabaseSnapshotPayload } from '../src/services/monitoringAndBackupService';

export async function runFullLocalBackup(): Promise<{
  backupId: string;
  filePath: string;
  sha256: string;
  sizeBytes: number;
  tablesBackedUp: Record<string, number>;
  s3ObjectsCount: number;
}> {
  await ensureSchemaAndSeed();

  const createdAt = new Date().toISOString();
  const safeStamp = createdAt.replace(/[:.]/g, '-');
  const backupId = `full-backup-${Date.now()}`;

  const { tablesBackedUp, payloadJson, sha256 } =
    await collectFullDatabaseSnapshotPayload(backupId, createdAt);

  // Inventário somente leitura do bucket S3 "assets"
  let s3Objects: Array<{ key?: string; size?: number; lastModified?: Date }> = [];
  let s3InventoryError: string | null = null;
  try {
    const s3 = new S3Client({
      region: neonEnv.storage.region || 'auto',
      endpoint: neonEnv.storage.endpoint,
      credentials: {
        accessKeyId: neonEnv.storage.accessKeyId,
        secretAccessKey: neonEnv.storage.secretAccessKey,
      },
      forcePathStyle: true,
    });
    const listed = await s3.send(
      new ListObjectsV2Command({ Bucket: 'assets', MaxKeys: 1000 })
    );
    s3Objects = (listed.Contents || []).map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));
  } catch (err: any) {
    s3InventoryError = err?.message || String(err);
  }

  const parsedPayload = JSON.parse(payloadJson);
  const fullDocument = JSON.stringify(
    {
      ...parsedPayload,
      sha256,
      s3Bucket: 'assets',
      s3ObjectsCount: s3Objects.length,
      s3Objects,
      s3InventoryError,
    },
    null,
    2
  );

  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true });
  }

  const filePath = path.join(backupsDir, `confiare-backup-${safeStamp}.json`);
  writeFileSync(filePath, fullDocument, 'utf-8');
  writeFileSync(`${filePath}.sha256`, `${sha256}  ${path.basename(filePath)}\n`, 'utf-8');

  const sizeBytes = Buffer.byteLength(fullDocument, 'utf-8');
  return {
    backupId,
    filePath,
    sha256,
    sizeBytes,
    tablesBackedUp,
    s3ObjectsCount: s3Objects.length,
  };
}

if (
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('backup-full-database.ts')
) {
  runFullLocalBackup()
    .then(async (res) => {
      console.log('[backup-full] Backup completo concluído sem alterações no banco:');
      console.log(`  Arquivo: ${res.filePath}`);
      console.log(`  Tamanho: ${res.sizeBytes} bytes | SHA-256: ${res.sha256}`);
      console.log(`  Tabelas exportadas: ${Object.keys(res.tablesBackedUp).length} | Objetos S3: ${res.s3ObjectsCount}`);
      await pool.end();
    })
    .catch(async (err) => {
      console.error('[backup-full] Erro ao executar backup:', err);
      await pool.end().catch(() => null);
      process.exit(1);
    });
}
