// components/tv/ControlPanel.tsx
"use client";
// Controle da apuração 2026: ritmo, pausa, saltos, retenção por estado,
// cenário (semente), cena do telão e marca.
import React, { useEffect, useState } from 'react';
import { BRANDS, BrandId } from '@/lib/brand';
import { ControlAction, ControlState, DEFAULT_CG, DEFAULT_CG_TEXT, CgText, SceneId, SPEED_PRESETS } from '@/lib/haagar2026/control';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { MAJORITY, STATE_ORDER, frontColor } from '@/lib/haagar/rules';
import { districtsData } from '@/lib/staticData';

const SCENES: { id: SceneId; label: string }[] = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'parlamento', label: 'Parlamento' },
  { id: 'estado', label: 'Estado' },
  { id: 'distrito', label: 'Distrito' },
  { id: 'viradas', label: 'Viradas' },
  { id: 'comparativo', label: '22 × 26' },
  { id: 'idle', label: 'Vinheta (idle)' },
];

const Btn = ({ children, onClick, active, danger, className = '' }: { children: React.ReactNode; onClick: () => void; active?: boolean; danger?: boolean; className?: string }) => (
  <button onClick={onClick}
    className={`h-10 px-3 rounded-lg text-sm font-bold border transition-colors ${active ? 'bg-white text-black border-white' : danger ? 'border-red-400/50 text-red-300 hover:bg-red-500/15' : 'border-white/15 hover:bg-white/10'} ${className}`}>
    {children}
  </button>
);

const Section = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => (
  <section className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/60">{title}</h3>
      {right}
    </div>
    {children}
  </section>
);

