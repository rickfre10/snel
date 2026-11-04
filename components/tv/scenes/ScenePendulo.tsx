// components/tv/scenes/ScenePendulo.tsx
"use client";
// Pêndulo (estilo ABC): cada distrito numa etiqueta, agrupado pela frente que
// venceu em 2022. A maior frente fica à esquerda e a segunda à direita; as
// demais no centro. Quanto mais perto do centro da tela, menor foi a vantagem
// em 2022 — é ali que as viradas aparecem primeiro.
//
// Modo simulação: o botão "Simular" libera arrastar as etiquetas de um bloco
// para outro (de uma frente para outra). Um contador mostra quantas cadeiras
// cada frente ficaria e o "Resetar" volta ao quadro real. É tudo local a esta
// tela — nada vai para o controle, o CG ou outros telões.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DistrictSnapshot, ElectionSnapshot } from '@/lib/haagar2026/model';
import { FRONT_ORDER, MAJORITY, frontColor, frontName, textOn } from '@/lib/haagar/rules';
import { fmtPct } from '../ui';

const ROWS = 15;

type SeatState = 'aguardando' | 'segura' | 'mantida' | 'risco' | 'virou';

function seatState(d: DistrictSnapshot): SeatState {
  if (!d.leader || d.counted <= 0) return 'aguardando';
  if (d.flipped) return 'virou';
  if (d.leadingFlip) return 'risco';
  return d.isFinal ? 'mantida' : 'segura';
}

/** Frente com que a cadeira entra na simulação: quem lidera agora (ou quem tinha em 2022). */
const baseFront = (d: DistrictSnapshot) => d.leader?.front ?? d.prev.front ?? '—';

interface DragState { id: number; x: number; y: number; over: string | null; moved: boolean; startX: number; startY: number }

