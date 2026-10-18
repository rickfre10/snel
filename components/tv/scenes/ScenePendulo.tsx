// components/tv/scenes/ScenePendulo.tsx
"use client";
// Pêndulo (estilo ABC): cada distrito numa etiqueta, agrupado pela frente que
// venceu em 2022. A maior frente fica à esquerda e a segunda à direita; as
// demais no centro. Quanto mais perto do centro da tela, menor foi a vantagem
// em 2022 — é ali que as viradas aparecem primeiro.
import React from 'react';
import type { DistrictSnapshot, ElectionSnapshot } from '@/lib/haagar2026/model';
import { FRONT_ORDER, frontColor, frontName, textOn } from '@/lib/haagar/rules';
import { fmtPct } from '../ui';

const ROWS = 15;

type SeatState = 'aguardando' | 'segura' | 'mantida' | 'risco' | 'virou';

function seatState(d: DistrictSnapshot): SeatState {
  if (!d.leader || d.counted <= 0) return 'aguardando';
  if (d.flipped) return 'virou';
  if (d.leadingFlip) return 'risco';
  return d.isFinal ? 'mantida' : 'segura';
}

export default function ScenePendulo({ snap, onDistrict }: { snap: ElectionSnapshot; onDistrict: (id: number) => void }) {
  // Distritos por frente vencedora em 2022, do mais disputado ao mais seguro
  const byFront: Record<string, DistrictSnapshot[]> = {};
  snap.districts.forEach(d => { const f = d.prev.front ?? '—'; (byFront[f] ||= []).push(d); });
  Object.values(byFront).forEach(list => list.sort((a, b) => a.prev.marginPct - b.prev.marginPct));
  const ranked = Object.keys(byFront).sort((a, b) => byFront[b].length - byFront[a].length);
  const left = ranked[0];
  const right = ranked[1];
  const center = FRONT_ORDER.filter(f => f !== left && f !== right && byFront[f]?.length)
    .concat(ranked.filter(f => !FRONT_ORDER.includes(f) && f !== left && f !== right));
  const centerList = center.flatMap(f => byFront[f]);

  const colsL = Math.ceil((byFront[left]?.length ?? 0) / ROWS);
  const colsR = Math.ceil((byFront[right]?.length ?? 0) / ROWS);
  const colsC = Math.max(1, Math.ceil(centerList.length / ROWS));

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Cabeçalho: lados e leitura */}
      <div className="grid gap-4 items-end" style={{ gridTemplateColumns: `${colsL}fr ${colsC}fr ${colsR}fr` }}>
        <SideHeader snap={snap} fronts={[left]} align="left" list={byFront[left] ?? []} />
        <SideHeader snap={snap} fronts={center} align="center" list={centerList} />
        <SideHeader snap={snap} fronts={[right]} align="right" list={byFront[right] ?? []} />
      </div>

      {/* Etiquetas */}
      <div className="flex-1 min-h-0 grid gap-4" style={{ gridTemplateColumns: `${colsL}fr ${colsC}fr ${colsR}fr` }}>
        <Block list={byFront[left] ?? []} cols={colsL} side="left" onDistrict={onDistrict} />
        <Block list={centerList} cols={colsC} side="center" onDistrict={onDistrict} />
        <Block list={byFront[right] ?? []} cols={colsR} side="right" onDistrict={onDistrict} />
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-6 text-[15px] text-tv-muted">
        <span className="font-bold text-tv-text">Mais perto do centro = menor vantagem em 2022</span>
        <Legend kind="aguardando" label="Aguardando urnas" />
        <Legend kind="segura" label="Segurando" />
        <Legend kind="mantida" label="Mantida ✓" />
        <Legend kind="risco" label="Outra frente na frente" />
        <Legend kind="virou" label="Virou" />
      </div>
    </div>
  );
}

