// components/tv/IdleScreen.tsx
"use client";
// Tela de espera (idle) com a vinheta da marca: painel claro com o título e,
// à direita, a grade de pílulas que desliza para a esquerda encolhendo —
// as colunas seguem uma progressão geométrica, então o loop é contínuo.
import React, { useEffect, useRef, useState } from 'react';
import type { BrandTheme } from '@/lib/brand';
import { BrandLogo, ElectionLockup } from './ui';
import PillGrid from './PillGrid';
import { STAGE_H, STAGE_W, caseOf } from './TvChrome';

const RATIO = 1.3;                  // cada coluna é 30% mais larga que a anterior
const ROWS = [0.27, 0.345, 0.385];  // alturas relativas das linhas (cima → baixo)
const SECONDS_PER_COLUMN = 3.2;
const GAP = 4;
const POOL = 16;                    // colunas desenhadas (as menores somem atrás do painel)

export default function IdleScreen(props: IdleProps) {
  return props.brand.backdrop === 'pills' ? <NewsIdle {...props} /> : <SmartvIdle {...props} />;
}

interface IdleProps { brand: BrandTheme; onExit?: () => void; info?: string }

function useClock() {
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => { const d = new Date(); setClock(`${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`); };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

// ------------------------------------------------------------ SmartvNews --
// Três cartões (azul royal com o título, gradiente com o logo e faixa
// estreita). Os gradientes passeiam lentamente.
function NewsIdle({ brand, onExit, info }: IdleProps) {
  const clock = useClock();
  return (
    <div className="absolute inset-0 z-40 overflow-hidden cursor-pointer" style={{ background: 'rgb(var(--tv-paper))' }} onClick={onExit}>
      <div className="absolute rounded-[48px] flex items-center justify-between px-[60px] text-white"
        style={{ left: 33, top: 35, width: 798, height: 1008, background: 'rgb(var(--tv-accent))' }}>
        <span className="text-[118px] font-light leading-none tracking-tight">{caseOf(brand, 'Eleições')}</span>
        <svg width="80" height="80" viewBox="0 0 100 100" className="opacity-60" aria-hidden>
          <path d="M4 50 H94 M50 6 L94 50 L50 94" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
        <div className="absolute left-[60px] right-[60px] bottom-[52px] flex items-end justify-between text-white/80">
          <div>
            <div className="text-[30px] font-bold leading-none">{caseOf(brand, 'Haagar 2026')}</div>
            {info && <div className="text-[22px] mt-2 opacity-80">{info}</div>}
          </div>
          <div className="text-[28px] font-semibold tabular-nums">{clock}</div>
        </div>
      </div>

      <div className="absolute rounded-[48px] overflow-hidden flex items-center justify-center"
        style={{ left: 861, top: 35, width: 766, height: 1010 }}>
        <div className="absolute inset-[-40%] tv-idle-drift" style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #12b4ff 30%, #2a8cff 55%, #3d6bff 70%, #0080ff 100%)' }} />
        <div className="absolute inset-[-40%] tv-idle-drift-2" style={{ background: 'radial-gradient(40% 35% at 70% 30%, rgba(120,150,255,0.55), transparent 70%), radial-gradient(45% 40% at 25% 80%, rgba(0,200,255,0.45), transparent 70%)' }} />
        <div className="relative"><BrandLogo brand={brand} size={150} color="#ffffff" /></div>
      </div>

      <div className="absolute rounded-[48px] overflow-hidden" style={{ left: 1657, top: 35, width: 230, height: 1008 }}>
        <div className="absolute inset-[-60%] tv-idle-drift-3" style={{ background: 'linear-gradient(170deg, #2f6fc0 0%, #1d3fb0 35%, #1414c8 70%, #0c0c9a 100%)' }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Smartv --
function SmartvIdle({ brand, onExit, info }: IdleProps) {
  const panelW = Math.round(STAGE_W * 0.52);
  const clock = useClock();

  return (
    <div className="absolute inset-0 z-40 overflow-hidden cursor-pointer" style={{ background: 'rgb(var(--tv-ink))' }} onClick={onExit}>
      {/* ponto de fuga atrás do painel: as colunas menores ficam escondidas */}
      <PillGrid width={STAGE_W} height={STAGE_H} rows={ROWS} ratio={RATIO} secondsPerColumn={SECONDS_PER_COLUMN} gap={GAP} originX={270} pool={POOL} className="absolute inset-0" />

      {/* Painel do título */}
      <div className="absolute inset-y-0 left-0 rounded-r-[44px] flex flex-col justify-center pl-[96px] pr-16"
        style={{ width: panelW, background: 'rgb(var(--tv-paper))' }}>
        <div className="text-tv-accent">
          <ElectionLockup brand={brand} height={196} colored />
        </div>
        <div className="absolute left-[96px] bottom-[80px] right-16 flex items-end justify-between text-tv-ink">
          <div>
            <div className="text-[40px] font-extrabold leading-none">{caseOf(brand, 'Haagar 2026')}</div>
            {info && <div className="text-[24px] font-medium mt-2 opacity-75">{info}</div>}
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-tv-accent"><BrandLogo brand={brand} size={40} /></div>
            <div className="text-[28px] font-bold tabular-nums opacity-80">{clock}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
