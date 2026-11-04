// components/tv/scenes/SceneViradas.tsx
"use client";
import React, { useState } from 'react';
import type { CandidateResult, ElectionSnapshot, DistrictSnapshot } from '@/lib/haagar2026/model';
import { FRONT_ORDER, frontColor, textOn } from '@/lib/haagar/rules';
import { Chip, Panel, fmtPct, GAIN, LOSS } from '../ui';

type Tab = 'confirmadas' | 'andamento';
const PAGE = 12; // 3 colunas × 4 linhas

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
  // abre em "confirmadas" quando já houver alguma; senão, nas que estão em andamento
  const [tabPick, setTab] = useState<Tab | null>(null);
  const tab: Tab = tabPick ?? (flips.length > 0 || atRisk.length === 0 ? 'confirmadas' : 'andamento');
  const list = tab === 'confirmadas' ? flips : atRisk;
  const [pageRaw, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const page = Math.min(pageRaw, pages - 1);
  const pick = (t: Tab) => { setTab(t); setPage(0); };

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

      <Panel kicker={tab === 'confirmadas' ? `${flips.length} cadeiras mudaram de mãos` : 'Outra frente à frente na apuração'}
        title={tab === 'confirmadas' ? 'Viradas confirmadas' : 'Viradas em andamento'}
        right={
          <div className="flex gap-2 shrink-0">
            <Chip active={tab === 'confirmadas'} onClick={() => pick('confirmadas')}>Confirmadas · {flips.length}</Chip>
            <Chip active={tab === 'andamento'} onClick={() => pick('andamento')}>Em andamento · {atRisk.length}</Chip>
            {pages > 1 && (
              <div className="flex items-center gap-1.5 ml-3">
                <PageArrow dir="prev" disabled={page === 0} onClick={() => setPage(page - 1)} />
                <span className="w-[52px] text-center text-[17px] font-bold tabular-nums text-tv-muted">{page + 1}/{pages}</span>
                <PageArrow dir="next" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} />
              </div>
            )}
          </div>
        }
        bodyClassName="overflow-hidden">
        {list.length === 0 ? (
          <Empty text={tab === 'confirmadas' ? 'Nenhuma virada confirmada até agora.' : 'Nenhuma frente desafiante à frente agora.'} />
        ) : (
          <div className="grid grid-cols-3 gap-3 content-start">
            {list.slice(page * PAGE, (page + 1) * PAGE).map(d => <FlipCard key={d.id} d={d} onClick={() => onDistrict(d.id)} />)}
          </div>
        )}
      </Panel>
    </div>
  );
}

function PageArrow({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir === 'prev' ? 'Página anterior' : 'Próxima página'}
      className="w-11 h-11 rounded-full border border-tv-border bg-tv-surface2/60 text-tv-text text-[26px] font-black leading-none flex items-center justify-center hover:bg-tv-surface2 disabled:opacity-30 disabled:hover:bg-tv-surface2/60">
      {dir === 'prev' ? '‹' : '›'}
    </button>
  );
}

/** Card da virada: quem tomou × a frente que tinha a cadeira em 2022 (e está perdendo). */
function FlipCard({ d, onClick }: { d: DistrictSnapshot; onClick: () => void }) {
  const winner = d.leader;
  const holderFront = d.prev.front;
  const holder = d.candidates.find(c => c.front === holderFront) ?? null;
  const max = Math.max(winner?.pct ?? 0, holder?.pct ?? 0, 1);
  return (
    <button onClick={onClick}
      className={`text-left rounded-[16px] border px-4 pt-3 pb-3.5 bg-tv-surface2/40 hover:bg-tv-surface2 transition-colors min-w-0 ${d.isFinal ? 'border-tv-border/70' : 'border-dashed border-tv-border'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[19px] font-black truncate leading-tight">{d.name}</div>
          <div className="flex items-center gap-1.5 text-[13px] text-tv-muted mt-0.5 min-w-0">
            <span className="truncate">{d.ufName} ·</span>
            {holderFront && <span className="shrink-0 rounded-[4px] px-1 text-[11px] font-black leading-[1.45]" style={{ background: frontColor(holderFront), color: textOn(frontColor(holderFront)) }}>{holderFront}</span>}
            <span className="shrink-0">{d.isFinal ? 'perdeu' : 'perdendo'}</span>
          </div>
        </div>
        <div className="shrink-0 w-[96px] text-right">
          <div className="text-[13px] text-tv-muted tabular-nums"><b className="text-tv-text">{fmtPct(d.reported, 1).replace(',0%', '%')}</b> apur.</div>
          <div className="mt-1.5 h-[4px] rounded-full bg-tv-border overflow-hidden">
            <div className="h-full rounded-full bg-tv-text transition-[width] duration-700" style={{ width: `${Math.min(100, d.reported)}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-2.5 grid gap-1.5">
        {winner && <CandRow c={winner} max={max} won={d.isFinal} />}
        {holder ? <CandRow c={holder} max={max} lost /> : holderFront && (
          <div className="text-[13px] text-tv-muted">{holderFront} (2022) sem candidato nesta eleição</div>
        )}
      </div>
    </button>
  );
}

function CandRow({ c, max, won = false, lost = false }: { c: CandidateResult; max: number; won?: boolean; lost?: boolean }) {
  const col = frontColor(c.front);
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 min-w-0 h-[32px] flex items-center">
        {/* faixa na cor da frente, proporcional ao % */}
        <div className="absolute inset-y-0 left-0 rounded-[4px] transition-[width] duration-700"
          style={{ width: `${Math.max(38, (c.pct / max) * 100)}%`, background: `${col}${lost ? '66' : 'cc'}`, boxShadow: `inset 4px 0 0 ${col}` }} />
        <span className="relative min-w-0 flex items-center gap-1.5 pl-3 pr-2">
          <span className={`truncate text-[16px] font-bold ${lost ? 'opacity-85' : ''}`} style={{ color: lost ? 'rgb(var(--tv-text))' : textOn(col) }}>{c.name}</span>
          {won && <span className="shrink-0 w-[17px] h-[17px] rounded-full bg-white text-black text-[11px] font-black flex items-center justify-center">✓</span>}
        </span>
      </div>
      <span className="shrink-0 w-[30px] text-[12px] font-black text-center rounded-[4px] py-[1px]" style={{ background: col, color: textOn(col) }}>{c.front}</span>
      <span className="shrink-0 w-[56px] text-right text-[17px] font-black tabular-nums">{fmtPct(c.pct)}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="h-full min-h-[80px] flex items-center justify-center text-tv-muted text-[18px]">{text}</div>;
}
