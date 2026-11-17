import React from 'react';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  layout?: 'horizontal' | 'symbol';
  decorative?: boolean;
  className?: string;
}

/**
 * Wordmark tipográfico provisório de Recontrate.
 * O símbolo isolado é apenas uma inicial tipográfica temporária; não substitui
 * os estudos vetoriais ainda pendentes de aprovação.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'dark',
  layout = 'horizontal',
  decorative = false,
  className = '',
}) => {
  const isLight = variant === 'light';
  const wordmarkSize =
    size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl';
  const symbolSize =
    size === 'sm' ? 'w-7 h-7 text-base' : size === 'lg' ? 'w-12 h-12 text-2xl' : 'w-9 h-9 text-xl';

  return (
    <span
      className={`inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 ${className}`.trim()}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'Recontrate'}
      aria-hidden={decorative ? true : undefined}
    >
      {layout === 'symbol' && (
        <span
          className={`${symbolSize} inline-flex items-center justify-center rounded-xl font-display font-extrabold leading-none ${
            isLight ? 'bg-white text-brand-primary' : 'bg-brand-primary text-white'
          }`}
          aria-hidden="true"
        >
          R
        </span>
      )}
      {layout === 'horizontal' && (
        <span
          className={`font-display font-extrabold tracking-[-0.045em] leading-none ${wordmarkSize} ${
            isLight ? 'text-white' : 'text-brand-primary'
          }`}
        >
          Recontrate
        </span>
      )}
    </span>
  );
};
