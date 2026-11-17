import React from 'react';
import { BrandLogo } from './BrandLogo';

interface ConfiareLogoProps {
  variant?: 'dark-text' | 'light-text';
  size?: 'sm' | 'md' | 'lg';
  showOfficialImageBadge?: boolean;
}

/** Compatibilidade temporária para imports antigos: renderiza o wordmark Recontrate. */
export const ConfiareLogo: React.FC<ConfiareLogoProps> = ({
  variant = 'dark-text',
  size = 'md',
}) => <BrandLogo variant={variant === 'light-text' ? 'light' : 'dark'} size={size} />;

export const PortfolioVisualGraphic: React.FC<{
  visualType: 'electrical' | 'plumbing' | 'cleaning' | 'painting' | 'hvac';
  title: string;
}> = ({ visualType, title }) => {
  const configs = {
    electrical: { accent: '#E97A4B', label: 'NBR 5410 · Quadro & Circuitos' },
    plumbing: { accent: '#6AB3AA', label: 'Estanqueidade & Pressurização' },
    cleaning: { accent: '#E97A4B', label: 'Higienização & Detalhamento' },
    painting: { accent: '#E97A4B', label: 'Acabamento Fino & Proteção Total' },
    hvac: { accent: '#8FC8BE', label: 'Climatização Inverter & Higienização' },
  };

  const cfg = configs[visualType] || configs.electrical;

  return (
    <div
      role="img"
      aria-label={`${title}. Exemplo visual ilustrativo, não representa um registro verificado.`}
      className="relative w-full h-44 bg-gradient-to-br from-brand-primary via-[#174E49] to-brand-link rounded-xl overflow-hidden p-4 flex flex-col justify-between text-white"
    >
      <svg
        className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
        viewBox="0 0 400 200"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M0 40H400M0 80H400M0 120H400M0 160H400M80 0V200M160 0V200M240 0V200M320 0V200"
          stroke="white"
          strokeWidth="1"
        />
        <circle cx="320" cy="80" r="48" stroke={cfg.accent} strokeWidth="3" />
        <path
          d="M295 80L312 97L348 61"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="relative z-10 flex items-center justify-between text-xs text-white/80">
        <span>Exemplo ilustrativo</span>
        <span className="font-display font-bold tracking-tight">Recontrate</span>
      </div>

      <div className="relative z-10">
        <p className="text-xs text-brand-accent font-semibold tracking-wide">
          {cfg.label}
        </p>
        <p className="text-sm font-display font-semibold text-white line-clamp-2 mt-0.5">
          {title}
        </p>
      </div>
    </div>
  );
};
