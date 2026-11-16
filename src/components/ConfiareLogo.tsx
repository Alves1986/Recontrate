import React from 'react';

interface ConfiareLogoProps {
  variant?: 'dark-text' | 'light-text';
  size?: 'sm' | 'md' | 'lg';
  showOfficialImageBadge?: boolean;
}

export const ConfiareLogo: React.FC<ConfiareLogoProps> = ({
  variant = 'dark-text',
  size = 'md',
}) => {
  const iconDimensions =
    size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const textSize =
    size === 'sm'
      ? 'text-lg'
      : size === 'lg'
      ? 'text-2xl sm:text-3xl'
      : 'text-xl';

  const circleStroke = variant === 'light-text' ? '#FFFFFF' : '#0A2540';
  const checkFill = variant === 'light-text' ? '#FFFFFF' : '#1D6FE0';
  const wordmarkColor = variant === 'light-text' ? 'text-white' : 'text-[#0A2540]';

  return (
    <span className="inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDimensions} shrink-0`}
        aria-hidden="true"
      >
        {/* Outer C arc */}
        <path
          d="M44.5 15.2C39.8 11.4 33.8 9.5 27.3 10.1C15.9 11.2 7.2 20.9 7.5 32.4C7.8 44.1 17.4 53.5 29.2 53.5C40.3 53.5 49.5 45.2 50.8 34.4"
          stroke={circleStroke}
          strokeWidth="8.5"
          strokeLinecap="butt"
        />
        {/* Inner Checkmark */}
        <path
          d="M21 31.5L28.5 39L47 20.5"
          stroke={checkFill}
          strokeWidth="8.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        {/* Vibrant Orange Trust Dot */}
        <circle cx="54.5" cy="13.5" r="5.5" fill="#FF6A00" />
      </svg>
      <span
        className={`font-display font-extrabold tracking-[0.06em] ${textSize} ${wordmarkColor}`}
      >
        CONFIARE
      </span>
    </span>
  );
};

export const PortfolioVisualGraphic: React.FC<{
  visualType: 'electrical' | 'plumbing' | 'cleaning' | 'painting' | 'hvac';
  title: string;
}> = ({ visualType, title }) => {
  const configs = {
    electrical: {
      bg: 'from-[#0A2540] via-[#103459] to-[#1D6FE0]',
      accent: '#FF6A00',
      label: 'NBR 5410 · Quadro & Circuitos',
    },
    plumbing: {
      bg: 'from-[#0A2540] via-[#0F3C66] to-[#1D6FE0]',
      accent: '#38BDF8',
      label: 'Estanqueidade & Pressurização',
    },
    cleaning: {
      bg: 'from-[#0A2540] via-[#16426B] to-[#1D6FE0]',
      accent: '#FF6A00',
      label: 'Higienização & Detalhamento',
    },
    painting: {
      bg: 'from-[#0A2540] via-[#1B3A5C] to-[#1D6FE0]',
      accent: '#FF6A00',
      label: 'Acabamento Fino & Proteção Total',
    },
    hvac: {
      bg: 'from-[#0A2540] via-[#123D68] to-[#1D6FE0]',
      accent: '#60A5FA',
      label: 'Climatização Inverter & Higienização',
    },
  };

  const cfg = configs[visualType] || configs.electrical;

  return (
    <div
      className={`relative w-full h-44 bg-gradient-to-br ${cfg.bg} rounded-xl overflow-hidden p-4 flex flex-col justify-between text-white`}
    >
      {/* Architectural technical grid lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-15 pointer-events-none"
        viewBox="0 0 400 200"
        fill="none"
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
        <span>Registro Técnico Verificado</span>
        <span className="font-mono tabular-nums">Confiare Docs</span>
      </div>

      <div className="relative z-10">
        <p className="text-xs text-[#FF6A00] font-semibold tracking-wide">
          {cfg.label}
        </p>
        <p className="text-sm font-display font-semibold text-white line-clamp-2 mt-0.5">
          {title}
        </p>
      </div>
    </div>
  );
};
