// components/tv/scenes/SceneGeral.tsx
"use client";
// Visão geral — a cena que fica mais tempo no ar. O mapa domina a tela, com a
// corrida pela maioria numa faixa embaixo; à direita, as cadeiras por frente
// (distritais + proporcionais) e o andamento do voto proporcional.
import React, { useState } from 'react';
import type { ElectionSnapshot, FrontTotals } from '@/lib/haagar2026/model';
import { FRONT_ORDER, MAJORITY, PR_BARRIER_PERCENT, STATE_ORDER, TOTAL_DISTRICT_SEATS, TOTAL_PR_SEATS, frontColor, textOn } from '@/lib/haagar/rules';
import HexMap, { MapLegend, MapMode } from '../HexMap';
import { SeatRaceBar, SeatStrip } from '../charts';
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
  // Mapa em foco: esconde as colunas de cadeiras e proporcional
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`h-full grid gap-5 ${expanded ? 'grid-cols-1' : 'grid-cols-[1fr_540px]'}`}>
      {/* ------------------------------------------------ Mapa */}
      <Panel kicker="Parlamento de Haagar" title="Mapa dos distritos"
        right={<div className="flex gap-2">
          {MODES.map(m => <Chip key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</Chip>)}
          <span className="w-px bg-tv-border mx-1" />
          <Chip active={expanded} onClick={() => setExpanded(e => !e)}>{expanded ? '⤡ Reduzir' : '⤢ Expandir'}</Chip>
        </div>}
        bodyClassName="flex flex-col gap-2">
        {mode === 'swing' && (
          <div className="flex gap-2">
            {FRONT_ORDER.map(f => <Chip key={f} active={swingFront === f} color={frontColor(f)} onClick={() => setSwingFront(f)}>{f}</Chip>)}
          </div>
        )}
        <div className="flex-1 min-h-0">
          <HexMap districts={snap.districtById} mode={mode} swingFront={swingFront} onSelect={onDistrict} showLabels={expanded} />
        </div>
        <MapLegend mode={mode} fronts={FRONT_ORDER} swingFront={swingFront} />

        {/* Corrida pela maioria + números rápidos */}
        {!expanded && (
          <div className="grid grid-cols-[1fr_auto] gap-6 items-end border-t border-tv-border/60 pt-3 mt-1">
            <div className="pt-8 min-w-0"><SeatRaceBar fronts={snap.frontByLegend} height={38} /></div>
            <div className="flex gap-3 pb-1">
              <Quick label="Definidos" value={<><AnimatedNumber value={snap.calledCount} /><span className="text-tv-muted text-[16px]">/{TOTAL_DISTRICT_SEATS}</span></>} />
              <Quick label="Viradas" value={<AnimatedNumber value={snap.flips.length} />} sub={`+${snap.districts.filter(d => d.leadingFlip).length} em curso`} />
              <Quick label="Votos" value={<AnimatedNumber value={snap.counted / 1e6} format={n => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} mi`} />} sub={`${fmtInt(snap.pollsCounted)} urnas`} />
            </div>
          </div>
        )}
      </Panel>

      {!expanded && (
        <div className="flex flex-col gap-5 min-h-0 min-w-0">
          <SeatsPanel snap={snap} />
          <PrPanel snap={snap} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------- Cadeiras ---
function SeatsPanel({ snap }: { snap: ElectionSnapshot }) {
  const fronts = [...snap.fronts].sort((a, b) => b.projected - a.projected || b.prPct - a.prPct);
  const leader = fronts[0];
  const status = !leader || leader.projected <= 0 ? 'Aguardando apuração'
    : leader.confirmed >= MAJORITY ? `${leader.legend} tem maioria`
    : leader.projected >= MAJORITY ? `${leader.legend} projeta maioria`
    : `Ninguém chega a ${MAJORITY} · ${leader.legend} lidera`;
  return (
    <Panel kicker={`Cadeiras · maioria ${MAJORITY}`} title={status} bodyClassName="flex flex-col">
      <div className="grid grid-cols-[1fr_62px_62px_84px_70px] text-[12px] uppercase tracking-wider text-tv-muted font-bold pb-1.5 border-b border-tv-border">
        <span>Frente</span><span className="text-right">Distr.</span><span className="text-right">Prop.</span><span className="text-right">Total</span><span className="text-right">vs 22</span>
      </div>
      {fronts.map(f => <SeatRow key={f.legend} f={f} counting={snap.reported > 0} />)}
    </Panel>
  );
}

function SeatRow({ f, counting }: { f: FrontTotals; counting: boolean }) {
  const c = frontColor(f.legend);
  const dist = f.districtWon + f.districtLeading;
  const prop = f.prConfirmed + f.prProjected;
  return (
    <div className="grid grid-cols-[1fr_62px_62px_84px_70px] items-center py-[5px] border-b border-tv-border/40 last:border-b-0 tabular-nums">
      <span className="flex items-center gap-2.5 min-w-0">
        <span className="w-2 h-8 rounded-full shrink-0" style={{ background: c }} />
        <span className="text-[22px] font-black">{f.legend}</span>
        {f.projected >= MAJORITY && <span className="rounded px-1.5 text-[11px] font-black uppercase" style={{ background: c, color: textOn(c) }}>maioria</span>}
      </span>
      <span className="text-right text-[18px]">{dist}<Sure n={f.districtWon} of={dist} /></span>
      <span className="text-right text-[18px]">{prop}<Sure n={f.prConfirmed} of={prop} /></span>
      <span className="text-right text-[34px] font-black leading-none"><AnimatedNumber value={f.projected} /></span>
      <span className="text-right">{counting
        ? <Delta value={f.projected - f.prev.total} digits={0} unit="" className="text-[16px] justify-end" />
        : <span className="text-[16px] text-tv-muted">{f.prev.total}</span>}</span>
    </div>
  );
}

const Sure = ({ n, of }: { n: number; of: number }) => (of > n ? <span className="block text-[11px] text-tv-muted leading-none">({n}✓)</span> : null);

// --------------------------------------------------------- Proporcional ---
function PrPanel({ snap }: { snap: ElectionSnapshot }) {
  const guaranteed: Record<string, number> = {};
  const projected: Record<string, number> = {};
  STATE_ORDER.forEach(uf => {
    const st = snap.states[uf];
    FRONT_ORDER.forEach(f => {
      guaranteed[f] = (guaranteed[f] ?? 0) + (st.prGuaranteed[f] ?? 0);
      projected[f] = (projected[f] ?? 0) + (st.prSeats[f] ?? 0);
    });
  });
  const totalG = Object.values(guaranteed).reduce((a, b) => a + b, 0);
  const fronts = FRONT_ORDER.map(f => snap.frontByLegend[f]).filter(Boolean)
    .sort((a, b) => b.prPct - a.prPct || (projected[b.legend] ?? 0) - (projected[a.legend] ?? 0));
  const max = Math.max(20, ...fronts.map(f => Math.max(f.prPct, f.prevPrPct))) * 1.08;
  const counting = snap.reported > 0;
  return (
    <Panel kicker={`Proporcional · ${TOTAL_PR_SEATS} cadeiras`} title={counting ? `${totalG} de ${TOTAL_PR_SEATS} já garantidas` : 'Aguardando apuração'}
      right={<div className="text-[12px] text-tv-muted text-right leading-tight pb-1">traço = 2022<br />✓ = garantidas</div>}
      className="flex-1" bodyClassName="flex flex-col gap-2.5">
      <SeatStrip total={TOTAL_PR_SEATS} guaranteed={guaranteed} projected={projected} size={12} gap={3} />
      <div className="flex flex-col gap-[5px]">
        {fronts.map(f => {
          const c = frontColor(f.legend);
          const below = counting && f.prPct < PR_BARRIER_PERCENT;
          return (
            <div key={f.legend} className="grid grid-cols-[50px_1fr_64px_58px_56px] items-center gap-2.5 tabular-nums h-[27px]">
              <span className="font-black text-[16px]">{f.legend}</span>
              <div className="relative h-5">
                <div className="absolute inset-y-0 left-0 rounded-r-[6px] rounded-l-[3px] transition-[width] duration-700" style={{ width: `${(f.prPct / max) * 100}%`, background: c, opacity: below ? 0.5 : 1 }} />
                <div className="absolute -top-1 -bottom-1 w-[3px] rounded-full bg-tv-text/80" style={{ left: `${(f.prevPrPct / max) * 100}%` }} title="2022" />
                <div className="absolute -top-0.5 -bottom-0.5 w-px bg-tv-muted/60" style={{ left: `${(PR_BARRIER_PERCENT / max) * 100}%` }} title="barreira de 5%" />
              </div>
              <span className="text-right text-[17px] font-bold">{counting ? fmtPct(f.prPct) : '—'}</span>
              <span className="text-right">{counting ? <Delta value={f.prPct - f.prevPrPct} unit="" className="text-[13px] justify-end" /> : ''}</span>
              <span className="text-right text-[17px] font-black">{projected[f.legend] ?? 0}<span className="text-[11px] text-tv-muted font-semibold"> {guaranteed[f.legend] ?? 0}✓</span></span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Quick({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-[16px] bg-tv-surface2/60 border border-tv-border/60 px-3.5 py-2 min-w-[118px]">
      <div className="text-[11px] uppercase tracking-[0.14em] text-tv-muted font-bold">{label}</div>
      <div className="text-[26px] font-black leading-none mt-1 tabular-nums whitespace-nowrap">{value}</div>
      {sub && <div className="text-[11px] text-tv-muted mt-0.5 whitespace-nowrap">{sub}</div>}
    </div>
  );
}
