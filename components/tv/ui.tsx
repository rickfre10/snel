// components/tv/ui.tsx
"use client";
// Peças visuais compartilhadas do telão 2026.
import React, { useEffect, useRef, useState } from 'react';
import type { BrandTheme, LogoFile } from '@/lib/brand';
import { frontColor, frontName, readableOnDark, textOn } from '@/lib/haagar/rules';

// ------------------------------------------------------------ Formatação --
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtInt = (n: number) => nf0.format(Math.round(n));
export const fmtPct = (n: number, digits: 1 | 2 = 1) => `${(digits === 2 ? nf2 : nf1).format(n)}%`;
export const fmtSigned = (n: number, digits: 0 | 1 = 1) => {
  const v = digits === 0 ? nf0.format(Math.abs(Math.round(n))) : nf1.format(Math.abs(n));
  if ((digits === 0 && Math.round(n) === 0) || (digits === 1 && Math.abs(n) < 0.05)) return digits === 0 ? '0' : '0,0';
  return `${n > 0 ? '+' : '−'}${v}`;
};

// ---------------------------------------------------------------- Marca ---
export function TargetMark({ size = 40, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="15" />
      <circle cx="50" cy="50" r="15" fill={color} />
    </svg>
  );
}

/** Logo em arquivo usado como máscara: pinta o desenho com qualquer cor (padrão: cor do texto). */
export function MaskLogo({ file, height, color, alt }: { file: LogoFile; height: number; color?: string; alt: string }) {
  const url = `url("${file.src}")`;
  return (
    <span role="img" aria-label={alt} className="inline-block shrink-0 align-middle"
      style={{ height, width: Math.round(height * file.aspect), backgroundColor: color ?? 'currentColor', WebkitMaskImage: url, maskImage: url, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'left center', maskPosition: 'left center' }} />
  );
}

/**
 * Selo "◎ ELEIÇÕES" da cobertura. Usa o arquivo da marca quando existe
 * (colorido em fundo claro, se pedido); senão, desenha o alvo + texto.
 */
export function ElectionLockup({ brand, height, color, colored = false, label = 'Eleições' }: { brand: BrandTheme; height: number; color?: string; colored?: boolean; label?: string }) {
  const lockup = brand.logo.kind === 'target' ? brand.logo.lockup : undefined;
  if (lockup && colored && lockup.color) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={lockup.color.src} alt={label} className="inline-block shrink-0" style={{ height, width: Math.round(height * lockup.color.aspect) }} />;
  }
  if (lockup) return <MaskLogo file={lockup.white} height={height} color={color} alt={label} />;
  return (
    <span className="inline-flex items-center gap-2.5 font-black leading-none" style={{ color, fontSize: height * 0.75 }}>
      <TargetMark size={height * 0.85} />{label.toLocaleUpperCase('pt-BR')}
    </span>
  );
}

export function BrandLogo({ brand, size = 40, color }: { brand: BrandTheme; size?: number; color?: string }) {
  if (brand.logo.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logo.src} alt={brand.logo.alt} style={{ height: brand.logo.height }} />;
  }
  if (brand.logo.kind === 'superscript') {
    if (brand.logo.image) return <MaskLogo file={brand.logo.image} height={Math.round(size * 1.05)} color={color} alt={brand.name} />;
    return (
      <span className="inline-flex items-start font-tv font-extrabold tracking-tight leading-none" style={{ color, fontSize: size * 1.05 }}>
        <span>{brand.logo.wordmark}</span>
        <span className="-mt-[0.12em] ml-[0.04em]"><TargetMark size={size * 0.5} /></span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-3 font-tv font-black tracking-tight leading-none" style={{ color, fontSize: size * 0.82 }}>
      <TargetMark size={size} />
      <span>{brand.logo.wordmark}</span>
    </span>
  );
}

