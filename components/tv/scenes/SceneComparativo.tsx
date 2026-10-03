// components/tv/scenes/SceneComparativo.tsx
"use client";
import React, { useMemo, useState } from 'react';
import type { ElectionSnapshot, DistrictSnapshot } from '@/lib/haagar2026/model';
import { FRONT_ORDER, STATE_ORDER, frontColor, frontName } from '@/lib/haagar/rules';
import { Chip, Delta, Panel, fmtPct, GAIN, LOSS } from '../ui';

type Metric = 'share' | 'turnout' | 'margin';

const W = 860, H = 620, PAD = 64;

export default function SceneComparativo({ snap, onDistrict }: { snap: ElectionSnapshot; onDistrict: (id: number) => void }) {
  const [front, setFront] = useState('TDS');
  const [metric, setMetric] = useState<Metric>('share');
  const [ufFilter, setUfFilter] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const pts = useMemo(() => snap.districts
    .filter(d => d.counted > 0 && (!ufFilter || d.uf === ufFilter))
    .map(d => {
      let x = 0, y = 0;
      if (metric === 'share') { x = d.prev.shares[front] ?? 0; y = d.shares[front] ?? 0; }
      else if (metric === 'turnout') { x = d.prev.turnout; y = d.turnout; }
      else { x = d.prev.marginPct; y = d.marginPct; }
      return { d, x, y, delta: y - x };
    }), [snap, front, metric, ufFilter]);

  const all = pts.flatMap(p => [p.x, p.y]);
  const lo = metric === 'turnout' ? Math.floor((Math.min(...all, 60) - 2) / 5) * 5 : 0;
  const hi = metric === 'turnout' ? Math.ceil((Math.max(...all, 80) + 2) / 5) * 5 : Math.ceil((Math.max(...all, 10) + 3) / 10) * 10;
  const sx = (v: number) => PAD + ((v - lo) / (hi - lo)) * (W - PAD * 1.5);
  const sy = (v: number) => H - PAD - ((v - lo) / (hi - lo)) * (H - PAD * 1.5);
  const ticks = Array.from({ length: 6 }, (_, i) => lo + ((hi - lo) * i) / 5);

  const sorted = [...pts].sort((a, b) => b.delta - a.delta);
  const ups = sorted.slice(0, 5);
  const downs = sorted.slice(-5).reverse();
  const avgDelta = pts.length ? pts.reduce((s, p) => s + p.delta, 0) / pts.length : 0;
  const hovered = pts.find(p => p.d.id === hover);

  const metricLabel = metric === 'share' ? `% de ${front}` : metric === 'turnout' ? 'Comparecimento' : 'Margem do vencedor';
  const dotColor = (d: DistrictSnapshot) => metric === 'share' ? frontColor(front) : frontColor(d.leader?.front ?? null);

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex items-center gap-3 flex-wrap">
        <Chip active={metric === 'share'} onClick={() => setMetric('share')}>Votação da frente</Chip>
        <Chip active={metric === 'turnout'} onClick={() => setMetric('turnout')}>Comparecimento</Chip>
        <Chip active={metric === 'margin'} onClick={() => setMetric('margin')}>Margem</Chip>
        <span className="w-px h-8 bg-tv-border mx-2" />
        {metric === 'share' && FRONT_ORDER.map(f => <Chip key={f} active={front === f} color={frontColor(f)} onClick={() => setFront(f)}>{f}</Chip>)}
        <span className="w-px h-8 bg-tv-border mx-2" />
        <Chip active={!ufFilter} onClick={() => setUfFilter(null)}>Todos</Chip>
        {STATE_ORDER.map(u => <Chip key={u} active={ufFilter === u} onClick={() => setUfFilter(u)}>{u}</Chip>)}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_620px] gap-6">
        <Panel kicker="Cada ponto é um distrito" title={`${metricLabel}: 2022 × 2026`}
          right={pts.length > 0 && <div className="text-right"><div className="text-[13px] uppercase tracking-wider text-tv-muted font-bold">Variação média</div><Delta value={avgDelta} className="text-[26px]" /></div>}
          bodyClassName="relative">
          {pts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-tv-muted text-[20px]">Aguardando votos apurados para comparar.</div>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" onMouseLeave={() => setHover(null)}>
              {/* área acima/abaixo da diagonal */}
              <polygon points={`${sx(lo)},${sy(lo)} ${sx(hi)},${sy(hi)} ${sx(lo)},${sy(hi)}`} fill={GAIN} opacity={0.06} />
              <polygon points={`${sx(lo)},${sy(lo)} ${sx(hi)},${sy(hi)} ${sx(hi)},${sy(lo)}`} fill={LOSS} opacity={0.06} />
              {ticks.map(t => (
                <g key={t}>
                  <line x1={sx(lo)} x2={sx(hi)} y1={sy(t)} y2={sy(t)} stroke="rgb(var(--tv-border))" strokeWidth={1} opacity={0.6} />
                  <text x={sx(lo) - 12} y={sy(t) + 5} textAnchor="end" fontSize={15} fill="rgb(var(--tv-muted))">{Math.round(t)}%</text>
                  <text x={sx(t)} y={sy(lo) + 28} textAnchor="middle" fontSize={15} fill="rgb(var(--tv-muted))">{Math.round(t)}%</text>
                </g>
              ))}
              <line x1={sx(lo)} y1={sy(lo)} x2={sx(hi)} y2={sy(hi)} stroke="rgb(var(--tv-text))" strokeWidth={2} strokeDasharray="6 8" opacity={0.6} />
              <text x={sx(hi) - 8} y={sy(hi) + 24} textAnchor="end" fontSize={14} fill="rgb(var(--tv-muted))">igual a 2022</text>
              <text x={sx(lo) + 12} y={sy(hi) + 22} fontSize={15} fontWeight={700} fill={GAIN}>▲ cresceu</text>
              <text x={sx(hi) - 12} y={sy(lo) - 14} textAnchor="end" fontSize={15} fontWeight={700} fill={LOSS}>▼ caiu</text>
              <text x={(sx(lo) + sx(hi)) / 2} y={H - 8} textAnchor="middle" fontSize={15} fontWeight={700} fill="rgb(var(--tv-muted))">2022 →</text>
              <text x={16} y={(sy(lo) + sy(hi)) / 2} textAnchor="middle" fontSize={15} fontWeight={700} fill="rgb(var(--tv-muted))" transform={`rotate(-90 16 ${(sy(lo) + sy(hi)) / 2})`}>2026 →</text>
              {pts.map(p => (
                <g key={p.d.id} className="cursor-pointer" onMouseEnter={() => setHover(p.d.id)} onClick={() => onDistrict(p.d.id)}>
                  <circle cx={sx(p.x)} cy={sy(p.y)} r={18} fill="transparent" />
                  <circle cx={sx(p.x)} cy={sy(p.y)} r={hover === p.d.id ? 10 : 7}
                    fill={dotColor(p.d)} fillOpacity={p.d.isFinal ? 0.95 : 0.5}
                    stroke="rgb(var(--tv-surface))" strokeWidth={2}
                    style={{ transition: 'cx 700ms ease, cy 700ms ease' }} />
                </g>
              ))}
            </svg>
          )}
          {hovered && (
            <div className="absolute top-20 right-10 rounded-2xl bg-tv-bg/95 border border-tv-border px-4 py-3 pointer-events-none min-w-[260px]">
              <div className="text-[12px] uppercase tracking-[0.16em] text-tv-muted font-bold">{hovered.d.ufName}</div>
              <div className="text-[22px] font-black">{hovered.d.name}</div>
              <div className="text-[16px] mt-1 tabular-nums">{fmtPct(hovered.x)} → {fmtPct(hovered.y)} <Delta value={hovered.delta} /></div>
              <div className="text-[13px] text-tv-muted mt-1">{fmtPct(hovered.d.reported)} apurado · toque para abrir</div>
            </div>
          )}
        </Panel>

        <div className="grid grid-rows-2 gap-6 min-h-0">
          <MoversPanel title="Maiores avanços" kicker={metricLabel} rows={ups} onDistrict={onDistrict} />
          <MoversPanel title="Maiores quedas" kicker={metric === 'share' ? frontName(front) : metricLabel} rows={downs} onDistrict={onDistrict} />
        </div>
      </div>
    </div>
  );
}

