export interface MobileLoginModeInput {
  pathname: string;
  width: number;
  isStandalone: boolean;
  isAuthenticated: boolean;
}

export const MOBILE_PWA_BREAKPOINT_PX = 768;

export function isMobileOrPwaViewport(
  width: number,
  isStandalone = false
): boolean {
  return Boolean(isStandalone) || width < MOBILE_PWA_BREAKPOINT_PX;
}

/**
 * Em dispositivos móveis (< 768px) ou no app PWA instalado (display-mode: standalone),
 * usuários não autenticados acessando "/" ou "/entrar" veem somente a tela de Login
 * como tela principal do app, preservando links de cadastro (/criar-conta),
 * recuperação de senha (/recuperar-senha) e termos/privacidade.
 * No desktop Web, a landing pública "/" permanece intacta.
 */
export function shouldRenderMobileLoginOnly(input: MobileLoginModeInput): boolean {
  if (input.isAuthenticated) return false;
  if (!isMobileOrPwaViewport(input.width, input.isStandalone)) return false;
  return input.pathname === '/' || input.pathname === '/entrar';
}

export function detectStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaMatch =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const navigatorStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );
  return Boolean(mediaMatch || navigatorStandalone);
}

export function detectCurrentMobileOrPwa(): boolean {
  if (typeof window === 'undefined') return false;
  return isMobileOrPwaViewport(window.innerWidth, detectStandaloneDisplayMode());
}

export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}
