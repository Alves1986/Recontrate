export const CURRENT_TERMS_VERSION = '2026-04-v1';
export const CURRENT_PRIVACY_VERSION = '2026-04-v1';
export const CURRENT_COOKIE_POLICY_VERSION = '2026-04-v1';

export interface LegalIdentity {
  companyName: string;
  cnpj: string;
  address: string;
  dpoName: string;
  dpoEmail: string;
  supportEmail: string;
  supportHours: string;
  isConfigured: {
    companyName: boolean;
    cnpj: boolean;
    address: boolean;
    dpoEmail: boolean;
    supportEmail: boolean;
    allMandatory: boolean;
  };
}

function readEnvValue(viteKey: string, serverKey?: string): string {
  const viteEnv =
    typeof import.meta !== 'undefined' && (import.meta as any).env
      ? (import.meta as any).env[viteKey]
      : undefined;
  if (typeof viteEnv === 'string' && viteEnv.trim().length > 0) {
    return viteEnv.trim();
  }
  if (typeof process !== 'undefined' && process.env) {
    const fromViteProc = process.env[viteKey];
    if (typeof fromViteProc === 'string' && fromViteProc.trim().length > 0) {
      return fromViteProc.trim();
    }
    if (serverKey) {
      const fromServerProc = process.env[serverKey];
      if (typeof fromServerProc === 'string' && fromServerProc.trim().length > 0) {
        return fromServerProc.trim();
      }
    }
  }
  return '';
}

/**
 * Resolve a identidade jurídica do Controlador (LGPD/CDC/Decreto 7.962/2013) exclusivamente a
 * partir de variáveis de ambiente — jamais inventa CNPJ, Razão Social, endereço ou e-mail do DPO.
 */
export function getLegalIdentity(): LegalIdentity {
  const companyNameRaw = readEnvValue('VITE_COMPANY_NAME', 'COMPANY_NAME');
  const cnpjRaw = readEnvValue('VITE_COMPANY_CNPJ', 'COMPANY_CNPJ');
  const addressRaw = readEnvValue('VITE_COMPANY_ADDRESS', 'COMPANY_ADDRESS');
  const dpoNameRaw = readEnvValue('VITE_DPO_NAME', 'DPO_NAME');
  const dpoEmailRaw = readEnvValue('VITE_DPO_EMAIL', 'DPO_EMAIL');
  const supportEmailRaw =
    readEnvValue('VITE_SUPPORT_EMAIL', 'SUPPORT_EMAIL') ||
    readEnvValue('VITE_PROJECT_CONTACT_EMAIL', 'PROJECT_CONTACT_EMAIL');
  const supportHoursRaw = readEnvValue('VITE_SUPPORT_HOURS', 'SUPPORT_HOURS');

  const isConfigured = {
    companyName: companyNameRaw.length > 0,
    cnpj: cnpjRaw.length > 0,
    address: addressRaw.length > 0,
    dpoEmail: dpoEmailRaw.length > 0,
    supportEmail: supportEmailRaw.length > 0,
    allMandatory:
      companyNameRaw.length > 0 &&
      cnpjRaw.length > 0 &&
      addressRaw.length > 0 &&
      dpoEmailRaw.length > 0 &&
      supportEmailRaw.length > 0,
  };

  return {
    companyName:
      companyNameRaw ||
      '[Pendente de configuração: definir VITE_COMPANY_NAME (Razão Social)]',
    cnpj:
      cnpjRaw || '[Pendente de configuração: definir VITE_COMPANY_CNPJ]',
    address:
      addressRaw ||
      '[Pendente de configuração: definir VITE_COMPANY_ADDRESS (endereço completo para citações/notificações)]',
    dpoName:
      dpoNameRaw ||
      '[Pendente de configuração: definir VITE_DPO_NAME (Encarregado LGPD / DPO)]',
    dpoEmail:
      dpoEmailRaw || '[Pendente de configuração: definir VITE_DPO_EMAIL]',
    supportEmail:
      supportEmailRaw ||
      '[Pendente de configuração: definir VITE_SUPPORT_EMAIL (SAC)]',
    supportHours:
      supportHoursRaw || 'Segunda a sexta-feira, das 9h às 18h (horário de Brasília)',
    isConfigured,
  };
}
