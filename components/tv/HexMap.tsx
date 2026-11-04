// components/tv/HexMap.tsx
"use client";
import React, { useMemo, useState } from 'react';
import { haagarDistrictLayout, haagarStateLayout } from '@/lib/mapLayout';
import type { DistrictSnapshot } from '@/lib/haagar2026/model';
import { frontColor, frontName } from '@/lib/haagar/rules';
import { fmtPct, FrontPill, StatusChip, Delta } from './ui';

export type MapMode = 'resultado' | '2022' | 'viradas' | 'apuracao' | 'swing';

// --------------------------------------------------------- Geometria ------
interface HexGeo { id: number; d: string; cx: number; cy: number; minX: number; minY: number; maxX: number; maxY: number }

function parsePath(d: string) {
  const pts: [number, number][] = [];
  const re = /([MLHVZ])([^MLHVZ]*)/gi;
  let x = 0, y = 0, m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const nums = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const cmd = m[1].toUpperCase();
    if (cmd === 'M' || cmd === 'L') { for (let i = 0; i + 1 < nums.length; i += 2) { x = nums[i]; y = nums[i + 1]; pts.push([x, y]); } }
    else if (cmd === 'H') { nums.forEach(n => { x = n; pts.push([x, y]); }); }
    else if (cmd === 'V') { nums.forEach(n => { y = n; pts.push([x, y]); }); }
  }
  return pts;
}

const HEXES: HexGeo[] = haagarDistrictLayout.map(l => {
  const d = l.paths[0].d;
  const pts = parsePath(d);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { id: parseInt(l.id, 10), d, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, minX, minY, maxX, maxY };
});

const UF_BY_STATE_LAYOUT: Record<string, string> = { '1': 'TP', '2': 'MA', '3': 'MP', '4': 'BA', '5': 'PB', '6': 'PN' };
const STATE_OUTLINES = haagarStateLayout.map(s => ({ uf: UF_BY_STATE_LAYOUT[s.id], d: s.paths[0].d }));

const ufOf = (id: number) => UF_BY_STATE_LAYOUT[String(Math.floor(id / 100))];

// ------------------------------------------------------------ Cores -------
const NEUTRAL = 'rgb(var(--tv-surface2))';
const SWING_POS = '#3fd0b8';
const SWING_NEG = '#ff7a95';
const SWING_MID = '#6b5d5c';

const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

function fillFor(d: DistrictSnapshot | undefined, mode: MapMode, swingFront: string): { fill: string; opacity: number } {
  if (!d) return { fill: NEUTRAL, opacity: 1 };
  switch (mode) {
    case '2022':
      return { fill: d.prev.front ? frontColor(d.prev.front) : NEUTRAL, opacity: 1 };
    case 'apuracao':
      return { fill: d.reported <= 0 ? NEUTRAL : mix('#4a2a2a', '#ffd9d0', d.reported / 100), opacity: 1 };
    case 'viradas':
      if (d.flipped && d.leader) return { fill: frontColor(d.leader.front), opacity: 1 };
      if (d.leadingFlip && d.leader) return { fill: frontColor(d.leader.front), opacity: 0.4 };
      return { fill: NEUTRAL, opacity: 0.55 };
    case 'swing': {
      if (!d.leader) return { fill: NEUTRAL, opacity: 1 };
      const delta = (d.shares[swingFront] ?? 0) - (d.prev.shares[swingFront] ?? 0);
      const t = Math.min(1, Math.abs(delta) / 15);
      return { fill: mix(SWING_MID, delta >= 0 ? SWING_POS : SWING_NEG, t), opacity: 1 };
    }
    default:
      if (!d.leader) return { fill: NEUTRAL, opacity: 1 };
      return { fill: frontColor(d.leader.front), opacity: d.isFinal ? 1 : 0.42 };
  }
}

// ------------------------------------------------------------ Mapa --------
interface HexMapProps {
  districts: Record<number, DistrictSnapshot>;
  mode?: MapMode;
  swingFront?: string;
  uf?: string | null;                 // zoom em um estado
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  showLabels?: boolean;
  className?: string;
  /** Mapa de setas: uma seta por distrito (direita = alta, esquerda = queda), tamanho ∝ |valor|. */
  arrows?: Record<number, ArrowSpec>;
}

export interface ArrowSpec { value: number; color: string; label?: string }

/** Escala fixa: cada ponto percentual = 230 unidades do mapa (um hexágono ≈ 1850). */
export const ARROW_PER_PP = 230;
const ARROW_ANGLE = 24 * Math.PI / 180;

