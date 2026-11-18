import React from 'react';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  layout?: 'horizontal' | 'symbol';
  decorative?: boolean;
  className?: string;
}

/**
 * Símbolo vetorial oficial e wordmark tipográfico de Recontrate.
 * Traço contínuo tubular em "R" com cantos arredondados, disponível nas versões
 * horizontal (símbolo + wordmark) e símbolo isolado, em fundo claro (dark) ou escuro (light).
 */
export const RecontrateSymbol: React.FC<{
  className?: string;
}> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`.trim()}
    aria-hidden="true"
  >
    <path
      d="M 15 44 C 15 23 30 9 50 9 C 70 9 85 23 85 43 C 85 55 79 64 71 70 L 77 70 C 85 70 90 75 90 81 C 90 87 84 91 76 91 C 60 91 48 81 43 67 C 41 62 44 58 50 58 C 60 58 67 51 67 42 C 67 33 60 26 50 26 C 39 26 33 33 33 44 L 33 80 C 33 86 29 91 24 91 C 19 91 15 86 15 80 Z"
      stroke="currentColor"
      strokeWidth="8.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'dark',
  layout = 'horizontal',
  decorative = false,
  className = '',
}) => {
  const isLight = variant === 'light';
  const wordmarkSize =
    size === 'sm'
      ? 'text-lg sm:text-xl'
      : size === 'lg'
        ? 'text-3xl sm:text-4xl'
        : 'text-2xl';
  const symbolSize =
    size === 'sm'
      ? 'w-7 h-7 sm:w-8 sm:h-8'
      : size === 'lg'
        ? 'w-11 h-11 sm:w-12 sm:h-12'
        : 'w-9 h-9 sm:w-10 sm:h-10';
  const colorClass = isLight ? 'text-white' : 'text-brand-primary';

  return (
    <span
      className={`inline-flex items-center gap-2 sm:gap-2.5 select-none whitespace-nowrap shrink-0 ${colorClass} ${className}`.trim()}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'Recontrate'}
      aria-hidden={decorative ? true : undefined}
    >
      <RecontrateSymbol className={symbolSize} />
      {layout === 'horizontal' && (
        <span
          className={`font-display font-extrabold tracking-[-0.04em] leading-none ${wordmarkSize}`}
        >
          Recontrate
        </span>
      )}
    </span>
  );
};

