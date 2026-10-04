// components/tv/BreakingStinger.tsx
"use client";
// Vinheta "ÚLTIMA HORA" em tela cheia, para grandes anúncios. Só entra quando
// o operador dispara (controle → "Soltar última hora"); toca uma vez no telão
// e no CG. Cobre a tela inteira no meio da animação (ponto bom para o corte).
//  • Smartv: círculos concêntricos do símbolo ◎ abrem do centro (íris).
//  • SmartvNews: retângulos arredondados (os cartões da vinheta) sobem em cascata.
import React, { useEffect, useRef, useState } from 'react';
import type { BrandTheme } from '@/lib/brand';
import type { StingerCue } from '@/lib/haagar2026/control';
import { BrandLogo, TargetMark } from './ui';
import { STAGE_W, caseOf } from './TvChrome';

export const STINGER_MS = 3600;
// Disparo mais velho que isso (tela aberta depois, polling atrasado) não toca.
const MAX_AGE_MS = 3000;

/** Devolve a chave da vinheta enquanto ela toca (null no resto do tempo). */
export function useStinger(cue: StingerCue | undefined, clockOffset: number, ready: boolean): number | null {
  const lastRev = useRef<number | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const rev = cue?.rev ?? null;
  useEffect(() => {
    if (!ready || !cue || cue.rev === lastRev.current) return;
    lastRev.current = cue.rev;
    if (Date.now() + clockOffset - cue.at <= MAX_AGE_MS) setPlaying(cue.rev);
  }, [rev, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  // Timer próprio: o estado chega de novo a cada polling e não pode reiniciá-lo.
  useEffect(() => {
    if (playing === null) return;
    const t = setTimeout(() => setPlaying(null), STINGER_MS + 100);
    return () => clearTimeout(t);
  }, [playing]);
  return playing;
}

export default function BreakingStinger({ brand }: { brand: BrandTheme }) {
  return (
    <div className="absolute inset-0 z-[60] overflow-hidden pointer-events-none" style={{ ['--tv-stinger-ms' as string]: `${STINGER_MS}ms` }}>
      {brand.backdrop === 'pills' ? <NewsStinger brand={brand} /> : <SmartvStinger brand={brand} />}
    </div>
  );
}

// ---------------------------------------------------------------- Smartv --
// Duas íris (creme e vermelho) abrem do centro; anéis do ◎ pulsam para fora
// atrás do texto; na saída o vermelho fecha primeiro e depois o creme.
function SmartvStinger({ brand }: { brand: BrandTheme }) {
  return (
    <>
      <div className="absolute inset-0 tv-stinger tv-stinger-iris-a" style={{ background: 'rgb(var(--tv-paper))' }} />
      <div className="absolute inset-0 tv-stinger tv-stinger-iris-b"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgb(var(--tv-accent)) 0%, rgb(var(--tv-accent2)) 85%)' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="absolute left-1/2 top-1/2 rounded-full tv-stinger-ring"
            style={{ width: 900, height: 900, marginLeft: -450, marginTop: -450, border: '70px solid rgb(var(--tv-paper) / 0.14)', animationDelay: `${i * 520}ms` }} />
        ))}
        <div className="absolute left-1/2 top-1/2 rounded-full" style={{ width: 1500, height: 1500, marginLeft: -750, marginTop: -750, border: '110px solid rgb(var(--tv-ink) / 0.18)' }} />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white tv-stinger tv-stinger-text">
        <TargetMark size={150} color="rgb(var(--tv-paper))" />
        <div className="mt-6 text-center font-black leading-[0.86] tracking-[-0.02em]" style={{ fontSize: 300, textShadow: '0 12px 50px rgb(0 0 0 / 0.25)' }}>
          <div>{caseOf(brand, 'Última')}</div>
          <div>{caseOf(brand, 'hora')}</div>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------ SmartvNews --
// Duas ondas de cartões verticais: primeiro o gradiente azul-céu, por cima o
// azul royal; saem para cima na ordem inversa.
const BARS = 6;
const BAR_W = STAGE_W / BARS;

function NewsStinger({ brand }: { brand: BrandTheme }) {
  const bars = (wave: 'a' | 'b', bg: string) => Array.from({ length: BARS }).map((_, i) => (
    <div key={`${wave}-${i}`} className={`absolute rounded-[48px] tv-stinger tv-stinger-bar-${wave}`}
      style={{ left: i * BAR_W - 8, top: -40, width: BAR_W + 16, height: 1160, background: bg, animationDelay: `${i * 55}ms` }} />
  ));
  return (
    <>
      {bars('a', 'linear-gradient(170deg, #00e5ff 0%, #12b4ff 35%, rgb(var(--tv-accent2)) 70%, #2a8cff 100%)')}
      {bars('b', 'linear-gradient(175deg, rgb(var(--tv-accent)) 0%, rgb(var(--tv-accent)) 70%, rgb(var(--tv-bg)) 130%)')}
      <div className="absolute inset-0 flex items-center tv-stinger tv-stinger-text-news">
        <div className="pl-[150px] text-white">
          <div className="flex items-center gap-6 mb-8">
            <span className="rounded-[14px] bg-tv-accent2 px-5 py-1.5 text-[40px] font-extrabold uppercase leading-tight">Ao vivo</span>
            <BrandLogo brand={brand} size={64} color="#ffffff" />
          </div>
          <div className="font-medium leading-[0.86] tracking-[-0.03em]" style={{ fontSize: 290 }}>
            <div>{caseOf(brand, 'última')}</div>
            <div>{caseOf(brand, 'hora')}</div>
          </div>
        </div>
      </div>
    </>
  );
}