// --------------------------------------------------------------- Bloco ----
/** Preenche as colunas a partir do centro: a coluna mais disputada encosta no meio. */
function Block({ list, cols, side, onDistrict }: { list: DistrictSnapshot[]; cols: number; side: 'left' | 'center' | 'right'; onDistrict: (id: number) => void }) {
  const columns: DistrictSnapshot[][] = Array.from({ length: cols }, (_, c) => list.slice(c * ROWS, (c + 1) * ROWS));
  // à esquerda, a primeira coluna (mais disputada) fica à direita, junto do centro
  const ordered = side === 'left' ? [...columns].reverse() : columns;
  return (
    <div className="min-w-0 rounded-[24px] bg-tv-surface/80 border border-tv-border/60 p-3 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {ordered.map((col, i) => (
        <div key={i} className="min-w-0 grid gap-[5px]" style={{ gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))` }}>
          {col.map(d => <Seat key={d.id} d={d} onClick={() => onDistrict(d.id)} />)}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ Etiqueta ----
function Seat({ d, onClick }: { d: DistrictSnapshot; onClick: () => void }) {
  const st = seatState(d);
  const holder = frontColor(d.prev.front);
  const lead = d.leader ? frontColor(d.leader.front) : holder;
  let background: string;
  let color: string;
  switch (st) {
    case 'aguardando': background = `${holder}38`; color = 'rgb(var(--tv-text) / 0.75)'; break;
    case 'segura': background = `${holder}b3`; color = textOn(holder); break;
    case 'mantida': background = holder; color = textOn(holder); break;
    case 'risco': background = `repeating-linear-gradient(135deg, ${lead} 0 9px, ${lead}99 9px 18px)`; color = textOn(lead); break;
    default: background = lead; color = textOn(lead);
  }
  const changed = st === 'risco' || st === 'virou';
  return (
    <button onClick={onClick} title={`${d.name} (${d.ufName}) · 2022: ${d.prev.front} por ${fmtPct(d.prev.marginPct)}${d.leader ? ` · 2026: ${d.leader.front} ${d.isFinal ? 'eleito' : 'à frente'}` : ''}`}
      className={`relative min-w-0 rounded-[7px] flex items-center gap-1.5 pl-2.5 pr-2 text-left overflow-hidden transition-[background,box-shadow] duration-700 ${st === 'virou' ? 'tv-seat-flip' : ''}`}
      style={{ background, color, boxShadow: st === 'aguardando' ? `inset 0 0 0 1.5px ${holder}88` : undefined }}>
      {/* quem segurava a cadeira continua marcado na borda */}
      {changed && <span className="absolute inset-y-0 left-0 w-[5px]" style={{ background: holder }} />}
      <span className="flex-1 min-w-0 truncate text-[14px] font-bold leading-none">{d.name}</span>
      {st === 'mantida' && <span className="text-[13px] font-black leading-none">✓</span>}
      {changed && <span className="shrink-0 rounded-[4px] px-1 text-[11px] font-black leading-[1.4]" style={{ background: holder, color: textOn(holder) }}>{d.leader?.front}</span>}
      {!changed && <span className="shrink-0 text-[11px] font-semibold opacity-70 tabular-nums">{d.prev.marginPct.toFixed(1).replace('.', ',')}</span>}
    </button>
  );
}

// ----------------------------------------------------------- Cabeçalho ----
function SideHeader({ snap, fronts, list, align }: { snap: ElectionSnapshot; fronts: string[]; list: DistrictSnapshot[]; align: 'left' | 'center' | 'right' }) {
  const states = list.map(seatState);
  const kept = states.filter(s => s === 'mantida').length;
  const risk = states.filter(s => s === 'risco').length;
  const lost = states.filter(s => s === 'virou').length;
  const single = fronts.length === 1 ? fronts[0] : null;
  const c = single ? frontColor(single) : null;
  return (
    <div className={`min-w-0 flex flex-col ${align === 'right' ? 'items-end text-right' : align === 'center' ? 'items-center text-center' : 'items-start'}`}>
      <div className={`flex items-center gap-2.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {single
          ? <span className="rounded-full px-4 py-1 text-[24px] font-black" style={{ background: c!, color: textOn(c!) }}>{single}</span>
          : fronts.map(f => <span key={f} className="rounded-full px-2.5 py-0.5 text-[15px] font-black" style={{ background: frontColor(f), color: textOn(frontColor(f)) }}>{f}</span>)}
        <span className="text-[17px] text-tv-muted truncate">{single ? frontName(single) : 'Outras frentes'} · {list.length} cadeiras em 2022</span>
      </div>
      <div className="text-[15px] mt-1.5 tabular-nums text-tv-muted">
        <b className="text-tv-text">{kept}</b> mantidas · <b className="text-tv-text">{risk}</b> em risco · <b className="text-tv-text">{lost}</b> perdidas
        {snap.reported <= 0 && ' · aguardando apuração'}
      </div>
    </div>
  );
}

function Legend({ kind, label }: { kind: SeatState; label: string }) {
  const c = '#8c8fa8';
  const style: React.CSSProperties =
    kind === 'aguardando' ? { background: `${c}38`, boxShadow: `inset 0 0 0 1.5px ${c}88` }
    : kind === 'segura' ? { background: `${c}b3` }
    : kind === 'mantida' ? { background: c }
    : kind === 'risco' ? { background: `repeating-linear-gradient(135deg, ${c} 0 5px, ${c}99 5px 10px)` }
    : { background: c, boxShadow: 'inset 4px 0 0 #e8e8ef' };
  return <span className="inline-flex items-center gap-2"><span className="w-7 h-4 rounded-[4px]" style={style} />{label}</span>;
}
