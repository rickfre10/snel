// components/tv/ControlPanel.tsx
"use client";
// Controle da apuração 2026: ritmo, pausa, saltos, retenção por estado,
// cenário (semente), cena do telão e marca.
import React, { useEffect, useState } from 'react';
import { BRANDS, BrandId } from '@/lib/brand';
import { ControlAction, ControlState, DEFAULT_CG, DEFAULT_CG_TEXT, CgText, SceneId, SPEED_PRESETS } from '@/lib/haagar2026/control';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { MAJORITY, STATE_ORDER, frontColor, textOn } from '@/lib/haagar/rules';
import { districtsData } from '@/lib/staticData';
import { parseScenarioCode, scenarioCode } from '@/lib/haagar2026/scenario';

const SCENES: { id: SceneId; label: string }[] = [
  { id: 'geral', label: 'Visão geral' },
  { id: 'parlamento', label: 'Parlamento' },
  { id: 'proporcional', label: 'Proporcional' },
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
        <DistrictSearch snap={snap} onShow={id => { setFocusDistrict(id); dispatch({ type: 'focus', scene: 'distrito', districtId: id }); }}
          currentId={state.focus?.scene === 'distrito' ? state.focus.districtId : undefined} />
        <div className="grid grid-cols-3 gap-2 mt-3">
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

      <CgUrgentSection state={state} dispatch={dispatch} />
      <CgDistrictSection state={state} dispatch={dispatch} snap={snap} />
      <CgPrSection state={state} dispatch={dispatch} snap={snap} />
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
              <MajorityToggle cg={cg} snap={snap} dispatch={dispatch} />
              <PlaceInput value={cg.place ?? ''} onSave={place => dispatch({ type: 'setCg', patch: { place } })} />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Btn active={cg.count === 'confirmadas'} onClick={() => dispatch({ type: 'setCg', patch: { count: 'confirmadas' } })}>Contar eleitos</Btn>
                <Btn active={cg.count === 'projecao'} onClick={() => dispatch({ type: 'setCg', patch: { count: 'projecao' } })}>Contar projeção</Btn>
              </div>
              <p className="text-[11px] text-white/50 mt-2">Fundo transparente em /2026/cg (OBS/vMix). Para chroma: ?fundo=verde, azul ou preto.</p>
            </>
          );
        })()}
      </Section>

      <Section title="Cenário" right={<a href="/2026/cenario" target="_blank" rel="noreferrer" className="text-xs underline text-white/70">montar cenário ↗</a>}>
        <div className="text-xs text-white/60 mb-2">No ar: <b className="text-white font-mono">{scenarioCode(state.seed, state.scenario)}</b> — o mesmo código gera sempre o mesmo resultado em todas as telas.</div>
        <div className="flex gap-2">
          <input value={seedInput} onChange={e => setSeedInput(e.target.value)} placeholder="Semente ou código (ex.: 2026:UNI+12,TDS-6)" className="flex-1 min-w-0 h-10 rounded-lg bg-black/40 border border-white/15 px-3 font-mono text-sm" />
          <Btn onClick={() => {
            const p = parseScenarioCode(seedInput);
            if (!p) { alert('Código inválido. Use a semente (ex.: 2026) ou o código da tela de cenário (ex.: 2026:UNI+12,TDS-6).'); return; }
            if (confirm(`Usar o cenário ${scenarioCode(p.seed, p.scenario)}? A apuração será zerada.`)) { dispatch({ type: 'newSeed', seed: p.seed, scenario: p.scenario }); setSeedInput(''); }
          }}>Usar</Btn>
          <Btn onClick={() => { if (confirm('Sortear um novo cenário (sem ajustes)? A apuração será zerada.')) dispatch({ type: 'newSeed', scenario: null }); }}>Sortear</Btn>
        </div>
        <p className="text-[11px] text-white/50 mt-2">Em &quot;montar cenário&quot; dá para ajustar a votação de cada frente ou pedir uma distribuição de cadeiras e ver o resultado final antes de mandar.</p>
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
  { label1: '', label2: '' },
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
    const district = state.cg?.district;
    if (show && (district?.show || state.cg?.majority || state.cg?.pr?.show)) dispatch({ type: 'setCg', patch: { majority: false, pr: { uf: state.cg?.pr?.uf ?? 'auto', show: false }, ...(district ? { district: { ...district, show: false } } : {}) } });
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
          <button key={p.label1 || 'logo'} onClick={() => set(p)} className="text-[11px] px-2 py-1 rounded border border-white/15 hover:bg-white/10">{p.label1 ? `${p.label1} ${p.label2}` : 'só o logo'}</button>
        ))}
      </div>
      <textarea className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 mt-2 resize-none" rows={2} maxLength={90}
        value={draft.headline} onChange={e => set({ headline: e.target.value })} placeholder="Manchete (até 2 linhas)" />
      <input className={`${input} mt-2`} maxLength={70} value={draft.sub} onChange={e => set({ sub: e.target.value })} placeholder="Subtítulo (opcional)" />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <Btn active={onAir.show && !touched} onClick={() => send(true)}>{onAir.show ? (touched ? 'Atualizar no ar' : 'No ar') : 'Colocar no ar'}</Btn>
        <Btn onClick={() => send(false)} danger={onAir.show}>Tirar do ar</Btn>
      </div>
      <p className="text-[11px] text-white/50 mt-2">Enquanto o texto está no ar, ele ocupa o lugar da tarja de cadeiras (e tira a tarja de distrito). Resultados automáticos e última hora passam por cima. Com as duas linhas do bloco vazias, o bloco mostra o logo.</p>
    </Section>
  );
}

