import type { CSSProperties } from 'react';
import AnimatedGradient from '@/components/animated-gradient';

// Cores do tema escuro (src/index.css): azul-carvão de fundo (--background) e faixas em amarelo-ouro (--primary).
const BACKGROUND = '#0B0F19';
const GOLD = '#E0A200';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Fundo animado com as cores da marca. O elemento pai precisa de `relative isolate`.
 * Sem WebGL, aparece só o fundo da página.
 * `fade`: dissolve as bordas no fundo da página — 'bottom' só embaixo (vitrine), 'hero' embaixo e à esquerda (Painel).
 */
export function BrandGradient({ className, fade }: { className?: string; fade?: 'bottom' | 'hero' }) {
  const mask: CSSProperties | undefined = fade === 'bottom'
    ? { maskImage: 'linear-gradient(to bottom, black 70%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent)' }
    : fade === 'hero'
    ? {
        maskImage: 'linear-gradient(to bottom, black 55%, transparent), linear-gradient(to right, transparent, black 25%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent), linear-gradient(to right, transparent, black 25%)',
        maskComposite: 'intersect',
        WebkitMaskComposite: 'source-in',
      }
    : undefined;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-[1] ${className ?? ''}`} style={mask}>
      <AnimatedGradient
        noise={{ opacity: 0.15 }}
        config={{
          preset: 'custom',
          // Escuro nas pontas e dourado só nas faixas, para o texto continuar legível.
          color1: BACKGROUND,
          color2: GOLD,
          color3: BACKGROUND,
          proportion: 40,
          rotation: 0,
          scale: 0.48,
          // Parado para quem pediu menos movimento no sistema.
          speed: prefersReducedMotion() ? 0 : 18,
          distortion: 4,
          swirl: 65,
          swirlIterations: 5,
          softness: 100,
          offset: -235,
          shape: 'Edge',
          shapeSize: 48,
        }}
      />
      {/* Véu escuro por cima do gradiente: garante contraste do texto quando a faixa passa por trás. */}
      <div className={`absolute inset-0 ${fade === 'hero' ? 'bg-background/25' : 'bg-background/50'}`} />
    </div>
  );
}
