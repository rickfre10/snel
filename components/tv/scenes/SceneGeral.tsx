// components/tv/scenes/SceneGeral.tsx
"use client";
import React, { useState } from 'react';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { FRONT_ORDER, MAJORITY, TOTAL_DISTRICT_SEATS, frontColor, frontName } from '@/lib/haagar/rules';
import HexMap, { MapLegend, MapMode } from '../HexMap';
import { SeatRaceBar } from '../charts';
import { AnimatedNumber, Chip, Delta, Panel, fmtInt, fmtPct } from '../ui';

const MODES: { id: MapMode; label: string }[] = [
  { id: 'resultado', label: '2026' },
  { id: '2022', label: '2022' },
  { id: 'viradas', label: 'Viradas' },
  { id: 'swing', label: 'Swing' },
  { id: 'apuracao', label: 'Apuração' },
];

export default function SceneGeral({ snap, onDistrict }: { snap: ElectionSnapshot; onDistrict: (id: number) => void }) {
  const [mode, setMode] = useState<MapMode>('resultado');
  const [swingFront, setSwingFront] = useState('TDS');
  // Mapa em foco: esconde a corrida pela maioria e a projeção de cadeiras
  const [expanded, setExpanded] = useState(false);
  const leader = snap.fronts[0];
  const prLeader = [...snap.fronts].sort((a, b) => b.prPct - a.prPct)[0];

  return (
    <div className={`h-full grid gap-6 ${expanded ? 'grid-cols-1' : 'grid-cols-[1fr_600px]'}`}>
      <div className="flex flex-col gap-6 min-h-0 min-w-0">
        <Panel kicker="Parlamento de Haagar" title="Mapa dos distritos"
          right={<div className="flex gap-2">
            {MODES.map(m => <Chip key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</Chip>)}
            <span className="w-px bg-tv-border mx-1" />
            <Chip active={expanded} onClick={() => setExpanded(e => !e)}>{expanded ? '⤡ Reduzir' : '⤢ Expandir'}</Chip>
          </div>}
          className="flex-1" bodyClassName="flex flex-col gap-3">
          {mode === 'swing' && (
            <div className="flex gap-2">
              {FRONT_ORDER.map(f => <Chip key={f} active={swingFront === f} color={frontColor(f)} onClick={() => setSwingFront(f)}>{f}</Chip>)}
            </div>
          )}
          <div className="flex-1 min-h-0">
            <HexMap districts={snap.districtById} mode={mode} swingFront={swingFront} onSelect={onDistrict} showLabels={expanded} />
          </div>
          <MapLegend mode={mode} fronts={FRONT_ORDER} swingFront={swingFront} />
        </Panel>

        {!expanded && <Panel kicker={`${TOTAL_DISTRICT_SEATS} distritais + proporcionais`} title="Corrida pela maioria"
          right={<div className="text-right text-[15px] text-tv-muted">Sólido: confirmadas · Hachurado: projeção · Faixa fina: 2022</div>}>
          <div className="pt-9">
            <SeatRaceBar fronts={snap.frontByLegend} height={50} />
          </div>
          <div className="grid grid-cols-4 gap-3 mt-5">
            <MiniStat label="Distritos definidos" value={<><AnimatedNumber value={snap.calledCount} /><span className="text-tv-muted text-[20px]">/{TOTAL_DISTRICT_SEATS}</span></>} />
            <MiniStat label="Viradas" value={<AnimatedNumber value={snap.flips.length} />} sub={`+${snap.districts.filter(d => d.leadingFlip).length} em andamento`} />
            <MiniStat label={`Proporcional · ${prLeader?.legend ?? '—'}`} value={fmtPct(snap.reported > 0 && prLeader ? prLeader.prPct : 0)} sub={snap.reported > 0 && prLeader ? <Delta value={prLeader.prPct - prLeader.prevPrPct} className="text-[14px]" /> : undefined} />
            <MiniStat label="Votos apurados" value={<AnimatedNumber value={snap.counted / 1e6} format={n => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} mi`} />} sub={`${fmtInt(snap.pollsCounted)} urnas`} />
          </div>
        </Panel>}
      </div>

      {!expanded && (
      <Panel kicker="Projeção de cadeiras" title={leader && leader.projected > 0 ? `${leader.legend} ${leader.projected >= MAJORITY ? 'rumo à maioria' : 'lidera'}` : 'Aguardando apuração'} bodyClassName="flex flex-col gap-3 overflow-hidden">
        {snap.fronts.map(f => {
          const delta = f.projected - f.prev.total;
          return (
            <div key={f.legend} className="rounded-[22px] bg-tv-surface2/50 border border-tv-border/50 pl-0 pr-5 py-3.5 flex items-stretch gap-4 overflow-hidden">
              <div className="w-2.5 rounded-r-full" style={{ background: frontColor(f.legend) }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[26px] font-black">{f.legend}</span>
                  <span className="text-[15px] text-tv-muted truncate">{frontName(f.legend)}</span>
                </div>
                <div className="text-[14px] text-tv-muted mt-0.5 tabular-nums">
                  {f.districtWon} distr. + {f.prConfirmed} prop. confirmadas
                  {(f.districtLeading + f.prProjected) > 0 && <> · projeção +{f.districtLeading} distr. +{f.prProjected} prop.</>}
                </div>
                <div className="text-[14px] mt-1 flex items-center gap-2">
                  <span className="text-tv-muted">Voto proporcional</span>
                  <span className="font-bold tabular-nums">{fmtPct(f.prPct)}</span>
                  {snap.reported > 0 && <Delta value={f.prPct - f.prevPrPct} className="text-[14px]" />}
                </div>
              </div>
              <div className="text-right flex flex-col justify-center">
                <div className="text-[48px] font-black leading-none tabular-nums"><AnimatedNumber value={f.projected} /></div>
                <div className="text-[14px] mt-1"><span className="text-tv-muted">2022: {f.prev.total} </span><Delta value={delta} digits={0} unit="" className="text-[15px]" /></div>
              </div>
            </div>
          );
        })}
      </Panel>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-[18px] bg-tv-surface2/60 border border-tv-border/60 px-4 py-2.5 min-w-0 flex items-end justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[12px] uppercase tracking-[0.14em] text-tv-muted font-bold truncate">{label}</div>
        <div className="text-[30px] font-black leading-none mt-1.5 tabular-nums whitespace-nowrap">{value}</div>
      </div>
      {sub && <div className="text-[13px] text-tv-muted text-right shrink-0">{sub}</div>}
    </div>
  );
}