export default function ControlPanel({ state, dispatch, progress, snap, mode, error, store }: {
  state: ControlState;
  dispatch: (a: ControlAction) => void;
  progress: number;
  snap: ElectionSnapshot | null;
  mode: string;
  store?: 'redis' | 'memory' | null;
  error?: string | null;
}) {
  const [customSpeed, setCustomSpeed] = useState('');
  const [seedInput, setSeedInput] = useState('');
  const [focusUf, setFocusUf] = useState('MA');
  const [focusDistrict, setFocusDistrict] = useState<number>(201);
  const [drag, setDrag] = useState<number | null>(null);
  const commitDrag = () => { if (drag !== null) { dispatch({ type: 'setProgress', progress: drag }); setDrag(null); } };
  const minutesLeft = state.running && state.speed > 0 ? (100 - progress) / state.speed : null;
  const leader = snap?.fronts[0];

  return (
    <div className="flex flex-col gap-3 text-white text-sm font-sans">
      {/* Status */}
      <Section title="Apuração" right={
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${mode === 'server' ? 'bg-emerald-500/20 text-emerald-300' : mode === 'local' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10'}`}
          title={mode === 'server' ? 'Sincronizado pelo servidor (funciona entre computadores)' : 'Sem servidor: sincroniza só janelas deste navegador'}>
          {mode === 'server' ? (store === 'redis' ? 'SERVIDOR · REDIS' : 'SERVIDOR · MEMÓRIA') : mode === 'local' ? 'LOCAL' : '...'}
        </span>}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-black tabular-nums">{(drag ?? progress).toFixed(2)}%</div>
            <div className="text-white/60 text-xs mt-1">
              ritmo global · {state.running ? (minutesLeft !== null ? `~${minutesLeft < 1 ? '<1' : Math.ceil(minutesLeft)} min p/ 100%` : '') : 'pausado'}
            </div>
          </div>
          <div className="text-right text-xs text-white/70 leading-5">
            {snap && <>
              <div>Votos apurados: <b>{snap.reported.toFixed(1)}%</b></div>
              <div>Distritos definidos: <b>{snap.calledCount}</b> · Viradas: <b>{snap.flips.length}</b></div>
              {leader && <div>Líder: <b style={{ color: frontColor(leader.legend) }}>{leader.legend}</b> {leader.projected} ({leader.projected >= MAJORITY ? 'maioria' : `faltam ${MAJORITY - leader.projected}`})</div>}
            </>}
          </div>
        </div>
        <input type="range" min={0} max={100} step={0.5} value={drag ?? progress}
          onChange={e => setDrag(parseFloat(e.target.value))}
          onPointerUp={commitDrag} onKeyUp={commitDrag} onBlur={commitDrag}
          className="w-full mt-3 accent-white" />
        <div className="grid grid-cols-4 gap-2 mt-3">
          <Btn onClick={() => dispatch({ type: state.running ? 'pause' : 'play' })} active={state.running} className="col-span-2 text-base">
            {state.running ? '❚❚ Pausar' : '▶ Iniciar / continuar'}
          </Btn>
          <Btn onClick={() => dispatch({ type: 'step', delta: -5 })}>−5%</Btn>
          <Btn onClick={() => dispatch({ type: 'step', delta: 1 })}>+1%</Btn>
          <Btn onClick={() => dispatch({ type: 'step', delta: 5 })}>+5%</Btn>
          <Btn onClick={() => dispatch({ type: 'step', delta: 10 })}>+10%</Btn>
          <Btn onClick={() => dispatch({ type: 'setProgress', progress: 100 })}>100%</Btn>
          <Btn danger onClick={() => { if (confirm('Zerar a apuração?')) dispatch({ type: 'reset' }); }}>Zerar</Btn>
        </div>
      </Section>

      <Section title="Ritmo (pontos % por minuto)">
        <div className="grid grid-cols-5 gap-2">
          {SPEED_PRESETS.map(p => (
            <Btn key={p.label} active={state.speed === p.speed} onClick={() => dispatch({ type: 'setSpeed', speed: p.speed })}>
              <span className="block leading-tight">{p.label}<span className="block text-[10px] opacity-60">{p.speed}/min</span></span>
            </Btn>
          ))}
        </div>
        <form className="flex gap-2 mt-2" onSubmit={e => { e.preventDefault(); const v = parseFloat(customSpeed.replace(',', '.')); if (v > 0) dispatch({ type: 'setSpeed', speed: v }); }}>
          <input value={customSpeed} onChange={e => setCustomSpeed(e.target.value)} placeholder={`Personalizado (atual ${state.speed})`}
            className="flex-1 h-10 rounded-lg bg-black/40 border border-white/15 px-3" />
          <Btn onClick={() => { const v = parseFloat(customSpeed.replace(',', '.')); if (v > 0) dispatch({ type: 'setSpeed', speed: v }); }}>Aplicar</Btn>
        </form>
      </Section>

      <Section title="Segurar estados" right={Object.keys(state.holds).length > 0 && <button className="text-xs underline text-white/70" onClick={() => dispatch({ type: 'clearHolds' })}>liberar todos</button>}>
        <div className="flex flex-col gap-2">
          {STATE_ORDER.map(uf => {
            const hold = state.holds[uf];
            const st = snap?.states[uf];
            const held = hold !== undefined && hold !== null;
            return (
              <div key={uf} className="grid grid-cols-[44px_1fr_88px] items-center gap-2">
                <span className="font-black">{uf}</span>
                <div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-white/70" style={{ width: `${st?.reported ?? 0}%` }} /></div>
                  <div className="text-[11px] text-white/50 mt-0.5">{st ? `${st.reported.toFixed(1)}% apurado` : ''}{held ? ` · retido em ${hold}%` : ''}</div>
                </div>
                <Btn active={held} onClick={() => dispatch({ type: 'setHold', uf, value: held ? null : Math.floor(Math.min(progress, 99)) })}>{held ? 'Liberar' : 'Segurar'}</Btn>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-white/50 mt-2">Segura a contagem do estado no ponto atual enquanto o resto do país avança.</p>
      </Section>

      <Section title="Telão">
        <div className="grid grid-cols-3 gap-2">
          {SCENES.map(s => (
            <Btn key={s.id} onClick={() => dispatch({ type: 'focus', scene: s.id, uf: s.id === 'estado' ? focusUf : undefined, districtId: s.id === 'distrito' ? focusDistrict : undefined })}>{s.label}</Btn>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <select value={focusUf} onChange={e => setFocusUf(e.target.value)} className="h-10 rounded-lg bg-black/40 border border-white/15 px-2">
            {STATE_ORDER.map(u => <option key={u} value={u}>Estado: {u}</option>)}
          </select>
          <select value={focusDistrict} onChange={e => setFocusDistrict(parseInt(e.target.value, 10))} className="h-10 rounded-lg bg-black/40 border border-white/15 px-2">
            {districtsData.map(d => <option key={d.district_id} value={d.district_id}>{d.district_id} · {d.district_name}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input type="checkbox" checked={state.autoRotate} onChange={e => dispatch({ type: 'setAutoRotate', value: e.target.checked })} className="w-4 h-4 accent-white" />
          Alternar cenas automaticamente
        </label>
        <div className="flex gap-2 mt-3">
          {(Object.keys(BRANDS) as BrandId[]).map(b => (
            <Btn key={b} active={state.brand === b} onClick={() => dispatch({ type: 'setBrand', brand: b })}>{BRANDS[b].name}</Btn>
          ))}
        </div>
      </Section>

      <CgTextEditor state={state} dispatch={dispatch} />

      <Section title="CG (sobre o vídeo)" right={<a href="/2026/cg?fundo=cena" target="_blank" rel="noreferrer" className="text-xs underline text-white/70">abrir CG ↗</a>}>
        {(() => {
          const cg = { ...DEFAULT_CG, ...state.cg };
          return (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Btn active={cg.seats} onClick={() => dispatch({ type: 'setCg', patch: { seats: !cg.seats } })}>Cadeiras</Btn>
                <Btn active={cg.ticker} onClick={() => dispatch({ type: 'setCg', patch: { ticker: !cg.ticker } })}>Faixa distritos</Btn>
                <Btn active={cg.bug} onClick={() => dispatch({ type: 'setCg', patch: { bug: !cg.bug } })}>Logo</Btn>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={!!cg.breaking} onChange={e => dispatch({ type: 'setCg', patch: { breaking: e.target.checked } })} className="w-4 h-4 accent-white" />
                Última hora automática (viradas e maioria)
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Btn active={cg.count === 'confirmadas'} onClick={() => dispatch({ type: 'setCg', patch: { count: 'confirmadas' } })}>Contar eleitos</Btn>
                <Btn active={cg.count === 'projecao'} onClick={() => dispatch({ type: 'setCg', patch: { count: 'projecao' } })}>Contar projeção</Btn>
              </div>
              <p className="text-[11px] text-white/50 mt-2">Fundo transparente em /2026/cg (OBS/vMix). Para chroma: ?fundo=verde, azul ou preto.</p>
            </>
          );
        })()}
      </Section>

      <Section title="Cenário">
        <div className="text-xs text-white/60 mb-2">Semente atual: <b className="text-white">{state.seed}</b> — a mesma semente gera sempre o mesmo resultado em todas as telas.</div>
        <div className="flex gap-2">
          <input value={seedInput} onChange={e => setSeedInput(e.target.value)} placeholder="Semente (número)" className="flex-1 h-10 rounded-lg bg-black/40 border border-white/15 px-3" />
          <Btn onClick={() => { const v = parseInt(seedInput, 10); if (!isNaN(v) && confirm(`Trocar para o cenário ${v}? A apuração será zerada.`)) dispatch({ type: 'newSeed', seed: v }); }}>Usar</Btn>
          <Btn onClick={() => { if (confirm('Sortear um novo cenário? A apuração será zerada.')) dispatch({ type: 'newSeed' }); }}>Sortear</Btn>
        </div>
      </Section>

      {error && <div className="rounded-lg bg-red-500/15 border border-red-400/40 text-red-200 px-3 py-2">{error}</div>}
      {snap?.baselineSource === 'fallback' && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-200 px-3 py-2 text-xs">
          Planilha de 2022 indisponível: comparações usam a estimativa salva no projeto.
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------ Texto livre no CG ------
const TEXT_PRESETS: { label1: string; label2: string }[] = [
  { label1: 'eleições', label2: '2026' },
  { label1: 'apuração', label2: 'ao vivo' },
  { label1: 'última', label2: 'hora' },
];

function CgTextEditor({ state, dispatch }: { state: ControlState; dispatch: (a: ControlAction) => void }) {
  const onAir: CgText = { ...DEFAULT_CG_TEXT, ...state.cg?.text };
  const [draft, setDraft] = useState<CgText>(onAir);
  const [touched, setTouched] = useState(false);
  // Acompanha o que está no ar enquanto o operador não estiver editando.
  useEffect(() => { if (!touched) setDraft(onAir); }, [onAir.headline, onAir.sub, onAir.label1, onAir.label2, touched]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch: Partial<CgText>) => { setTouched(true); setDraft(d => ({ ...d, ...patch })); };
  const send = (show: boolean) => {
    dispatch({ type: 'setCgText', patch: { ...draft, show } });
    setTouched(false);
  };
  const input = 'w-full h-10 rounded-lg bg-black/40 border border-white/15 px-3';

  return (
    <Section title="CG · texto livre" right={onAir.show ? <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-500/25 text-red-200">NO AR</span> : null}>
      <div className="grid grid-cols-2 gap-2">
        <input className={input} value={draft.label1} onChange={e => set({ label1: e.target.value })} placeholder="Bloco, linha 1 (ex.: edição)" />
        <input className={input} value={draft.label2} onChange={e => set({ label2: e.target.value })} placeholder="Bloco, linha 2 (ex.: das 19h)" />
      </div>
      <div className="flex gap-1.5 mt-2">
        {TEXT_PRESETS.map(p => (
          <button key={p.label1} onClick={() => set(p)} className="text-[11px] px-2 py-1 rounded border border-white/15 hover:bg-white/10">{p.label1} {p.label2}</button>
        ))}
      </div>
      <textarea className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 mt-2 resize-none" rows={2} maxLength={90}
        value={draft.headline} onChange={e => set({ headline: e.target.value })} placeholder="Manchete (até 2 linhas)" />
      <input className={`${input} mt-2`} maxLength={70} value={draft.sub} onChange={e => set({ sub: e.target.value })} placeholder="Subtítulo (opcional)" />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <Btn active={onAir.show && !touched} onClick={() => send(true)}>{onAir.show ? (touched ? 'Atualizar no ar' : 'No ar') : 'Colocar no ar'}</Btn>
        <Btn onClick={() => send(false)} danger={onAir.show}>Tirar do ar</Btn>
      </div>
      <p className="text-[11px] text-white/50 mt-2">Enquanto o texto está no ar, ele ocupa o lugar da tarja de cadeiras.</p>
    </Section>
  );
}
