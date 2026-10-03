// components/tv/scenes/SceneViradas.tsx
"use client";
import React from 'react';
import type { ElectionSnapshot, DistrictSnapshot } from '@/lib/haagar2026/model';
import { FRONT_ORDER, frontColor, textOn } from '@/lib/haagar/rules';
import { FrontPill, Panel, fmtPct, GAIN, LOSS } from '../ui';

export default function SceneViradas({ snap, onDistrict }: { snap: ElectionSnapshot; onDistrict: (id: number) => void }) {
  const finals = snap.districts.filter(d => d.isFinal && d.leader && d.prev.front);
  const matrix: Record<string, Record<string, number>> = {};
  FRONT_ORDER.forEach(a => { matrix[a] = {}; FRONT_ORDER.forEach(b => { matrix[a][b] = 0; }); });
  finals.forEach(d => { matrix[d.prev.front!][d.leader!.front] = (matrix[d.prev.front!]?.[d.leader!.front] ?? 0) + 1; });
  const maxCell = Math.max(1, ...FRONT_ORDER.flatMap(a => FRONT_ORDER.map(b => matrix[a][b])));

  const net = FRONT_ORDER.map(f => ({ legend: f, gains: snap.frontByLegend[f]?.gains ?? 0, losses: snap.frontByLegend[f]?.losses ?? 0 }));
  const maxNet = Math.max(1, ...net.map(n => Math.max(n.gains, n.losses)));
  const flips = [...snap.flips].sort((a, b) => b.marginPct - a.marginPct);
  const atRisk = snap.districts.filter(d => d.leadingFlip).sort((a, b) => b.reported - a.reported);

  return (
    <div className="h-full grid grid-cols-[640px_minmax(0,1fr)] gap-6">
      <div className="grid grid-rows-[auto_1fr] gap-6 min-h-0">
        <Panel kicker="Distritos definidos" title="De quem para quem">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `88px repeat(${FRONT_ORDER.length}, 1fr)` }}>
            <div className="text-[12px] text-tv-muted font-bold leading-tight self-end pb-1">2022 ↓<br />2026 →</div>
            {FRONT_ORDER.map(f => <div key={f} className="text-center font-black text-[17px] pb-1" style={{ color: frontColor(f) === '#1d12b5' ? '#8f88ff' : frontColor(f) }}>{f}</div>)}
            {FRONT_ORDER.map(a => (
              <React.Fragment key={a}>
                <div className="font-black text-[17px] flex items-center">{a}</div>
                {FRONT_ORDER.map(b => {
                  const v = matrix[a][b];
                  const held = a === b;
                  const c = frontColor(b);
                  return (
                    <div key={b} className="h-[42px] rounded-[10px] flex items-center justify-center text-[20px] font-black tabular-nums"
                      style={v === 0 ? { background: 'rgb(var(--tv-surface2) / 0.5)', color: 'rgb(var(--tv-muted) / 0.5)' }
                        : held ? { background: 'rgb(var(--tv-surface2))', color: 'rgb(var(--tv-text))', boxShadow: `inset 0 0 0 2px ${c}` }
                        : { background: c, boxShadow: `inset 0 0 0 999px rgba(0,0,0,${0.45 * (1 - v / maxCell)})`, color: textOn(c) }}>
                      {v || '·'}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="text-[13px] text-tv-muted mt-2">Diagonal com contorno: cadeiras mantidas. Cor cheia: cadeiras tomadas.</div>
        </Panel>
        <Panel kicker="Saldo de distritos" title="Quem tomou, quem perdeu" bodyClassName="flex flex-col justify-center gap-1.5">
          {net.map(n => (
            <div key={n.legend} className="grid grid-cols-[1fr_64px_1fr] items-center gap-3">
              <div className="flex justify-end items-center gap-2">
                <span className="text-[15px] font-bold tabular-nums" style={{ color: LOSS }}>{n.losses ? `−${n.losses}` : ''}</span>
                <div className="h-5 rounded-l-[6px] transition-[width] duration-700" style={{ width: `${(n.losses / maxNet) * 100}%`, background: LOSS, opacity: 0.85 }} />
              </div>
              <div className="text-center font-black text-[18px]">{n.legend}</div>
              <div className="flex items-center gap-2">
                <div className="h-5 rounded-r-[6px] transition-[width] duration-700" style={{ width: `${(n.gains / maxNet) * 100}%`, background: GAIN, opacity: 0.85 }} />
                <span className="text-[15px] font-bold tabular-nums" style={{ color: GAIN }}>{n.gains ? `+${n.gains}` : ''}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-center gap-6 text-[13px] text-tv-muted mt-1">
            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: LOSS }} />perdidos</span>
            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: GAIN }} />conquistados</span>
          </div>
        </Panel>
      </div>

      <div className="grid grid-rows-[1fr_auto] gap-6 min-h-0 min-w-0">
        <Panel kicker={`${flips.length} cadeiras mudaram de mãos`} title="Viradas confirmadas" bodyClassName="overflow-hidden">
          {flips.length === 0 ? (
            <Empty text="Nenhuma virada confirmada até agora." />
          ) : (
            <div className="grid grid-cols-3 gap-3 content-start">
              {flips.slice(0, 15).map(d => <FlipCard key={d.id} d={d} onClick={() => onDistrict(d.id)} />)}
            </div>
          )}
          {flips.length > 15 && <div className="text-tv-muted text-[15px] mt-3">+ {flips.length - 15} outras</div>}
        </Panel>
        <Panel kicker="Ainda em apuração" title={`Viradas em andamento · ${atRisk.length}`}>
          {atRisk.length === 0 ? <Empty text="Nenhuma frente desafiante à frente agora." /> : (
            <div className="flex gap-3 overflow-hidden">
              {atRisk.slice(0, 6).map(d => <FlipCard key={d.id} d={d} pending onClick={() => onDistrict(d.id)} />)}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function FlipCard({ d, onClick, pending = false }: { d: DistrictSnapshot; onClick: () => void; pending?: boolean }) {
  return (
    <button onClick={onClick} className={`text-left rounded-[20px] border px-4 py-3 bg-tv-surface2/50 hover:bg-tv-surface2 transition-colors min-w-0 ${pending ? 'border-dashed border-tv-border w-[240px] shrink-0' : 'border-tv-border/60'}`}>
      <div className="text-[12px] uppercase tracking-[0.14em] text-tv-muted font-bold truncate">{d.ufName}</div>
      <div className="text-[20px] font-black truncate leading-tight">{d.name}</div>
      <div className="flex items-center gap-2 mt-2">
        <FrontPill legend={d.prev.front} size="sm" />
        <span className="text-tv-muted">→</span>
        <FrontPill legend={d.leader?.front ?? null} size="sm" />
        <span className="ml-auto text-[14px] text-tv-muted tabular-nums">{pending ? `${fmtPct(d.reported)} apur.` : `+${fmtPct(d.marginPct)}`}</span>
      </div>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="h-full min-h-[80px] flex items-center justify-center text-tv-muted text-[18px]">{text}</div>;
}
