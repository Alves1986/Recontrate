import React, { useEffect, useState } from 'react';
import {
  COOKIE_CONSENT_EVENT,
  hasAdvertisingConsent,
} from '../utils/cookieConsent';

declare global {
  interface Window {
    adsbygoogle?: any[] & { requestNonPersonalizedAds?: number };
  }
}

interface GoogleModeratedAdSlotProps {
  sponsoredAd: any;
  adClickConfirmed: boolean;
  onTrackClick: () => void;
  onUpgradeClick: () => void;
}

export const GoogleModeratedAdSlot: React.FC<GoogleModeratedAdSlotProps> = ({
  sponsoredAd,
  adClickConfirmed,
  onTrackClick,
  onUpgradeClick,
}) => {
  const googleCfg = sponsoredAd?.googleAdSense;
  const clientId: string =
    googleCfg?.clientId ||
    (import.meta as any).env?.VITE_GOOGLE_ADSENSE_CLIENT_ID ||
    'ca-pub-0000000000000000';
  const slotId: string =
    googleCfg?.slotId ||
    (import.meta as any).env?.VITE_GOOGLE_ADSENSE_SLOT_ID ||
    '1234567890';
  const isLivePublisherId =
    Boolean(clientId) &&
    clientId.startsWith('ca-pub-') &&
    clientId !== 'ca-pub-0000000000000000';

  const [advertisingAllowed, setAdvertisingAllowed] = useState<boolean>(() =>
    hasAdvertisingConsent()
  );

  useEffect(() => {
    const syncConsent = () => setAdvertisingAllowed(hasAdvertisingConsent());
    window.addEventListener(COOKIE_CONSENT_EVENT, syncConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, syncConsent);
  }, []);

  useEffect(() => {
    if (!isLivePublisherId || !advertisingAllowed) return;

    // Enforce LGPD / Non-Personalized Ads (NPA=1): zero personal or sensitive data shared with Google
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.requestNonPersonalizedAds = 1;

    const existingScript = document.querySelector(
      'script[data-confiare-google-ads="true"]'
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
        clientId
      )}`;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-confiare-google-ads', 'true');
      document.head.appendChild(script);
    }

    try {
      window.adsbygoogle.push({});
    } catch {
      // AdSense push safe fallback when blocked by browser extension
    }
  }, [advertisingAllowed, clientId, isLivePublisherId, sponsoredAd?.id]);

  if (!sponsoredAd) return null;

  const isGoogleNetwork = sponsoredAd.network === 'google_adsense';

  return (
    <aside
      aria-label="Oferta Patrocinada para Prestadores"
      className="bg-white rounded-2xl p-4 sm:p-5 border border-brand-primary/10 space-y-3 text-xs"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-brand-primary/10 text-brand-ink font-mono text-[10px] font-bold uppercase">
              {sponsoredAd.badge || 'Patrocinado'}
            </span>
            <span className="px-2 py-0.5 rounded bg-brand-link/10 text-brand-link font-mono text-[10px] font-semibold">
              {isGoogleNetwork
                ? `Google AdSense Contextual (NPA=1 · ${clientId})`
                : 'Parceiro verificado'}
            </span>
            <span className="font-semibold text-brand-ink">
              {sponsoredAd.nome} · {sponsoredAd.anunciante}
            </span>
            <span className="text-[11px] font-mono text-brand-ink/60">
              (1 banner/sessão · {sponsoredAd.dailyImpressionsUsed || 1}/
              {sponsoredAd.dailyImpressionsLimit || 3} impressões hoje)
            </span>
          </div>
          <p className="text-brand-ink/80">{sponsoredAd.texto}</p>
          <p className="text-[11px] text-brand-ink/70">
            Privacidade LGPD / ANPD: anúncios não personalizados (`requestNonPersonalizedAds=1`), restritos ao painel do prestador Gratuito; scripts externos de anúncios só são carregados se você autorizar cookies de publicidade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onTrackClick}
            className="px-3.5 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold whitespace-nowrap cursor-pointer"
          >
            {adClickConfirmed
              ? '✓ Clique registrado na oferta'
              : 'Ver oferta para prestadores'}
          </button>
          <button
            type="button"
            onClick={onUpgradeClick}
            className="px-3.5 py-2 rounded-xl bg-brand-background hover:bg-brand-surface-hover text-brand-ink font-semibold whitespace-nowrap cursor-pointer"
          >
            Remover anúncios (Upgrade)
          </button>
        </div>
      </div>

      {/* Bloco <ins class="adsbygoogle"> montado apenas quando Publisher ID real e consentimento ANPD de publicidade estão ativos */}
      {isLivePublisherId && advertisingAllowed && (
        <div className="pt-2 border-t border-brand-primary/10">
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client={clientId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}
    </aside>
  );
};