function MoversPanel({ title, kicker, rows, onDistrict }: { title: string; kicker: string; rows: { d: DistrictSnapshot; x: number; y: number; delta: number }[]; onDistrict: (id: number) => void }) {
  const max = Math.max(1, ...rows.map(r => Math.abs(r.delta)));
  return (
    <Panel kicker={kicker} title={title} bodyClassName="flex flex-col gap-1">
      {rows.length === 0 && <div className="text-tv-muted">—</div>}
      {rows.map(r => (
        <button key={r.d.id} onClick={() => onDistrict(r.d.id)} className="grid grid-cols-[1fr_150px_110px] items-center gap-3 text-left rounded-xl px-2 py-0.5 hover:bg-tv-surface2/60">
          <span className="min-w-0">
            <span className="block text-[18px] font-bold truncate">{r.d.name}</span>
            <span className="block text-[13px] text-tv-muted tabular-nums">{r.d.uf} · {fmtPct(r.x)} → {fmtPct(r.y)}</span>
          </span>
          <span className="h-3 rounded-full bg-tv-border/50 overflow-hidden">
            <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${(Math.abs(r.delta) / max) * 100}%`, background: r.delta >= 0 ? GAIN : LOSS }} />
          </span>
          <span className="text-right"><Delta value={r.delta} className="text-[18px]" /></span>
        </button>
      ))}
    </Panel>
  );
}
