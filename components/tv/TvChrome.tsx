// components/tv/TvChrome.tsx
"use client";
// Moldura do telão: palco 1920×1080 escalável, fundo da marca, barra
// superior, tarja inferior (hora · selo · faixa) e plantão de última hora.
import React, { useEffect, useRef, useState } from 'react';
import type { BrandTheme } from '@/lib/brand';
import { brandCssVars } from '@/lib/brand';
import { frontColor, textOn } from '@/lib/haagar/rules';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { BrandLogo, N8Seal, fmtPct } from './ui';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

export const caseOf = (brand: BrandTheme, text: string) =>
  brand.titleCase === 'upper' ? text.toLocaleUpperCase('pt-BR') : brand.titleCase === 'lower' ? text.toLocaleLowerCase('pt-BR') : text;

// --------------------------------------------------------------- Palco ----
export function Stage({ brand, children, background }: { brand: BrandTheme; children: React.ReactNode; background?: string }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className={`tv-stage fixed inset-0 overflow-hidden font-tv text-tv-text ${background === undefined ? 'bg-tv-bg' : ''}`}
      style={{ ...(brandCssVars(brand) as React.CSSProperties), ...(background !== undefined ? { background } : {}) }}>
      <div className="absolute left-1/2 top-1/2" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {background === undefined && <Backdrop brand={brand} />}
        <div className="relative w-full h-full">{children}</div>
      </div>
    </div>
  );
}

function Backdrop({ brand }: { brand: BrandTheme }) {
  if (brand.backdrop === 'pills') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(1200px 700px at 85% -10%, rgb(var(--tv-bg-glow) / 0.55), transparent 60%), radial-gradient(900px 600px at -5% 110%, rgb(var(--tv-accent2) / 0.25), transparent 60%)' }} />
        {[180, 520, 860, 1200, 1540].map((x, i) => (
          <div key={x} className="absolute rounded-full border border-tv-text/[0.06]" style={{ left: x, top: i % 2 ? -260 : 420, width: 300, height: 900 }} />
        ))}
        <div className="absolute -right-24 top-24 w-[220px] h-[420px] rounded-[48px] bg-tv-accent/30" />
        <div className="absolute -left-28 bottom-40 w-[200px] h-[360px] rounded-[48px] bg-tv-accent2/20" />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(1400px 900px at 0% 0%, rgb(var(--tv-bg-glow) / 0.55), transparent 55%)' }} />
      <div className="absolute rounded-full" style={{ width: 1500, height: 1500, right: -1080, top: -1020, background: 'radial-gradient(circle at 30% 70%, rgb(var(--tv-accent) / 0.55), rgb(var(--tv-accent) / 0.12) 55%, transparent 70%)' }} />
      <div className="absolute rounded-full border-[90px] border-tv-accent/[0.07]" style={{ width: 1900, height: 1900, left: -1500, bottom: -1500 }} />
    </div>
  );
}

// ------------------------------------------------------- Barra superior ---
export interface NavItem { id: string; label: string; active: boolean; onClick: () => void }