// ------------------------------------------------------- Número animado ---
export function AnimatedNumber({ value, format = fmtInt, duration = 700 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const shownRef = useRef(value);
  useEffect(() => {
    fromRef.current = shownRef.current;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = fromRef.current + (value - fromRef.current) * eased;
      shownRef.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(shown)}</>;
}

// ------------------------------------------------------------- Frentes ----
export function FrontSwatch({ legend, size = 14, round = false }: { legend: string | null; size?: number; round?: boolean }) {
  return <span className="inline-block shrink-0" style={{ width: size, height: size, background: frontColor(legend), borderRadius: round ? 999 : 4 }} />;
}

/** Pílula sólida com a sigla da frente. */
export function FrontPill({ legend, size = 'md' }: { legend: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const c = frontColor(legend);
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[13px]' : size === 'lg' ? 'px-4 py-1.5 text-2xl' : 'px-3 py-1 text-base';
  return (
    <span className={`inline-flex items-center rounded-full font-extrabold tracking-wide ${pad}`} style={{ background: c, color: textOn(c) }}>
      {legend ?? '—'}
    </span>
  );
}

export const frontInk = (legend: string | null) => readableOnDark(frontColor(legend));

export function FrontLabel({ legend, showName = true }: { legend: string; showName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <FrontSwatch legend={legend} />
      <span className="font-extrabold">{legend}</span>
      {showName && <span className="text-tv-muted truncate">{frontName(legend)}</span>}
    </span>
  );
}

// ---------------------------------------------------------- Variação -----
/** Variação com seta: verde-azulado para alta, rosa para queda (cores neutras às frentes). */
export function Delta({ value, unit = 'p.p.', digits = 1, className = '' }: { value: number; unit?: string; digits?: 0 | 1; className?: string }) {
  const zero = digits === 0 ? Math.round(value) === 0 : Math.abs(value) < 0.05;
  const color = zero ? 'rgb(var(--tv-muted))' : value > 0 ? '#3fd0b8' : '#ff7a95';
  const arrow = zero ? '•' : value > 0 ? '▲' : '▼';
  return (
    <span className={`inline-flex items-baseline gap-1 font-tvmono font-bold tabular-nums ${className}`} style={{ color }}>
      <span className="text-[0.7em]">{arrow}</span>
      {fmtSigned(value, digits)}
      {unit && <span className="text-[0.7em] font-tv font-semibold opacity-80">{unit}</span>}
    </span>
  );
}

export const GAIN = '#3fd0b8';
export const LOSS = '#ff7a95';

// --------------------------------------------------------------- Layout ---
export function Panel({ title, kicker, right, children, className = '', bodyClassName = '' }: {
  title?: React.ReactNode; kicker?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={`rounded-[28px] bg-tv-surface/90 border border-tv-border/70 flex flex-col min-h-0 min-w-0 overflow-hidden ${className}`}>
      {(title || right) && (
        <header className="flex items-end justify-between gap-4 px-7 pt-5 pb-3">
          <div className="min-w-0">
            {kicker && <div className="text-[13px] uppercase tracking-[0.2em] text-tv-kicker font-bold mb-0.5">{kicker}</div>}
            {title && <h2 className="text-[26px] font-extrabold leading-tight truncate">{title}</h2>}
          </div>
          {right}
        </header>
      )}
      <div className={`flex-1 min-h-0 ${title || right ? 'px-7 pb-6' : 'p-7'} ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function ProgressBar({ value, height = 8, color = 'rgb(var(--tv-accent))', track = 'rgb(var(--tv-border))' }: { value: number; height?: number; color?: string; track?: string }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: track }}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  );
}

export function Avatar({ name, legend, photo, size = 72 }: { name: string; legend: string | null; photo?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const c = frontColor(legend);
  return (
    <span className="relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden font-black"
      style={{ width: size, height: size, background: c, color: textOn(c), fontSize: size * 0.36, boxShadow: `0 0 0 3px rgb(var(--tv-surface)), 0 0 0 6px ${c}` }}>
      {photo && !broken
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photo} alt={name} className="w-full h-full object-cover" onError={() => setBroken(true)} />
        : initials}
    </span>
  );
}

export function Chip({ active, onClick, children, color }: { active?: boolean; onClick?: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button onClick={onClick}
      className={`h-11 px-5 rounded-full text-[17px] font-bold transition-colors border ${active ? 'bg-tv-text text-tv-bg border-tv-text' : 'bg-tv-surface2/60 text-tv-text border-tv-border hover:bg-tv-surface2'}`}
      style={active && color ? { background: color, borderColor: color, color: textOn(color) } : undefined}>
      {children}
    </button>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-[22px] bg-tv-surface2/60 border border-tv-border/60 px-5 py-4 min-w-0">
      <div className="text-[13px] uppercase tracking-[0.16em] text-tv-muted font-bold truncate">{label}</div>
      <div className="text-[40px] font-black leading-none mt-2 tabular-nums">{value}</div>
      {sub && <div className="text-[15px] text-tv-muted mt-1.5 truncate">{sub}</div>}
    </div>
  );
}

export function StatusChip({ label, bg, fg, final, size = 'md' }: { label: string; bg: string; fg: string; final?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const pad = size === 'sm' ? 'px-2.5 py-0.5 text-[13px]' : size === 'lg' ? 'px-5 py-2 text-[22px]' : 'px-3 py-1 text-[15px]';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-extrabold uppercase tracking-wide whitespace-nowrap ${pad}`}
      style={{ background: bg, color: fg }}>
      {final && <span aria-hidden>✓</span>}
      {label}
    </span>
  );
}

// ------------------------------------------------------------- Selo n8 ---
/** Gradiente roxo do n8 (portal de notícias), usado nas duas marcas. */
export const N8_GRADIENT = 'linear-gradient(90deg, #8f00ff 0%, #6a1bff 45%, rgba(106, 27, 255, 0) 100%)';

/** Selo "n⁸" no início das faixas de notícias. */
export function N8Seal({ size = 30, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`h-full shrink-0 flex items-center pl-4 pr-10 text-white font-black leading-none ${className}`} style={{ background: N8_GRADIENT, fontSize: size }}>
      n<sup className="text-[0.55em] -translate-y-[0.15em]">8</sup>
    </div>
  );
}

/** Concordância de gênero: g('eleito', 'eleita', gender). */
export const g = (m: string, f: string, gender?: 'F' | 'M' | null) => (gender === 'F' ? f : m);