export default function ScenePendulo({ snap, onDistrict }: { snap: ElectionSnapshot; onDistrict: (id: number) => void }) {
  const [sim, setSim] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Lados fixos pela base de 2022 (não trocam de lugar durante a simulação)
  const prevByFront: Record<string, DistrictSnapshot[]> = {};
  snap.districts.forEach(d => { const f = d.prev.front ?? '—'; (prevByFront[f] ||= []).push(d); });
  const ranked = Object.keys(prevByFront).sort((a, b) => prevByFront[b].length - prevByFront[a].length);
  const left = ranked[0];
  const right = ranked[1];
  const center = FRONT_ORDER.filter(f => f !== left && f !== right && prevByFront[f]?.length)
    .concat(ranked.filter(f => !FRONT_ORDER.includes(f) && f !== left && f !== right));

  // Fora da simulação: agrupado por 2022. Na simulação: pela frente atribuída.
  const simFront = (d: DistrictSnapshot) => overrides[d.id] ?? baseFront(d);
  const byFront: Record<string, DistrictSnapshot[]> = {};
  snap.districts.forEach(d => { const f = sim ? simFront(d) : (d.prev.front ?? '—'); (byFront[f] ||= []).push(d); });
  Object.values(byFront).forEach(list => list.sort((a, b) => a.prev.marginPct - b.prev.marginPct));
  // frente que surgir só na simulação (ex.: liderando sem ter cadeira em 2022) vai ao centro
  const extra = sim ? Object.keys(byFront).filter(f => f !== left && f !== right && !center.includes(f)) : [];
  const centerFronts = center.concat(extra);
  const centerList = centerFronts.flatMap(f => byFront[f] ?? []);

  const colsL = Math.max(1, Math.ceil((byFront[left]?.length ?? 0) / ROWS));
  const colsR = Math.max(1, Math.ceil((byFront[right]?.length ?? 0) / ROWS));
  const colsC = Math.max(1, Math.ceil(centerList.length / ROWS));

  // ---- Contagem da simulação
  const counts = useMemo(() => {
    const base: Record<string, number> = {};
    const now: Record<string, number> = {};
    snap.districts.forEach(d => {
      const b = baseFront(d);
      base[b] = (base[b] ?? 0) + 1;
      const f = overrides[d.id] ?? b;
      now[f] = (now[f] ?? 0) + 1;
    });
    return { base, now };
  }, [snap.districts, overrides]);
  const movedCount = Object.keys(overrides).length;

  const assign = (id: number, front: string) => {
    const d = snap.districtById[id];
    if (!d) return;
    setOverrides(o => {
      const next = { ...o };
      if (front === baseFront(d)) delete next[id]; else next[id] = front;
      return next;
    });
  };

  // ---- Arrastar (ponteiro: funciona com mouse e toque; o palco é escalado)
  const toStage = (clientX: number, clientY: number) => {
    const el = rootRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const k = r.width / (el.offsetWidth || 1);
    return { x: (clientX - r.left) / k, y: (clientY - r.top) / k };
  };
  const dropAt = (clientX: number, clientY: number) => {
    const hit = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    return hit?.closest<HTMLElement>('[data-drop]')?.dataset.drop ?? null;
  };
  const startDrag = (id: number, e: React.PointerEvent) => {
    if (!sim) return;
    e.preventDefault();
    const p = toStage(e.clientX, e.clientY);
    setDrag({ id, x: p.x, y: p.y, over: null, moved: false, startX: p.x, startY: p.y });
  };
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const p = toStage(e.clientX, e.clientY);
      const over = dropAt(e.clientX, e.clientY);
      setDrag(d => d && { ...d, x: p.x, y: p.y, over, moved: d.moved || Math.hypot(p.x - d.startX, p.y - d.startY) > 6 });
    };
    const up = (e: PointerEvent) => {
      const over = dropAt(e.clientX, e.clientY);
      setDrag(d => {
        if (d && d.moved && over) assign(d.id, over);
        return null;
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const dragged = drag ? snap.districtById[drag.id] : null;
  const draggedFront = dragged ? simFront(dragged) : null;
  const seatProps = { sim, overrides, draggingId: drag?.moved ? drag.id : null, onDistrict, onDragStart: startDrag };

  return (
    <div ref={rootRef} className={`relative h-full flex flex-col gap-3 ${dragging ? 'select-none' : ''}`}>
      {/* Cabeçalho: lados e leitura */}
      <div className="grid gap-4 items-end" style={{ gridTemplateColumns: `${colsL}fr ${colsC}fr ${colsR}fr` }}>
        <SideHeader snap={snap} fronts={[left]} align="left" list={byFront[left] ?? []} sim={sim} counts={counts} />
        <SideHeader snap={snap} fronts={centerFronts} align="center" list={centerList} sim={sim} counts={counts} />
        <SideHeader snap={snap} fronts={[right]} align="right" list={byFront[right] ?? []} sim={sim} counts={counts} />
      </div>

      {/* Etiquetas */}
      <div className="flex-1 min-h-0 grid gap-4" style={{ gridTemplateColumns: `${colsL}fr ${colsC}fr ${colsR}fr` }}>
        <Block list={byFront[left] ?? []} cols={colsL} side="left" fronts={[left]} drag={drag?.moved ? drag : null} fromFront={draggedFront} {...seatProps} />
        <Block list={centerList} cols={colsC} side="center" fronts={centerFronts} drag={drag?.moved ? drag : null} fromFront={draggedFront} {...seatProps} />
        <Block list={byFront[right] ?? []} cols={colsR} side="right" fronts={[right]} drag={drag?.moved ? drag : null} fromFront={draggedFront} {...seatProps} />
      </div>

      {/* Rodapé: legenda (ao vivo) ou contador (simulação) */}
      <div className="flex items-center gap-6 text-[15px] text-tv-muted">
        <button onClick={() => { setSim(s => !s); setDrag(null); }}
          className={`shrink-0 rounded-full px-5 py-2 text-[16px] font-black transition-colors ${sim ? 'bg-tv-accent text-tv-accent-text' : 'bg-tv-surface border border-tv-border text-tv-text hover:bg-tv-text/10'}`}>
          {sim ? 'Sair da simulação' : 'Simular'}
        </button>
        {sim ? (
          <SimCounter snap={snap} counts={counts} moved={movedCount} order={[left, ...centerFronts, right]}
            onReset={() => setOverrides({})} />
        ) : (
          <>
            <span className="font-bold text-tv-text">Mais perto do centro = menor vantagem em 2022</span>
            <Legend kind="aguardando" label="Aguardando urnas" />
            <Legend kind="segura" label="Segurando" />
            <Legend kind="mantida" label="Mantida ✓" />
            <Legend kind="risco" label="Outra frente na frente" />
            <Legend kind="virou" label="Virou" />
          </>
        )}
      </div>

      {/* Etiqueta "na mão" enquanto arrasta */}
      {drag?.moved && dragged && (
        <div className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-[8px] px-3 py-2 text-[15px] font-black shadow-2xl ring-2 ring-white/80"
          style={{ left: drag.x, top: drag.y, width: 190, background: frontColor(drag.over ?? draggedFront), color: textOn(frontColor(drag.over ?? draggedFront)) }}>
          <span className="truncate block">{dragged.name}</span>
          <span className="text-[11px] font-bold opacity-80">{drag.over && drag.over !== draggedFront ? `${draggedFront} → ${drag.over}` : `${draggedFront}`}</span>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ Contador ----
function SimCounter({ snap, counts, moved, order, onReset }: {
  snap: ElectionSnapshot; counts: { base: Record<string, number>; now: Record<string, number> }; moved: number; order: string[]; onReset: () => void;
}) {
  const fronts = order.filter((f, i) => order.indexOf(f) === i && ((counts.now[f] ?? 0) > 0 || (counts.base[f] ?? 0) > 0));
  const hasPr = snap.reported > 0;
  return (
    <div className="flex-1 min-w-0 flex items-center gap-3">
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
        {fronts.map(f => {
          const n = counts.now[f] ?? 0;
          const delta = n - (counts.base[f] ?? 0);
          const ft = snap.frontByLegend[f];
          const pr = ft ? ft.prConfirmed + ft.prProjected : 0;
          const total = n + pr;
          const c = frontColor(f);
          return (
            <div key={f} className="shrink-0 flex items-center gap-2 rounded-[12px] bg-tv-surface/90 border border-tv-border/60 pl-1.5 pr-3 py-1">
              <span className="rounded-[8px] px-2 py-0.5 text-[14px] font-black" style={{ background: c, color: textOn(c) }}>{f}</span>
              <span className="text-[22px] font-black text-tv-text tabular-nums leading-none">{n}</span>
              {delta !== 0 && (
                <span className={`text-[14px] font-black tabular-nums ${delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{delta > 0 ? `+${delta}` : delta}</span>
              )}
              {hasPr && (
                <span className={`text-[12px] tabular-nums ${total >= MAJORITY ? 'text-tv-text font-black' : ''}`}
                  title="Distritos simulados + proporcional projetado">
                  {total} c/ PR{total >= MAJORITY ? ' · maioria' : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <span className="shrink-0 text-[14px] tabular-nums">{moved} {moved === 1 ? 'cadeira trocada' : 'cadeiras trocadas'}{hasPr ? ` · maioria ${MAJORITY}` : ''}</span>
      <button onClick={onReset} disabled={moved === 0}
        className="shrink-0 rounded-full px-5 py-2 text-[16px] font-black bg-tv-surface border border-tv-border text-tv-text hover:bg-tv-text/10 disabled:opacity-40">
        ↺ Resetar
      </button>
    </div>
  );
}

// --------------------------------------------------------------- Bloco ----
interface SeatCommon {
  sim: boolean;
  overrides: Record<number, string>;
  draggingId: number | null;
  onDistrict: (id: number) => void;
  onDragStart: (id: number, e: React.PointerEvent) => void;
}

/** Preenche as colunas a partir do centro: a coluna mais disputada encosta no meio. */
function Block({ list, cols, side, fronts, drag, fromFront, ...seat }: SeatCommon & {
  list: DistrictSnapshot[]; cols: number; side: 'left' | 'center' | 'right'; fronts: string[];
  drag: DragState | null; fromFront: string | null;
}) {
  const columns: DistrictSnapshot[][] = Array.from({ length: cols }, (_, c) => list.slice(c * ROWS, (c + 1) * ROWS));
  // à esquerda, a primeira coluna (mais disputada) fica à direita, junto do centro
  const ordered = side === 'left' ? [...columns].reverse() : columns;
  const single = fronts.length === 1 ? fronts[0] : null;
  const hot = !!drag && !!single && drag.over === single && single !== fromFront;
  return (
    <div data-drop={seat.sim && single ? single : undefined}
      className="relative min-w-0 rounded-[24px] bg-tv-surface/80 border border-tv-border/60 p-3 grid gap-2 transition-shadow"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, boxShadow: hot ? `0 0 0 4px ${frontColor(single)}` : undefined }}>
      {ordered.map((col, i) => (
        <div key={i} className="min-w-0 grid gap-[5px]" style={{ gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))` }}>
          {col.map(d => <Seat key={d.id} d={d} {...seat} />)}
        </div>
      ))}
      {/* Centro com várias frentes: ao arrastar, uma área de soltar para cada uma */}
      {drag && !single && fronts.length > 0 && (
        <div className="absolute inset-2 z-20 flex flex-col gap-2">
          {fronts.map(f => {
            const c = frontColor(f);
            const over = drag.over === f;
            return (
              <div key={f} data-drop={f}
                className="flex-1 min-h-0 rounded-[16px] flex items-center justify-center text-[22px] font-black backdrop-blur-sm transition-all"
                style={{ background: over ? c : `${c}55`, color: over ? textOn(c) : 'rgb(var(--tv-text))', boxShadow: `inset 0 0 0 2px ${c}` }}>
                {f === fromFront ? `${f} (atual)` : f}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ Etiqueta ----
function Seat({ d, sim, overrides, draggingId, onDistrict, onDragStart }: SeatCommon & { d: DistrictSnapshot }) {
  const st = seatState(d);
  const holder = frontColor(d.prev.front);
  const lead = d.leader ? frontColor(d.leader.front) : holder;
  if (sim) return <SimSeat d={d} front={overrides[d.id] ?? baseFront(d)} moved={d.id in overrides} lifted={draggingId === d.id} onDragStart={onDragStart} />;
  const onClick = () => onDistrict(d.id);
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

/** Etiqueta no modo simulação: cor da frente atribuída; quem tinha em 2022 fica na borda. */
function SimSeat({ d, front, moved, lifted, onDragStart }: {
  d: DistrictSnapshot; front: string; moved: boolean; lifted: boolean; onDragStart: (id: number, e: React.PointerEvent) => void;
}) {
  const c = frontColor(front);
  const holder = d.prev.front ?? '—';
  const changed = front !== holder;
  return (
    <div onPointerDown={e => onDragStart(d.id, e)}
      title={`${d.name} (${d.ufName}) · 2022: ${holder} por ${fmtPct(d.prev.marginPct)} · simulação: ${front}`}
      className={`relative min-w-0 rounded-[7px] flex items-center gap-1.5 pl-2.5 pr-2 overflow-hidden cursor-grab active:cursor-grabbing touch-none transition-opacity ${lifted ? 'opacity-25' : ''}`}
      style={{ background: c, color: textOn(c), boxShadow: moved ? 'inset 0 0 0 2px rgb(255 255 255 / 0.85)' : undefined }}>
      {changed && <span className="absolute inset-y-0 left-0 w-[5px]" style={{ background: frontColor(holder) }} />}
      <span className="flex-1 min-w-0 truncate text-[14px] font-bold leading-none">{d.name}</span>
      {changed
        ? <span className="shrink-0 rounded-[4px] px-1 text-[11px] font-black leading-[1.4]" style={{ background: frontColor(holder), color: textOn(frontColor(holder)) }}>{holder}</span>
        : <span className="shrink-0 text-[11px] font-semibold opacity-70 tabular-nums">{d.prev.marginPct.toFixed(1).replace('.', ',')}</span>}
    </div>
  );
}

// ----------------------------------------------------------- Cabeçalho ----
function SideHeader({ snap, fronts, list, align, sim, counts }: {
  snap: ElectionSnapshot; fronts: string[]; list: DistrictSnapshot[]; align: 'left' | 'center' | 'right';
  sim: boolean; counts: { base: Record<string, number>; now: Record<string, number> };
}) {
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
        <span className="text-[17px] text-tv-muted truncate">{single ? frontName(single) : 'Outras frentes'} · {list.length} {sim ? 'cadeiras na simulação' : 'cadeiras em 2022'}</span>
      </div>
      {sim ? (
        <div className="text-[15px] mt-1.5 tabular-nums text-tv-muted">
          {fronts.map(f => {
            const delta = (counts.now[f] ?? 0) - (counts.base[f] ?? 0);
            return <span key={f} className="mx-1.5 first:ml-0 last:mr-0"><b className="text-tv-text">{f} {counts.now[f] ?? 0}</b>{delta !== 0 && <span className={delta > 0 ? 'text-emerald-400' : 'text-rose-400'}> ({delta > 0 ? '+' : ''}{delta})</span>}</span>;
          })}
          {" · arraste as etiquetas"}
        </div>
      ) : (
      <div className="text-[15px] mt-1.5 tabular-nums text-tv-muted">
        <b className="text-tv-text">{kept}</b> mantidas · <b className="text-tv-text">{risk}</b> em risco · <b className="text-tv-text">{lost}</b> perdidas
        {snap.reported <= 0 && ' · aguardando apuração'}
      </div>
      )}
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