export function TopBar({ brand, snap, nav, onLogoLongPress }: { brand: BrandTheme; snap: ElectionSnapshot | null; nav: NavItem[]; onLogoLongPress: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = () => { timer.current = setTimeout(onLogoLongPress, 1200); };
  const cancel = () => { if (timer.current) clearTimeout(timer.current); };
  const reported = snap?.reported ?? 0;

  return (
    <header className="absolute left-10 right-10 top-7 h-[84px] flex items-center gap-6">
      <div className="flex items-center gap-5 shrink-0 select-none" onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel}>
        <div className="text-tv-kicker"><BrandLogo brand={brand} size={44} color="rgb(var(--tv-text))" /></div>
        <div className="w-px h-12 bg-tv-text/20" />
        <div>
          <div className="text-[30px] font-black leading-none tracking-tight">{caseOf(brand, brand.programTitle)} 2026</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="rounded-md bg-tv-accent2 text-white px-2 py-0.5 text-[13px] font-extrabold tracking-wide">{caseOf(brand, 'Haagar')}</span>
            <span className="rounded-md bg-tv-text/15 px-2 py-0.5 text-[13px] font-extrabold tracking-wide inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tv-live tv-pulse" />{caseOf(brand, 'Ao vivo')}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 flex justify-center">
        <div className="flex gap-1 rounded-full bg-tv-surface/80 border border-tv-border/70 p-1.5">
          {nav.map(n => (
            <button key={n.id} onClick={n.onClick}
              className={`h-12 px-6 rounded-full text-[18px] font-bold transition-colors ${n.active ? 'bg-tv-accent text-tv-accent-text' : 'text-tv-text/80 hover:bg-tv-surface2'}`}>
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="shrink-0 w-[300px]">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] uppercase tracking-[0.18em] font-bold text-tv-muted">Votos apurados</span>
          <span className="text-[34px] font-black tabular-nums leading-none">{fmtPct(reported, 2)}</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-tv-surface2 overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${reported}%`, background: 'linear-gradient(90deg, rgb(var(--tv-accent)), rgb(var(--tv-accent2)))' }} />
        </div>
      </div>
    </header>
  );
}

// ------------------------------------------------------- Tarja inferior ---
export function Ticker({ brand, items, right }: { brand: BrandTheme; items: string[]; right?: React.ReactNode }) {
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);
  const list = items.length ? items : ['Acompanhe a apuração das eleições legislativas de Haagar'];
  const duration = Math.max(40, list.join(' ').length / 9);

  return (
    <footer className="absolute left-10 right-10 bottom-6 h-[56px] flex gap-3">
      <div className="w-[150px] rounded-[14px] bg-tv-accent text-tv-accent-text flex items-center justify-center text-[26px] font-black tabular-nums">{clock}</div>
      <div className="flex-1 rounded-[14px] bg-tv-text/[0.14] backdrop-blur overflow-hidden flex items-center">
        <N8Seal size={30} />
        <div className="relative flex-1 overflow-hidden h-full">
          <div className="tv-marquee absolute inset-y-0 left-0 flex items-center whitespace-nowrap" style={{ ['--tv-marquee-duration' as string]: `${duration}s` }}>
            {[0, 1].map(k => (
              <span key={k} className="flex items-center">
                {list.map((t, i) => (
                  <span key={`${k}-${i}`} className="px-10 text-[21px] font-bold tracking-wide">{caseOf(brand, t)}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
      {right}
    </footer>
  );
}

// ------------------------------------------------------- Última hora -----
import type { Breaking } from '@/lib/haagar2026/useBreaking';
export type { Breaking };

/** Tarja de manchete (estilo "edição das 19h"): aparece por alguns segundos. */
export function LowerThird({ brand, item }: { brand: BrandTheme; item: Breaking | null }) {
  if (!item) return null;
  const c = item.front ? frontColor(item.front) : null;
  return (
    <div key={item.id} className="absolute left-10 right-10 bottom-[92px] h-[124px] flex rounded-[22px] overflow-hidden shadow-2xl tv-scene-in z-30"
      style={{ background: 'rgb(var(--tv-surface2) / 0.97)' }}>
      <div className="w-[230px] shrink-0 flex flex-col justify-center px-6 text-white leading-tight"
        style={{ background: 'linear-gradient(120deg, rgb(var(--tv-accent2)), rgb(var(--tv-accent)) 55%, transparent)' }}>
        <span className="text-[30px] font-medium">{caseOf(brand, 'Última')}</span>
        <span className="text-[30px] font-medium">{caseOf(brand, 'hora')}</span>
      </div>
      {c && <div className="w-3 shrink-0" style={{ background: c }} />}
      <div className="flex-1 flex flex-col justify-center px-8 min-w-0">
        <div className="text-[44px] font-black leading-none truncate uppercase">{item.headline}</div>
        <div className="text-[24px] font-semibold mt-2 truncate uppercase text-tv-text/85">{item.sub}</div>
      </div>
      {item.front && (
        <div className="shrink-0 flex items-center pr-8">
          <span className="rounded-full px-6 py-2 text-[32px] font-black" style={{ background: c!, color: textOn(c!) }}>{item.front}</span>
        </div>
      )}
    </div>
  );
}
