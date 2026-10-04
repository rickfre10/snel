// components/tv/scenes/SceneEstado.tsx
"use client";
import React, { useState } from 'react';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { FRONT_ORDER, PR_SEATS_BY_STATE, STATE_ORDER, frontColor } from '@/lib/haagar/rules';
import HexMap, { MapLegend, MapMode } from '../HexMap';
import { PairedShareBars, SeatStrip } from '../charts';
import { Chip, Delta, Panel, ProgressBar, StatTile, fmtPct } from '../ui';

export default function SceneEstado({ snap, uf, onUf, onDistrict }: { snap: ElectionSnapshot; uf: string; onUf: (uf: string) => void; onDistrict: (id: number) => void }) {
  const [mode, setMode] = useState<MapMode>('resultado');
  const st = snap.states[uf];
  if (!st) return null;
  const ds = st.districtIds.map(id => snap.districtById[id]);
  const called = ds.filter(d => d.isFinal).length;
  const flips = ds.filter(d => d.flipped);

  const fronts = FRONT_ORDER.filter(f => (st.prPct[f] ?? 0) > 0 || (st.prev.prPct[f] ?? 0) > 0);
  const seatRows = FRONT_ORDER.map(f => ({
    legend: f,
    district: st.districtLeads[f] ?? 0,
    districtFinal: st.districtWins[f] ?? 0,
    pr: st.prSeats[f] ?? 0,
    prSure: st.prGuaranteed[f] ?? 0,
    prev: (st.prevDistrictWins[f] ?? 0) + (st.prev.prSeats[f] ?? 0),
  })).filter(r => r.district + r.pr + r.prev > 0);

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex items-center gap-3">
        {STATE_ORDER.map(u => (
          <Chip key={u} active={u === uf} onClick={() => onUf(u)}>{snap.states[u].name}</Chip>
        ))}
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_640px] gap-6">
        <Panel kicker={`${st.districtIds.length} distritos · ${PR_SEATS_BY_STATE[uf]} cadeiras proporcionais`} title={st.name}
          right={<div className="flex gap-2">{(['resultado', '2022', 'viradas', 'apuracao'] as MapMode[]).map(m => (
            <Chip key={m} active={mode === m} onClick={() => setMode(m)}>{m === 'resultado' ? '2026' : m === 'apuracao' ? 'Apuração' : m === 'viradas' ? 'Viradas' : '2022'}</Chip>
          ))}</div>}
          bodyClassName="flex flex-col gap-3">
          <div className="flex-1 min-h-0">
            <HexMap districts={snap.districtById} uf={uf} mode={mode} onSelect={onDistrict} showLabels={st.districtIds.length <= 30} />
          </div>
          <MapLegend mode={mode} fronts={FRONT_ORDER} swingFront="TDS" />
          <div className="grid grid-cols-4 gap-4">
            <StatTile label="Apurado" value={fmtPct(st.reported)} sub={st.hold !== null ? `Contagem retida em ${fmtPct(st.hold, 1)}` : undefined} />
            <StatTile label="Distritos definidos" value={<>{called}<span className="text-tv-muted text-[24px]">/{ds.length}</span></>} />
            <StatTile label="Viradas" value={flips.length} sub={flips.slice(0, 2).map(d => d.name).join(', ') || '—'} />
            <StatTile label="Disputas apertadas" value={ds.filter(d => d.leader && !d.isFinal && d.marginPct < 3).length} sub="margem < 3 p.p." />
          </div>
        </Panel>

        <div className="grid grid-rows-[auto_1fr] gap-6 min-h-0 min-w-0">
          <Panel kicker={st.prSeatsFinal ? 'Resultado final' : `${Object.values(st.prGuaranteed).reduce((a, b) => a + b, 0)} de ${PR_SEATS_BY_STATE[uf]} cadeiras garantidas`} title="Voto proporcional"
            right={<div className="w-40"><ProgressBar value={st.reported} /></div>}>
            <div className="mb-4"><SeatStrip total={PR_SEATS_BY_STATE[uf] ?? 0} guaranteed={st.prGuaranteed} projected={st.prSeats} size={PR_SEATS_BY_STATE[uf] > 30 ? 20 : 26} gap={4} /></div>
            <PairedShareBars rows={fronts.map(f => ({
              legend: f,
              now: st.prPct[f] ?? 0,
              prev: st.prev.prPct[f] ?? 0,
              extra: st.prCounted > 0 ? <Delta value={(st.prPct[f] ?? 0) - (st.prev.prPct[f] ?? 0)} unit="" className="text-[15px] w-[64px] justify-end" /> : undefined,
            }))} />
          </Panel>
          <Panel kicker="Distritais + proporcionais" title="Bancada do estado" bodyClassName="flex flex-col">
            <div className="grid grid-cols-[1fr_80px_80px_80px_90px] text-[13px] uppercase tracking-wider text-tv-muted font-bold pb-2 border-b border-tv-border">
              <span>Frente</span><span className="text-right">Distr.</span><span className="text-right">Prop.</span><span className="text-right">Total</span><span className="text-right">vs 2022</span>
            </div>
            {seatRows.map(r => (
              <div key={r.legend} className="grid grid-cols-[1fr_80px_80px_80px_90px] items-center py-[3px] border-b border-tv-border/40 text-[18px] tabular-nums">
                <span className="flex items-center gap-2.5 font-black"><span className="w-3.5 h-3.5 rounded" style={{ background: frontColor(r.legend) }} />{r.legend}</span>
                <span className="text-right">{r.district}{r.district > r.districtFinal && <span className="text-[13px] text-tv-muted"> ({r.districtFinal}✓)</span>}</span>
                <span className="text-right">{r.pr}{r.pr > r.prSure && <span className="text-[13px] text-tv-muted"> ({r.prSure}✓)</span>}</span>
                <span className="text-right font-black">{r.district + r.pr}</span>
                <span className="text-right"><Delta value={r.district + r.pr - r.prev} digits={0} unit="" /></span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}
