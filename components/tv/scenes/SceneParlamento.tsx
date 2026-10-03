// components/tv/scenes/SceneParlamento.tsx
"use client";
import React, { useMemo, useState } from 'react';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { FRONT_ORDER, MAJORITY, TOTAL_SEATS, frontColor, frontName, textOn } from '@/lib/haagar/rules';
import { Hemicycle } from '../charts';
import { AnimatedNumber, Delta, Panel } from '../ui';

export default function SceneParlamento({ snap }: { snap: ElectionSnapshot }) {
  const [coalition, setCoalition] = useState<Set<string>>(new Set());
  const ordered = FRONT_ORDER.map(f => snap.frontByLegend[f]).filter(Boolean);

  // Coalizão selecionada vai para a esquerda do hemiciclo
  const assignment = useMemo(() => {
    const inC = ordered.filter(f => coalition.has(f.legend));
    const out = ordered.filter(f => !coalition.has(f.legend));
    return [...inC, ...out].map(f => ({ legend: f.legend, confirmed: f.confirmed, projected: f.projected }));
  }, [ordered, coalition]);

  const coalitionSeats = ordered.filter(f => coalition.has(f.legend)).reduce((s, f) => s + f.projected, 0);
  const coalitionConfirmed = ordered.filter(f => coalition.has(f.legend)).reduce((s, f) => s + f.confirmed, 0);
  const coalitionPrev = ordered.filter(f => coalition.has(f.legend)).reduce((s, f) => s + f.prev.total, 0);
  const hasMajority = coalitionSeats >= MAJORITY;
  const undecided = TOTAL_SEATS - ordered.reduce((s, f) => s + f.projected, 0);

  const toggle = (f: string) => setCoalition(prev => {
    const next = new Set(prev);
    if (next.has(f)) next.delete(f); else next.add(f);
    return next;
  });

  return (
    <div className="h-full grid grid-cols-[1fr_560px] gap-6">
      <Panel kicker="Balanço de poder" title={`Parlamento · ${TOTAL_SEATS} cadeiras`}
        right={<div className="text-[15px] text-tv-muted">Toque nas frentes para montar uma coalizão</div>}
        bodyClassName="flex flex-col">
        <div className="relative flex-1 min-h-0 flex items-end justify-center px-10">
          <div className="w-[1000px]">
            <Hemicycle assignment={assignment} width={1000} highlight={coalition.size ? coalition : null} />
          </div>
          <div className="absolute left-1/2 bottom-6 -translate-x-1/2 text-center">
            {coalition.size > 0 ? (
              <>
                <div className="text-[18px] uppercase tracking-[0.2em] font-bold text-tv-muted">Coalizão</div>
                <div className="text-[88px] font-black leading-none tabular-nums"><AnimatedNumber value={coalitionSeats} /></div>
                <div className={`mt-2 inline-flex rounded-full px-5 py-1.5 text-[18px] font-extrabold ${hasMajority ? 'bg-[#3fd0b8] text-[#06231e]' : 'bg-tv-surface2 text-tv-text'}`}>
                  {hasMajority ? `Maioria (+${coalitionSeats - MAJORITY})` : `Faltam ${MAJORITY - coalitionSeats} para ${MAJORITY}`}
                </div>
                <div className="text-[15px] text-tv-muted mt-2">{coalitionConfirmed} confirmadas · 2022: {coalitionPrev}</div>
              </>
            ) : (
              <>
                <div className="text-[18px] uppercase tracking-[0.2em] font-bold text-tv-muted">Maioria</div>
                <div className="text-[88px] font-black leading-none">{MAJORITY}</div>
                <div className="text-[16px] text-tv-muted mt-2">{undecided > 0 ? `${undecided} ${undecided === 1 ? 'cadeira' : 'cadeiras'} ainda sem projeção` : 'Todas as cadeiras projetadas'}</div>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3 mt-6">
          {ordered.map(f => {
            const active = coalition.has(f.legend);
            const c = frontColor(f.legend);
            return (
              <button key={f.legend} onClick={() => toggle(f.legend)}
                className="rounded-[22px] px-4 py-3 text-left border-2 transition-all"
                style={active ? { background: c, borderColor: c, color: textOn(c) } : { borderColor: c, background: 'rgb(var(--tv-surface2) / 0.5)' }}>
                <div className="text-[22px] font-black">{f.legend}</div>
                <div className="text-[40px] font-black leading-none tabular-nums">{f.projected}</div>
                <div className="text-[13px] opacity-80 mt-1">{f.confirmed} confirmadas</div>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="flex flex-col gap-6 min-h-0">
        <Panel kicker="Como era" title="Parlamento eleito em 2022">
          <div className="px-6">
            <Hemicycle width={480} majorityLine assignment={ordered.map(f => ({ legend: f.legend, confirmed: f.prev.total, projected: f.prev.total }))} />
          </div>
        </Panel>
        <Panel kicker="2022 → 2026" title="Ganhos e perdas por frente" className="flex-1" bodyClassName="flex flex-col justify-center gap-1">
          <div className="grid grid-cols-[1fr_70px_70px_90px] text-[13px] uppercase tracking-wider text-tv-muted font-bold pb-2 border-b border-tv-border">
            <span>Frente</span><span className="text-right">2022</span><span className="text-right">2026</span><span className="text-right">Saldo</span>
          </div>
          {ordered.map(f => (
            <div key={f.legend} className="grid grid-cols-[1fr_70px_70px_90px] items-center py-2 border-b border-tv-border/50 text-[20px]">
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-3.5 h-3.5 rounded" style={{ background: frontColor(f.legend) }} />
                <span className="font-black">{f.legend}</span>
                <span className="text-[14px] text-tv-muted truncate">{frontName(f.legend)}</span>
              </span>
              <span className="text-right tabular-nums text-tv-muted">{f.prev.total}</span>
              <span className="text-right tabular-nums font-black">{f.projected}</span>
              <span className="text-right"><Delta value={f.projected - f.prev.total} digits={0} unit="" /></span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
