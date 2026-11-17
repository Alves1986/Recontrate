export type ConfiareNodeEnv = 'development' | 'staging' | 'demo' | 'production';

export const DEMO_BANNER_TEXT = 'Ambiente de demonstração';

export function getNodeEnvironment(): ConfiareNodeEnv {
  const raw = String(process.env.NODE_ENV || 'development')
    .trim()
    .toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'staging' || raw === 'stage') return 'staging';
  if (raw === 'demo') return 'demo';
  return 'development';
}

export function isProductionEnvironment(): boolean {
  return getNodeEnvironment() === 'production';
}

/**
 * DEMO_MODE só pode ser ativado quando DEMO_MODE=true E o ambiente não é produção.
 */
export function isDemoModeEnabled(): boolean {
  if (isProductionEnvironment()) return false;
  return String(process.env.DEMO_MODE || 'false').trim().toLowerCase() === 'true';
}

export interface RuntimeConfigSnapshot {
  nodeEnv: ConfiareNodeEnv;
  isProduction: boolean;
  demoMode: boolean;
  demoBannerText: string | null;
}

export function getRuntimeConfigSnapshot(): RuntimeConfigSnapshot {
  const nodeEnv = getNodeEnvironment();
  const isProduction = nodeEnv === 'production';
  const demoMode = isDemoModeEnabled();
  return {
    nodeEnv,
    isProduction,
    demoMode,
    demoBannerText: demoMode ? DEMO_BANNER_TEXT : null,
  };
}

/**
 * Bloqueia comandos destrutivos, seeds de teste/demo e testes automatizados em produção.
 */
export function assertNonProductionGuard(operationName: string): void {
  if (isProductionEnvironment()) {
    throw new Error(
      `[BLOQUEIO DE PRODUÇÃO] A operação "${operationName}" é estritamente proibida quando NODE_ENV=production.`
    );
  }
}

/**
 * Exige que seed de demonstração só rode fora de produção E com DEMO_MODE=true.
 */
export function assertCanRunDemoSeed(): void {
  if (isProductionEnvironment()) {
    throw new Error(
      '[ALERTA CRÍTICO DE SEGURANÇA] Tentativa bloqueada de executar seed de demonstração em ambiente de produção (NODE_ENV=production).'
    );
  }
  const allowedEnv = getNodeEnvironment();
  if (
    allowedEnv !== 'development' &&
    allowedEnv !== 'staging' &&
    allowedEnv !== 'demo'
  ) {
    throw new Error(
      `[BLOQUEIO DEMO] Seed de demonstração permitido apenas em development, staging ou demo (atual: ${allowedEnv}).`
    );
  }
  if (!isDemoModeEnabled()) {
    throw new Error(
      '[BLOQUEIO DEMO] Defina DEMO_MODE=true explicitamente para executar o seed de demonstração.'
    );
  }
}

/**
 * Garante que ambientes configurados não compartilhem a mesma DATABASE_URL.
 */
export function assertDistinctDatabaseUrls(urls?: {
  development?: string;
  staging?: string;
  production?: string;
}): void {
  const dev = (urls?.development ?? process.env.DATABASE_URL_DEVELOPMENT ?? '').trim();
  const stg = (urls?.staging ?? process.env.DATABASE_URL_STAGING ?? '').trim();
  const prod = (urls?.production ?? process.env.DATABASE_URL_PRODUCTION ?? '').trim();

  const pairs: Array<[string, string, string, string]> = [
    ['development', dev, 'staging', stg],
    ['development', dev, 'production', prod],
    ['staging', stg, 'production', prod],
  ];

  for (const [envA, urlA, envB, urlB] of pairs) {
    if (urlA && urlB && urlA === urlB) {
      throw new Error(
        `[SEGURANÇA DE AMBIENTE] DATABASE_URL idêntica detectada entre "${envA}" e "${envB}". Cada ambiente deve possuir seu próprio banco.`
      );
    }
  }
}

export function isDemoSandboxHeader(
  headers?: Record<string, string | string[] | undefined>
): boolean {
  if (!headers) return false;
  const val = headers['x-confiare-demo-sandbox'];
  const normalized = Array.isArray(val) ? val[0] : val;
  return String(normalized || '').trim().toLowerCase() === 'true';
}

/**
 * Bloqueia ações reais de conta, mensageria ou pagamento quando DEMO_MODE=true
 * ou quando a requisição vier marcada pelo sandbox da rota /demo.
 */
export function assertRealExternalActionAllowed(
  actionType: 'signup' | 'email' | 'whatsapp' | 'payment' | 'webhook',
  headers?: Record<string, string | string[] | undefined>
): { allowed: boolean; reason?: string } {
  if (!isDemoModeEnabled() && !isDemoSandboxHeader(headers)) {
    return { allowed: true };
  }
  const labels: Record<typeof actionType, string> = {
    signup: 'Criação de contas reais desabilitada no Ambiente de demonstração.',
    email: 'Envio real de e-mail bloqueado no Ambiente de demonstração.',
    whatsapp: 'Envio real de WhatsApp bloqueado no Ambiente de demonstração.',
    payment: 'Cobrança e integração com gateway de pagamento desabilitadas no Ambiente de demonstração.',
    webhook: 'Processamento de webhooks reais bloqueado no Ambiente de demonstração.',
  };
  return {
    allowed: false,
    reason: labels[actionType],
  };
}
