import { CURRENT_COOKIE_POLICY_VERSION } from '../config/legalIdentity';

export interface CookieConsentPreferences {
  version: string;
  decidedAtUtc: string;
  necessary: true;
  analytics: boolean;
  advertising: boolean;
}

export const COOKIE_CONSENT_STORAGE_KEY = 'recontrate_cookie_consent_v1';
export const COOKIE_CONSENT_EVENT = 'recontrate:cookie-consent-changed';

export function getCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentPreferences>;
    if (!parsed || typeof parsed.decidedAtUtc !== 'string') return null;
    return {
      version: parsed.version || CURRENT_COOKIE_POLICY_VERSION,
      decidedAtUtc: parsed.decidedAtUtc,
      necessary: true,
      analytics: Boolean(parsed.analytics),
      advertising: Boolean(parsed.advertising),
    };
  } catch {
    return null;
  }
}

export function saveCookieConsent(input: {
  analytics: boolean;
  advertising: boolean;
}): CookieConsentPreferences {
  const prefs: CookieConsentPreferences = {
    version: CURRENT_COOKIE_POLICY_VERSION,
    decidedAtUtc: new Date().toISOString(),
    necessary: true,
    analytics: Boolean(input.analytics),
    advertising: Boolean(input.advertising),
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        COOKIE_CONSENT_STORAGE_KEY,
        JSON.stringify(prefs)
      );
      window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: prefs }));
    } catch {
      // Ignore storage quota errors
    }
  }
  return prefs;
}

export function hasAdvertisingConsent(): boolean {
  return Boolean(getCookieConsent()?.advertising);
}

export function hasAnalyticsConsent(): boolean {
  return Boolean(getCookieConsent()?.analytics);
}
