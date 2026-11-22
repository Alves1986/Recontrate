import React, { useEffect, useState } from 'react';
import { Cookie, ShieldCheck } from 'lucide-react';
import {
  COOKIE_CONSENT_EVENT,
  getCookieConsent,
  saveCookieConsent,
} from '../utils/cookieConsent';

interface CookieConsentBannerProps {
  onNavigateUrl: (path: string) => void;
  authToken?: string;
  isAuthenticated?: boolean;
  externalOpenSignal?: number;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onNavigateUrl,
  authToken,
  isAuthenticated = false,
  externalOpenSignal = 0,
}) => {
  const [visible, setVisible] = useState<boolean>(() => !getCookieConsent());
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState<boolean>(
    () => getCookieConsent()?.analytics ?? false
  );
  const [advertising, setAdvertising] = useState<boolean>(
    () => getCookieConsent()?.advertising ?? false
  );

  useEffect(() => {
    if (externalOpenSignal > 0) {
      const current = getCookieConsent();
      setAnalytics(current?.analytics ?? false);
      setAdvertising(current?.advertising ?? false);
      setShowCustomize(true);
      setVisible(true);
    }
  }, [externalOpenSignal]);

  useEffect(() => {
    const syncHandler = () => {
      const latest = getCookieConsent();
      if (latest) {
        setAnalytics(latest.analytics);
        setAdvertising(latest.advertising);
      }
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, syncHandler);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, syncHandler);
  }, []);

  if (!visible) return null;

  const persistChoice = async (prefs: {
    analytics: boolean;
    advertising: boolean;
  }) => {
    const saved = saveCookieConsent(prefs);
    setVisible(false);
    setShowCustomize(false);

    if (isAuthenticated) {
      await fetch('/api/app/privacidade/preferences', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && authToken.split('.').length === 3
            ? { Authorization: `Bearer ${authToken}` }
            : {}),
        },
        body: JSON.stringify({
          cookiePreferences: saved,
        }),
      }).catch(() => null);
    }
  };

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-label="Preferências de Cookies e Privacidade"
      className="fixed bottom-4 left-4 right-4 z-50 max-w-4xl mx-auto bg-white rounded-3xl border-2 border-brand-primary/20 shadow-2xl p-5 sm:p-6 space-y-4 text-xs"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
          <Cookie className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1 flex-1">
          <h2 className="font-display font-bold text-sm sm:text-base text-brand-ink">
            Privacidade e Cookies (Guia ANPD)
          </h2>
          <p className="text-brand-ink/80 leading-relaxed">
            Utilizamos cookies estritamente necessários para autenticação e segurança da sua conta. Scripts não essenciais de medição e publicidade contextual (anúncios não personalizados) permanecem <strong>bloqueados por padrão</strong> e só são carregados se você autorizar. Leia nossa{' '}
            <button
              type="button"
              onClick={() => onNavigateUrl('/privacidade')}
              className="underline font-semibold text-brand-link cursor-pointer"
            >
              Política de Privacidade LGPD
            </button>
            .
          </p>
        </div>
      </div>

      {showCustomize && (
        <div className="p-4 rounded-2xl bg-brand-background/70 border border-brand-primary/10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-brand-ink">
                1. Cookies Estritamente Necessários (Sempre ativos)
              </p>
              <p className="text-brand-ink/70">
                Mantêm sua sessão HTTP-only autenticada e proteção contra CSRF/abusos.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-primary text-white font-semibold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Ativo
            </span>
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="font-semibold text-brand-ink">
                2. Métricas de Desempenho e Diagnóstico (Opcional)
              </p>
              <p className="text-brand-ink/70">
                Ajuda a identificar falhas técnicas de carregamento sem venda de perfil.
              </p>
            </div>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="w-4 h-4 accent-brand-primary shrink-0"
              aria-label="Autorizar cookies de desempenho opcionais"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="font-semibold text-brand-ink">
                3. Publicidade Contextual no Plano Gratuito (Opcional)
              </p>
              <p className="text-brand-ink/70">
                Carrega anúncios contextuais não personalizados (NPA=1) quando o script externo está ativo.
              </p>
            </div>
            <input
              type="checkbox"
              checked={advertising}
              onChange={(e) => setAdvertising(e.target.checked)}
              className="w-4 h-4 accent-brand-primary shrink-0"
              aria-label="Autorizar cookies de publicidade contextual no plano Gratuito"
            />
          </label>
        </div>
      )}

      {/* ANPD 2022: botões Recusar todos e Aceitar todos com exatamente o mesmo peso visual */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => setShowCustomize((v) => !v)}
          className="min-h-[42px] px-4 py-2 rounded-xl border border-brand-primary/20 bg-white hover:bg-brand-background text-brand-ink font-semibold cursor-pointer text-center"
        >
          {showCustomize ? 'Ocultar opções' : 'Personalizar'}
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {showCustomize && (
            <button
              type="button"
              onClick={() => persistChoice({ analytics, advertising })}
              className="min-h-[42px] px-5 py-2.5 rounded-xl border-2 border-brand-link bg-brand-link hover:opacity-95 text-white font-display font-semibold cursor-pointer text-center"
            >
              Salvar escolhas
            </button>
          )}
          <button
            type="button"
            onClick={() => persistChoice({ analytics: false, advertising: false })}
            className="min-h-[42px] min-w-[148px] px-5 py-2.5 rounded-xl border-2 border-brand-primary bg-brand-primary hover:bg-brand-primary-hover text-white font-display font-semibold cursor-pointer text-center"
          >
            Recusar todos
          </button>
          <button
            type="button"
            onClick={() => persistChoice({ analytics: true, advertising: true })}
            className="min-h-[42px] min-w-[148px] px-5 py-2.5 rounded-xl border-2 border-brand-primary bg-brand-primary hover:bg-brand-primary-hover text-white font-display font-semibold cursor-pointer text-center"
          >
            Aceitar todos
          </button>
        </div>
      </div>
    </aside>
  );
};