// ------------------------------------------- CG · urgência (automático) --
function CgUrgentSection({ state, dispatch }: { state: ControlState; dispatch: (a: ControlAction) => void }) {
  const cg = { ...DEFAULT_CG, ...state.cg };
  const auto = cg.autoResults !== false;
  return (
    <Section title="CG · urgência" right={auto || cg.breaking ? <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/25 text-amber-200">AUTOMÁTICO</span> : null}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={auto} onChange={e => dispatch({ type: 'setCg', patch: { autoResults: e.target.checked } })} className="w-4 h-4 accent-white" />
        Resultados automáticos (cada distrito definido, 15 s cada, em fila)
      </label>
      <label className="flex items-center gap-2 mt-2 cursor-pointer">
        <input type="checkbox" checked={!!cg.breaking} onChange={e => dispatch({ type: 'setCg', patch: { breaking: e.target.checked } })} className="w-4 h-4 accent-white" />
        Última hora automática (viradas e maioria)
      </label>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Btn onClick={() => dispatch({ type: 'setCg', patch: { queueSkip: (cg.queueSkip ?? 0) + 1 } })}>Pular atual</Btn>
        <Btn danger onClick={() => dispatch({ type: 'setCg', patch: { queueClear: (cg.queueClear ?? 0) + 1 } })}>Limpar fila</Btn>
      </div>
      <p className="text-[11px] text-white/50 mt-2">Urgência passa por cima de qualquer outra tarja do CG (cadeiras, texto livre, distrito). Se vários distritos saem juntos, entram um depois do outro.</p>
    </Section>
  );
}

// ------------------------------------------------ CG · tarja de maioria --
function MajorityToggle({ cg, snap, dispatch }: { cg: typeof DEFAULT_CG; snap: ElectionSnapshot | null; dispatch: (a: ControlAction) => void }) {
  const conf = snap?.fronts.find(f => f.confirmed >= MAJORITY);
  const proj = snap?.fronts.find(f => f.projected >= MAJORITY);
  const who = conf ? `${conf.legend} forma a maioria (${conf.confirmed})` : proj ? `${proj.legend} projeta maioria (${proj.projected})` : 'ninguém chegou à maioria ainda';
  return (
    <div className="flex items-center gap-2 mt-2">
      <Btn active={!!cg.majority} onClick={() => dispatch({ type: 'setCg', patch: { majority: !cg.majority, ...(!cg.majority && cg.pr?.show ? { pr: { ...cg.pr, show: false } } : {}) } })}>Tarja de maioria</Btn>
      <span className="text-[11px] text-white/60 min-w-0 truncate">{who}</span>
    </div>
  );
}

// ----------------------------------------------- CG · proporcional -------
function CgPrSection({ state, dispatch, snap }: { state: ControlState; dispatch: (a: ControlAction) => void; snap: ElectionSnapshot | null }) {
  const cg = { ...DEFAULT_CG, ...state.cg };
  const cur = cg.pr ?? { show: false, uf: 'auto' };
  const put = (uf: string) => dispatch({
    type: 'setCg',
    // Uma tarja manual por vez
    patch: { pr: { show: true, uf }, majority: false, ...(cg.district ? { district: { ...cg.district, show: false } } : {}), text: { ...DEFAULT_CG_TEXT, ...cg.text, show: false } },
  });
  const options = [{ id: 'auto', label: 'Rodízio' }, { id: 'BR', label: 'Haagar' }, ...STATE_ORDER.map(u => ({ id: u, label: snap?.states[u]?.name ?? u }))];
  const guaranteed = snap ? STATE_ORDER.reduce((a, u) => a + Object.values(snap.states[u].prGuaranteed).reduce((x, y) => x + y, 0), 0) : 0;
  return (
    <Section title="CG · proporcional" right={cur.show ? <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-500/25 text-red-200">NO AR</span> : null}>
      <div className="grid grid-cols-4 gap-2">
        {options.map(o => (
          <Btn key={o.id} active={cur.show && cur.uf === o.id} onClick={() => put(o.id)} className="truncate">{o.label}</Btn>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="flex-1 text-[11px] text-white/60">{guaranteed} de 93 cadeiras proporcionais já garantidas</span>
        {cur.show && <Btn danger onClick={() => dispatch({ type: 'setCg', patch: { pr: { ...cur, show: false } } })}>Tirar do ar</Btn>}
      </div>
      <p className="text-[11px] text-white/50 mt-2">Cadeiras projetadas por frente, quantas já estão garantidas (✓) e o % do voto proporcional. Rodízio alterna Haagar e os estados a cada 8 s.</p>
    </Section>
  );
}

// ------------------------------------------------- CG · tarja de distrito --
function CgDistrictSection({ state, dispatch, snap }: { state: ControlState; dispatch: (a: ControlAction) => void; snap: ElectionSnapshot | null }) {
  const cg = { ...DEFAULT_CG, ...state.cg };
  const cur = cg.district;
  const sd = cur ? snap?.districtById[cur.id] : null;
  const name = cur ? districtsData.find(d => d.district_id === cur.id)?.district_name ?? String(cur.id) : null;
  const put = (id: number) => dispatch({
    type: 'setCg',
    // Colocar o distrito tira o texto livre do ar (uma tarja por vez)
    patch: { district: { show: true, id }, majority: false, pr: { uf: cg.pr?.uf ?? 'auto', show: false }, text: { ...DEFAULT_CG_TEXT, ...cg.text, show: false } },
  });
  return (
    <Section title="CG · distrito" right={cur?.show ? <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-500/25 text-red-200">NO AR</span> : null}>
      <DistrictSearch snap={snap} onShow={put} currentId={cur?.id} actionLabel="no CG →" />
      {cur && (
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 min-w-0 text-sm">
            <div className="font-bold truncate">{cur.id} · {name}</div>
            <div className="text-[11px] text-white/50 truncate">{sd ? `${sd.reported.toFixed(1)}% apurado · ${sd.status.label}` : ''}</div>
          </div>
          {cur.show
            ? <Btn danger onClick={() => dispatch({ type: 'setCg', patch: { district: { ...cur, show: false } } })}>Tirar do ar</Btn>
            : <Btn onClick={() => put(cur.id)}>Colocar no ar</Btn>}
        </div>
      )}
      <p className="text-[11px] text-white/50 mt-2">Líder e 2º colocado com foto, apuração e situação (lidera, muito próximo, mantém, toma de…). Fica no lugar da tarja de cadeiras.</p>
    </Section>
  );
}

// ------------------------------------------------ Busca de distritos -----
const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Busca por nome, número, UF, estado ou região; um toque manda o distrito para o telão. */
function DistrictSearch({ snap, onShow, currentId, actionLabel = 'no telão →' }: { snap: ElectionSnapshot | null; onShow: (id: number) => void; currentId?: number; actionLabel?: string }) {
  const [q, setQ] = useState('');
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const results = terms.length === 0 ? [] : districtsData
    .map(d => ({ d, hay: norm(`${d.district_id} ${d.district_name} ${d.uf} ${d.uf_name} ${d.region_name} ${d.city_name}`) }))
    .filter(x => terms.every(t => x.hay.includes(t)))
    // nome que começa com o termo vem primeiro
    .sort((a, b) => Number(!norm(a.d.district_name).startsWith(terms[0])) - Number(!norm(b.d.district_name).startsWith(terms[0])) || a.d.district_id - b.d.district_id)
    .slice(0, 8);

  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar distrito (nome, número, UF ou região)"
        onKeyDown={e => { if (e.key === 'Enter' && results[0]) { onShow(results[0].d.district_id); setQ(''); } }}
        className="w-full h-11 rounded-lg bg-black/40 border border-white/20 px-3 text-[15px]" />
      {results.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {results.map(({ d }) => {
            const sd = snap?.districtById[d.district_id];
            const lead = sd?.leader;
            const c = lead ? frontColor(lead.front) : null;
            return (
              <button key={d.district_id} onClick={() => { onShow(d.district_id); setQ(''); }}
                className={`flex items-center gap-2 text-left rounded-lg px-2.5 py-2 border hover:bg-white/10 ${currentId === d.district_id ? 'border-white/60' : 'border-white/10'}`}>
                <span className="text-[11px] text-white/50 w-8 tabular-nums">{d.district_id}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold truncate">{d.district_name}</span>
                  <span className="block text-[11px] text-white/50 truncate">{d.uf} · {d.region_name}</span>
                </span>
                {lead && c && <span className="text-[11px] font-black rounded px-1.5 py-0.5" style={{ background: c, color: textOn(c) }}>{lead.front}</span>}
                {sd && <span className="text-[11px] text-white/60 tabular-nums w-12 text-right">{sd.reported.toFixed(0)}%</span>}
                <span className="text-[11px] font-bold text-white/80 whitespace-nowrap">{actionLabel}</span>
              </button>
            );
          })}
        </div>
      )}
      {terms.length > 0 && results.length === 0 && <div className="text-[12px] text-white/50 mt-2">Nenhum distrito encontrado.</div>}
    </div>
  );
}

// ------------------------------------------- Texto do selo de local (CG) --
function PlaceInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  const save = () => { setEditing(false); if (draft !== value) onSave(draft.trim()); };
  return (
    <div className="mt-2">
      <div className="text-[11px] text-white/50 mb-1">Selo acima do &quot;AO VIVO&quot; (SmartvNews) — vazio = &quot;Haagar · Eleições 2026&quot;</div>
      <div className="flex gap-2">
        <input value={draft} onChange={e => { setEditing(true); setDraft(e.target.value); }} onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); }} maxLength={40} placeholder="Ex.: São Pedro, MA"
          className="flex-1 h-10 rounded-lg bg-black/40 border border-white/15 px-3" />
        <Btn onClick={save}>Aplicar</Btn>
      </div>
    </div>
  );
}
