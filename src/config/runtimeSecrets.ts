import crypto from 'node:crypto';
import { getNodeEnvironment } from './environment';

let ephemeralDevSessionSecret: Uint8Array | null = null;
let cachedSessionSecretRaw: string | null = null;
let cachedSessionSecretBytes: Uint8Array | null = null;

export function resetSessionSecretCacheForTests(): void {
  if (process.env.NODE_ENV === 'test') {
    cachedSessionSecretRaw = null;
    cachedSessionSecretBytes = null;
  }
}

export function getSessionSecretBytes(): Uint8Array {
  const raw = (process.env.SESSION_SECRET || '').trim();
  const nodeEnv = getNodeEnvironment();
  const isSharedRuntime =
    nodeEnv === 'production' ||
    nodeEnv === 'staging' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview';

  if (raw && !raw.startsWith('YOUR_')) {
    if (raw.length < 32) {
      throw new Error(
        'Configuração de segurança inválida: SESSION_SECRET deve possuir ao menos 32 caracteres de alta entropia.'
      );
    }
    if (cachedSessionSecretRaw !== raw || !cachedSessionSecretBytes) {
      cachedSessionSecretRaw = raw;
      cachedSessionSecretBytes = new TextEncoder().encode(raw);
    }
    return cachedSessionSecretBytes;
  }

  if (isSharedRuntime) {
    throw new Error(
      'Variável de ambiente obrigatória ausente: defina SESSION_SECRET dedicada com ao menos 32 caracteres aleatórios.'
    );
  }

  if (!ephemeralDevSessionSecret) {
    ephemeralDevSessionSecret = crypto.randomBytes(32);
  }
  return ephemeralDevSessionSecret;
}

export function getAppBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.VITE_APP_URL ||
    'http://localhost:3005'
  ).replace(/\/$/, '');
}