function Arrow({ cx, cy, spec, scale }: { cx: number; cy: number; spec: ArrowSpec; scale: number }) {
  const len = Math.max(180, Math.abs(spec.value) * scale);
  const dir = spec.value >= 0 ? 1 : -1;
  const dx = Math.cos(ARROW_ANGLE) * len * dir;
  const dy = -Math.sin(ARROW_ANGLE) * len;
  const x2 = cx + dx, y2 = cy + dy;
  const ux = dx / len, uy = dy / len;              // direção unitária
  const head = 240, wing = 120;
  const bx = x2 - ux * head, by = y2 - uy * head;  // base da ponta
  const px = -uy * wing, py = ux * wing;           // perpendicular
  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={cx} y1={cy} x2={bx} y2={by} stroke={spec.color} strokeWidth={62} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`} fill={spec.color} />
    </g>
  );
}

export default function HexMap({ districts, mode = 'resultado', swingFront = 'TDS', uf = null, selectedId = null, onSelect, showLabels = false, className = '', arrows }: HexMapProps) {
  const [hover, setHover] = useState<{ id: number; x: number; y: number; w: number; h: number } | null>(null);

  const visible = useMemo(() => (uf ? HEXES.filter(h => ufOf(h.id) === uf) : HEXES), [uf]);
  const viewBox = useMemo(() => {
    const pad = uf ? 500 : 250;
    const minX = Math.min(...visible.map(h => h.minX)) - pad, maxX = Math.max(...visible.map(h => h.maxX)) + pad;
    const minY = Math.min(...visible.map(h => h.minY)) - pad, maxY = Math.max(...visible.map(h => h.maxY)) + pad;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [visible, uf]);

  const hovered = hover ? districts[hover.id] : undefined;
  const arrowScale = ARROW_PER_PP;

  return (
    <div className={`relative w-full h-full ${className}`} onMouseLeave={() => setHover(null)}>
      <svg viewBox={viewBox} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="hexGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="120" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Silhueta dos estados ao fundo */}
        {STATE_OUTLINES.filter(s => !uf || s.uf === uf).map(s => (
          <path key={`bg-${s.uf}`} d={s.d} fill="rgb(var(--tv-surface))" stroke="rgb(var(--tv-border))" strokeWidth={70} strokeLinejoin="round" />
        ))}
        {visible.map(h => {
          const d = districts[h.id];
          // no mapa de setas os hexágonos ficam apagados para as setas aparecerem
          const { fill, opacity } = arrows
            ? { fill: NEUTRAL, opacity: 0.75 }
            : fillFor(d, mode, swingFront);
          const isSel = selectedId === h.id;
          return (
            <g key={h.id}
              className="cursor-pointer"
              onClick={() => onSelect?.(h.id)}
              onMouseMove={e => {
                const box = e.currentTarget.ownerSVGElement?.parentElement as HTMLElement;
                const rect = box.getBoundingClientRect();
                const scale = rect.width / box.offsetWidth || 1;
                setHover({ id: h.id, x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale, w: box.offsetWidth, h: box.offsetHeight });
              }}>
              <path d={h.d} fill="rgb(var(--tv-bg))" />
              <path d={h.d} fill={fill} fillOpacity={opacity}
                stroke="rgb(var(--tv-bg))" strokeWidth={90} strokeLinejoin="round"
                style={{ transition: 'fill 600ms ease, fill-opacity 600ms ease' }} />
              {!arrows && mode === 'resultado' && d?.flipped && (
                <circle cx={h.cx} cy={h.cy} r={150} fill="rgb(var(--tv-text))" opacity={0.95} />
              )}
              {isSel && <path d={h.d} fill="none" stroke="rgb(var(--tv-text))" strokeWidth={110} strokeLinejoin="round" filter="url(#hexGlow)" />}
              {hover?.id === h.id && !isSel && <path d={h.d} fill="none" stroke="rgb(var(--tv-text))" strokeWidth={70} strokeLinejoin="round" opacity={0.8} />}
              {showLabels && d && (
                <text x={h.cx} y={h.cy + 70} textAnchor="middle" fontSize={190} fontWeight={800}
                  fill={fill === NEUTRAL || opacity < 0.6 ? 'rgb(var(--tv-text))' : '#fff'}
                  style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.35)', strokeWidth: 30 }}>
                  {shortName(d.name)}
                </text>
              )}
            </g>
          );
        })}
        {/* Contorno dos estados por cima */}
        {STATE_OUTLINES.filter(s => !uf || s.uf === uf).map(s => (
          <path key={`ol-${s.uf}`} d={s.d} fill="none" stroke="rgb(var(--tv-text))" strokeOpacity={0.55} strokeWidth={45} strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
        ))}
        {/* Setas por cima de tudo (as menores primeiro, as maiores ficam visíveis) */}
        {arrows && visible
          .filter(h => arrows[h.id])
          .sort((a, b) => Math.abs(arrows[a.id].value) - Math.abs(arrows[b.id].value))
          .map(h => <Arrow key={`ar-${h.id}`} cx={h.cx} cy={h.cy} spec={arrows[h.id]} scale={arrowScale} />)}
      </svg>

      {hovered && hover && (
        <div className="absolute z-20 pointer-events-none w-[340px] rounded-2xl bg-tv-bg/95 border border-tv-border shadow-2xl p-4"
          style={{ left: hover.x + 18, top: hover.y + 18, transform: `${hover.x > hover.w * 0.6 ? 'translateX(calc(-100% - 36px))' : ''} ${hover.y > hover.h * 0.55 ? 'translateY(calc(-100% - 36px))' : ''}` }}>
          <div className="text-[12px] uppercase tracking-[0.18em] text-tv-muted font-bold">{hovered.ufName} · {hovered.id}</div>
          <div className="text-[22px] font-extrabold leading-tight">{hovered.name}</div>
          {hovered.leader ? (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <StatusChip label={hovered.status.label} bg={hovered.status.backgroundColor} fg={hovered.status.textColor} final={hovered.isFinal} size="sm" />
              <span className="text-[15px] font-semibold truncate">{hovered.leader.name}</span>
            </div>
          ) : <div className="mt-2 text-tv-muted text-[15px]">Aguardando primeiras urnas</div>}
          <div className="mt-3 grid grid-cols-2 gap-2 text-[14px]">
            <div><div className="text-tv-muted">Apurado</div><div className="font-bold">{fmtPct(hovered.reported)}</div></div>
            <div><div className="text-tv-muted">2022</div><div className="flex items-center gap-1.5"><FrontPill legend={hovered.prev.front} size="sm" /></div></div>
            {arrows?.[hovered.id] && (
              <div className="col-span-2"><span className="text-tv-muted">{arrows[hovered.id].label ?? 'Variação'}: </span>
                <Delta value={arrows[hovered.id].value} />
              </div>
            )}
            {!arrows && mode === 'swing' && hovered.leader && (
              <div className="col-span-2"><span className="text-tv-muted">{frontName(swingFront)}: </span>
                <Delta value={(hovered.shares[swingFront] ?? 0) - (hovered.prev.shares[swingFront] ?? 0)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function shortName(name: string) {
  const first = name.split(/\s+e\s+|,/)[0];
  return first.length > 12 ? first.slice(0, 11) + '…' : first;
}

/** Legenda do mapa para o modo atual. */
export function MapLegend({ mode, fronts, swingFront }: { mode: MapMode; fronts: string[]; swingFront: string }) {
  if (mode === 'apuracao') {
    return (
      <div className="flex items-center gap-3 text-[14px] text-tv-muted">
        <span>0%</span>
        <span className="h-3 w-48 rounded-full" style={{ background: 'linear-gradient(90deg,#4a2a2a,#ffd9d0)' }} />
        <span>100% apurado</span>
      </div>
    );
  }
  if (mode === 'swing') {
    return (
      <div className="flex items-center gap-3 text-[14px] text-tv-muted">
        <span>{frontName(swingFront)}: queda</span>
        <span className="h-3 w-48 rounded-full" style={{ background: `linear-gradient(90deg,${SWING_NEG},${SWING_MID},${SWING_POS})` }} />
        <span>alta (vs 2022)</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-x-5 gap-y-1 flex-wrap text-[15px]">
      {fronts.map(f => (
        <span key={f} className="inline-flex items-center gap-2 font-bold">
          <span className="w-3.5 h-3.5 rounded" style={{ background: frontColor(f) }} />{f}
        </span>
      ))}
      {mode === 'resultado' && (
        <>
          <span className="inline-flex items-center gap-2 text-tv-muted"><span className="w-3.5 h-3.5 rounded bg-tv-text/25" />Tom escuro: ainda liderando</span>
          <span className="inline-flex items-center gap-2 text-tv-muted"><span className="w-2.5 h-2.5 rounded-full bg-tv-text" />Virou</span>
        </>
      )}
      {mode === 'viradas' && <span className="text-tv-muted">Cor da frente que tomou a cadeira</span>}
    </div>
  );
}
