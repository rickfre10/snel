// components/tv/ControlDesk.tsx
"use client";
// Mesa de controle para computador (/2026/controle): tudo visível numa tela
// larga, botões grandes e atalhos de teclado. A gaveta do telão (tecla C)
// continua com o painel compacto (ControlPanel).
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BRANDS, BrandId } from '@/lib/brand';
import { ControlAction, ControlState, DEFAULT_CG, DEFAULT_CG_TEXT, SceneId, SPEED_PRESETS } from '@/lib/haagar2026/control';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { MAJORITY, STATE_ORDER, frontColor } from '@/lib/haagar/rules';
import { districtsData } from '@/lib/staticData';
import { parseScenarioCode, scenarioCode } from '@/lib/haagar2026/scenario';
import { CgDistrictSection, CgPrSection, CgTextEditor, CgUrgentSection, DistrictSearch, MajorityToggle, PlaceInput, SCENES } from './ControlPanel';

interface DeskProps {
  state: ControlState;
  dispatch: (a: ControlAction) => void;
  progress: number;
  snap: ElectionSnapshot | null;
  mode: string;
  store?: 'redis' | 'memory' | null;
  error?: string | null;
}

type CgTab = 'distrito' | 'proporcional' | 'maioria' | 'texto';

const districtName = (id?: number) => (id ? districtsData.find(d => d.district_id === id)?.district_name ?? String(id) : '');
const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

export default function ControlDesk({ state, dispatch, progress, snap, mode, store, error }: DeskProps) {
  const cg = { ...DEFAULT_CG, ...state.cg };
  const text = { ...DEFAULT_CG_TEXT, ...cg.text };
  const [drag, setDrag] = useState<number | null>(null);
  const [uf, setUf] = useState('MA');
  const [lastDistrict, setLastDistrict] = useState(201);
  const [tab, setTab] = useState<CgTab>('distrito');
  const [help, setHelp] = useState(false);

  // ---- Ações
  const showScene = (scene: SceneId) => dispatch({ type: 'focus', scene, uf: scene === 'estado' ? uf : undefined, districtId: scene === 'distrito' ? lastDistrict : undefined });
  const showUf = (u: string) => { setUf(u); dispatch({ type: 'focus', scene: 'estado', uf: u }); };
  const showDistrict = (id: number) => { setLastDistrict(id); dispatch({ type: 'focus', scene: 'distrito', districtId: id }); };
  const manualOn = !!cg.majority || !!cg.district?.show || !!cg.pr?.show || (text.show && !!text.headline.trim());
  const clearTarjas = () => {
    dispatch({ type: 'setCg', patch: { majority: false, ...(cg.district ? { district: { ...cg.district, show: false } } : {}), ...(cg.pr ? { pr: { ...cg.pr, show: false } } : {}) } });
    if (text.show) dispatch({ type: 'setCgText', patch: { show: false } });
  };

  // ---- Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (e.key === ' ') { e.preventDefault(); dispatch({ type: state.running ? 'pause' : 'play' }); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'step', delta: e.shiftKey ? 5 : 1 }); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'step', delta: e.shiftKey ? -5 : -1 }); }
      else if (n >= 1 && n <= SCENES.length) showScene(SCENES[n - 1].id);
      else if (e.key === 'Escape') clearTarjas();
      else if (e.key === '/') { e.preventDefault(); document.getElementById('desk-search')?.focus(); }
      else if (e.key === '?') setHelp(h => !h);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---- O que está no ar no CG (mesma prioridade do /2026/cg)
  const onAir = useMemo(() => {
    const items: { label: string; detail: string; off: () => void }[] = [];
    if (cg.majority) items.push({ label: 'Maioria / minoria', detail: 'tarja na cor da frente ou "sem maioria"', off: () => dispatch({ type: 'setCg', patch: { majority: false } }) });
    if (cg.district?.show) items.push({ label: 'Distrito', detail: districtName(cg.district.id), off: () => dispatch({ type: 'setCg', patch: { district: { ...cg.district!, show: false } } }) });
    if (cg.pr?.show) items.push({ label: 'Proporcional', detail: cg.pr.uf === 'auto' ? 'rodízio' : cg.pr.uf === 'BR' ? 'Haagar' : snap?.states[cg.pr.uf]?.name ?? cg.pr.uf, off: () => dispatch({ type: 'setCg', patch: { pr: { ...cg.pr!, show: false } } }) });
    if (text.show && text.headline.trim()) items.push({ label: 'Texto livre', detail: text.headline, off: () => dispatch({ type: 'setCgText', patch: { show: false } }) });
    return items;
  }, [cg.majority, cg.district, cg.pr, text.show, text.headline, snap, dispatch]);

  const view = state.view;
  const viewLabel = view ? `${SCENES.find(s => s.id === view.scene)?.label ?? view.scene}${view.scene === 'estado' && view.uf ? ` · ${snap?.states[view.uf]?.name ?? view.uf}` : ''}${view.scene === 'distrito' && view.districtId ? ` · ${districtName(view.districtId)}` : ''}` : 'telão fechado';
  const leader = snap?.fronts[0];
  const minutesLeft = state.running && state.speed > 0 ? (100 - progress) / state.speed : null;
  const commitDrag = () => { if (drag !== null) { dispatch({ type: 'setProgress', progress: drag }); setDrag(null); } };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white font-sans text-sm flex flex-col">
      {/* ------------------------------------------------ Cabeçalho */}
      <header className="h-14 shrink-0 flex items-center gap-4 px-5 border-b border-white/10 bg-[#101016]">
        <h1 className="font-black text-base tracking-tight">Controle · Eleições 2026</h1>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${mode === 'server' ? 'bg-emerald-500/20 text-emerald-300' : mode === 'local' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10'}`}>
          {mode === 'server' ? (store === 'redis' ? 'SERVIDOR · REDIS' : 'SERVIDOR · MEMÓRIA') : mode === 'local' ? 'LOCAL' : 'CONECTANDO…'}
        </span>
        <div className="flex rounded-lg border border-white/15 overflow-hidden">
          {(Object.keys(BRANDS) as BrandId[]).map(b => (
            <button key={b} onClick={() => dispatch({ type: 'setBrand', brand: b })}
              className={`h-8 px-3 text-xs font-bold ${state.brand === b ? 'bg-white text-black' : 'hover:bg-white/10'}`}>{BRANDS[b].name}</button>
          ))}
        </div>
        <span className="text-xs text-white/50">Cenário <b className="font-mono text-white/80">{scenarioCode(state.seed, state.scenario)}</b></span>
        <span className="flex-1" />
        <nav className="flex items-center gap-3 text-xs">
          <Link href="/2026" target="_blank" className="underline text-white/70 hover:text-white">telão ↗</Link>
          <Link href="/2026/cg?fundo=cena" target="_blank" className="underline text-white/70 hover:text-white">CG ↗</Link>
          <Link href="/2026/cenario" target="_blank" className="underline text-white/70 hover:text-white">montar cenário ↗</Link>
          <button onClick={() => setHelp(h => !h)} className={`h-8 px-3 rounded-lg border text-xs font-bold ${help ? 'bg-white text-black border-white' : 'border-white/15 hover:bg-white/10'}`}>Atalhos (?)</button>
        </nav>
      </header>
      {help && <Shortcuts />}
      {error && <div className="bg-red-500/15 border-b border-red-400/40 text-red-200 px-5 py-2">{error}</div>}

      {/* ------------------------------------------------ Apuração (faixa) */}
      <section className="shrink-0 px-5 py-4 border-b border-white/10 bg-[#0e0e14] grid grid-cols-[auto_1fr_auto] gap-6 items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => dispatch({ type: state.running ? 'pause' : 'play' })} title="Espaço"
            className={`w-16 h-16 rounded-2xl text-2xl font-black border-2 transition-colors ${state.running ? 'bg-white text-black border-white' : 'border-emerald-400 text-emerald-300 hover:bg-emerald-400/10'}`}>
            {state.running ? '❚❚' : '▶'}
          </button>
          <div>
            <div className="text-[44px] font-black tabular-nums leading-none">{(drag ?? progress).toFixed(1)}<span className="text-2xl text-white/60">%</span></div>
            <div className="text-xs text-white/60 mt-1">{state.running ? (minutesLeft !== null ? `rodando · ~${minutesLeft < 1 ? '<1' : Math.ceil(minutesLeft)} min p/ 100%` : 'rodando') : 'pausado'}</div>
          </div>
        </div>
        <div className="min-w-0">
          <input type="range" min={0} max={100} step={0.5} value={drag ?? progress}
            onChange={e => setDrag(parseFloat(e.target.value))} onPointerUp={commitDrag} onKeyUp={commitDrag} onBlur={commitDrag}
            className="w-full accent-white" />
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {[-5, -1, 1, 5, 10].map(d => (
              <Key key={d} onClick={() => dispatch({ type: 'step', delta: d })} hint={d === 1 ? 'Seta →' : d === -1 ? 'Seta ←' : d === 5 ? 'Shift + →' : d === -5 ? 'Shift + ←' : undefined}>{d > 0 ? `+${d}` : d}%</Key>
            ))}
            <Key onClick={() => dispatch({ type: 'setProgress', progress: 100 })}>100%</Key>
            <span className="w-px h-7 bg-white/15 mx-1" />
            {SPEED_PRESETS.map(p => (
              <Key key={p.label} active={state.speed === p.speed} onClick={() => dispatch({ type: 'setSpeed', speed: p.speed })}>{p.label}</Key>
            ))}
            <span className="w-px h-7 bg-white/15 mx-1" />
            <Key danger onClick={() => { if (confirm('Zerar a apuração?')) dispatch({ type: 'reset' }); }}>Zerar</Key>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-white/60 tabular-nums">
          <span>Votos apurados</span><b className="text-white text-right">{snap ? snap.reported.toFixed(1) : '—'}%</b>
          <span>Distritos definidos</span><b className="text-white text-right">{snap?.calledCount ?? '—'}/120</b>
          <span>Viradas</span><b className="text-white text-right">{snap?.flips.length ?? '—'}</b>
          <span>Líder</span>
          <b className="text-right" style={{ color: leader ? frontColor(leader.legend) : undefined }}>
            {leader ? `${leader.legend} ${leader.projected} (${leader.projected >= MAJORITY ? 'maioria' : `−${MAJORITY - leader.projected}`})` : '—'}
          </b>
        </div>
      </section>

      {/* ------------------------------------------------ Colunas */}
      <main className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(360px,1fr)_minmax(480px,1.35fr)_minmax(320px,0.9fr)] gap-4 p-4">
        {/* ---------- Telão */}
        <Column title="Telão" right={<span className="text-xs text-white/60">no ar: <b className="text-white">{viewLabel}</b></span>}>
          <div className="grid grid-cols-2 gap-2">
            {SCENES.map((s, i) => (
              <button key={s.id} onClick={() => showScene(s.id)}
                className={`h-14 rounded-xl border text-left px-4 flex items-center justify-between font-bold text-[15px] transition-colors ${view?.scene === s.id ? 'bg-white text-black border-white' : 'border-white/15 hover:bg-white/10'}`}>
                <span>{s.label}</span>
                <kbd className={`text-[11px] font-mono rounded px-1.5 py-0.5 ${view?.scene === s.id ? 'bg-black/10' : 'bg-white/10 text-white/60'}`}>{i + 1}</kbd>
              </button>
            ))}
          </div>
          <Label>Estado</Label>
          <div className="grid grid-cols-3 gap-2">
            {STATE_ORDER.map(u => (
              <button key={u} onClick={() => showUf(u)}
                className={`h-11 rounded-lg border text-xs font-bold truncate px-2 ${view?.scene === 'estado' && view.uf === u ? 'bg-white text-black border-white' : 'border-white/15 hover:bg-white/10'}`}>
                {snap?.states[u]?.name ?? u}
              </button>
            ))}
          </div>
          <Label>Distrito <span className="normal-case tracking-normal text-white/40">(atalho /)</span></Label>
          <DistrictSearch snap={snap} onShow={showDistrict} inputId="desk-search" currentId={view?.scene === 'distrito' ? view.districtId : undefined} />
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input type="checkbox" checked={state.autoRotate} onChange={e => dispatch({ type: 'setAutoRotate', value: e.target.checked })} className="w-4 h-4 accent-white" />
            Alternar cenas automaticamente
          </label>
        </Column>

        {/* ---------- CG */}
        <Column title="CG" right={<a href="/2026/cg?fundo=telao" target="_blank" rel="noreferrer" className="text-xs underline text-white/60">ver CG com telão ↗</a>}>
          {/* No ar agora */}
          <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/60">No ar agora</span>
              <button onClick={clearTarjas} disabled={!manualOn}
                className="h-9 px-3 rounded-lg text-xs font-black border border-red-400/60 text-red-200 hover:bg-red-500/15 disabled:opacity-30">Tirar tarjas (Esc)</button>
            </div>
            {onAir.length === 0 ? (
              <div className="text-white/80">{cg.seats ? `Caixas de cadeiras (${cg.count === 'projecao' ? 'projeção' : 'eleitos'})` : 'Sem tarja (só faixa e logo)'}</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {onAir.map((it, i) => (
                  <div key={it.label} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${i === 0 ? 'bg-red-500/15 border border-red-400/40' : 'bg-white/5 text-white/50'}`}>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${i === 0 ? 'bg-red-500 text-white' : 'bg-white/10'}`}>{i === 0 ? 'NO AR' : 'ATRÁS'}</span>
                    <b className="shrink-0">{it.label}</b>
                    <span className="truncate flex-1 text-xs opacity-80">{it.detail}</span>
                    <button onClick={it.off} className="text-xs underline opacity-80 hover:opacity-100">tirar</button>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[11px] text-white/45 mt-2">
              Por cima de tudo, automático: {cg.autoResults !== false ? 'resultados de distrito' : 'resultados desligados'} · {cg.breaking ? 'última hora' : 'última hora desligada'}
            </div>
          </div>

          {/* Peças fixas */}
          <div className="grid grid-cols-5 gap-2 mt-3">
            <Toggle on={cg.seats} onClick={() => dispatch({ type: 'setCg', patch: { seats: !cg.seats } })}>Cadeiras</Toggle>
            <Toggle on={cg.ticker} onClick={() => dispatch({ type: 'setCg', patch: { ticker: !cg.ticker } })}>Faixa</Toggle>
            <Toggle on={cg.bug} onClick={() => dispatch({ type: 'setCg', patch: { bug: !cg.bug } })}>Logo</Toggle>
            <Toggle on={cg.count === 'confirmadas'} onClick={() => dispatch({ type: 'setCg', patch: { count: 'confirmadas' } })}>Eleitos</Toggle>
            <Toggle on={cg.count === 'projecao'} onClick={() => dispatch({ type: 'setCg', patch: { count: 'projecao' } })}>Projeção</Toggle>
          </div>

          {/* Tarjas manuais */}
          <div className="flex gap-1 mt-4 border-b border-white/10">
            {([
              ['distrito', 'Distrito', !!cg.district?.show],
              ['proporcional', 'Proporcional', !!cg.pr?.show],
              ['maioria', 'Maioria', !!cg.majority],
              ['texto', 'Texto livre', text.show && !!text.headline.trim()],
            ] as [CgTab, string, boolean][]).map(([id, label, live]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`h-10 px-4 rounded-t-lg text-sm font-bold flex items-center gap-2 ${tab === id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}>
                {label}{live && <span className="w-2 h-2 rounded-full bg-red-500" />}
              </button>
            ))}
          </div>
          <div className="pt-3">
            {tab === 'distrito' && <CgDistrictSection state={state} dispatch={dispatch} snap={snap} />}
            {tab === 'proporcional' && <CgPrSection state={state} dispatch={dispatch} snap={snap} />}
            {tab === 'maioria' && (
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
                <MajorityToggle cg={cg} snap={snap} dispatch={dispatch} />
                <p className="text-[11px] text-white/50 mt-2">Com maioria: tarja na cor da frente. Sem maioria: &quot;eleição indefinida&quot; (apurando) ou &quot;governo de minoria&quot; (100%). Quando alguém atinge a maioria, a tarja também entra sozinha por 15 s.</p>
              </div>
            )}
            {tab === 'texto' && <CgTextEditor state={state} dispatch={dispatch} />}
          </div>

          <div className="mt-3"><CgUrgentSection state={state} dispatch={dispatch} /></div>
        </Column>

        {/* ---------- Apuração avançada */}
        <Column title="Apuração">
          <Label first>Segurar estados {Object.keys(state.holds).length > 0 && <button className="ml-2 normal-case tracking-normal underline text-white/60" onClick={() => dispatch({ type: 'clearHolds' })}>liberar todos</button>}</Label>
          <div className="flex flex-col gap-1.5">
            {STATE_ORDER.map(u => {
              const hold = state.holds[u];
              const st = snap?.states[u];
              const held = hold !== undefined && hold !== null;
              return (
                <div key={u} className="grid grid-cols-[1fr_84px] items-center gap-2">
                  <div className="min-w-0">
                    <div className="flex justify-between text-xs"><b className="truncate">{st?.name ?? u}</b><span className="text-white/50 tabular-nums">{st ? `${st.reported.toFixed(1)}%` : ''}{held ? ` · retido ${hold}%` : ''}</span></div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1"><div className={`h-full ${held ? 'bg-amber-300' : 'bg-white/70'}`} style={{ width: `${st?.reported ?? 0}%` }} /></div>
                  </div>
                  <button onClick={() => dispatch({ type: 'setHold', uf: u, value: held ? null : Math.floor(Math.min(progress, 99)) })}
                    className={`h-9 rounded-lg border text-xs font-bold ${held ? 'bg-amber-300 text-black border-amber-300' : 'border-white/15 hover:bg-white/10'}`}>{held ? 'Liberar' : 'Segurar'}</button>
                </div>
              );
            })}
          </div>

          <Label>Cenário</Label>
          <ScenarioBox state={state} dispatch={dispatch} />

          <Label>Selo de local (SmartvNews)</Label>
          <PlaceInput value={cg.place ?? ''} onSave={place => dispatch({ type: 'setCg', patch: { place } })} />

          {snap?.baselineSource === 'fallback' && (
            <div className="mt-4 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-200 px-3 py-2 text-xs">Planilha de 2022 indisponível: comparações usam a estimativa salva no projeto.</div>
          )}
        </Column>
      </main>
    </div>
  );
}

// ------------------------------------------------------------- Pedaços ----
function Column({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl bg-white/[0.03] border border-white/10 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[12px] uppercase tracking-[0.25em] font-black text-white/70">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Label({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return <div className={`text-[11px] uppercase tracking-[0.18em] font-bold text-white/50 mb-2 ${first ? '' : 'mt-5'}`}>{children}</div>;
}

function Key({ children, onClick, active, danger, hint }: { children: React.ReactNode; onClick: () => void; active?: boolean; danger?: boolean; hint?: string }) {
  return (
    <button onClick={onClick} title={hint}
      className={`h-9 px-3 rounded-lg border text-xs font-bold tabular-nums transition-colors ${active ? 'bg-white text-black border-white' : danger ? 'border-red-400/50 text-red-300 hover:bg-red-500/15' : 'border-white/15 hover:bg-white/10'}`}>
      {children}
    </button>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`h-11 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 ${on ? 'bg-emerald-400/15 border-emerald-400/60 text-emerald-200' : 'border-white/15 text-white/50 hover:bg-white/10'}`}>
      <span className={`w-2 h-2 rounded-full ${on ? 'bg-emerald-400' : 'bg-white/20'}`} />{children}
    </button>
  );
}

function ScenarioBox({ state, dispatch }: { state: ControlState; dispatch: (a: ControlAction) => void }) {
  const [code, setCode] = useState('');
  const parsed = code.trim() ? parseScenarioCode(code) : null;
  return (
    <div>
      <div className="text-xs text-white/60 mb-2">No ar: <b className="font-mono text-white">{scenarioCode(state.seed, state.scenario)}</b></div>
      <div className="flex gap-2">
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="Semente ou código"
          className="flex-1 min-w-0 h-10 rounded-lg bg-black/40 border border-white/15 px-3 font-mono text-xs" />
        <button disabled={!parsed} onClick={() => { if (parsed && confirm(`Usar o cenário ${scenarioCode(parsed.seed, parsed.scenario)}? A apuração será zerada.`)) { dispatch({ type: 'newSeed', seed: parsed.seed, scenario: parsed.scenario }); setCode(''); } }}
          className="h-10 px-3 rounded-lg border border-white/15 text-xs font-bold hover:bg-white/10 disabled:opacity-30">Usar</button>
        <button onClick={() => { if (confirm('Sortear um novo cenário (sem ajustes)? A apuração será zerada.')) dispatch({ type: 'newSeed', scenario: null }); }}
          className="h-10 px-3 rounded-lg border border-white/15 text-xs font-bold hover:bg-white/10">Sortear</button>
      </div>
      {code.trim() && !parsed && <div className="text-[11px] text-amber-300 mt-1">Código inválido.</div>}
      <Link href="/2026/cenario" target="_blank" className="inline-block text-xs underline text-white/60 mt-2">montar cenário (votação ou meta de cadeiras) ↗</Link>
    </div>
  );
}

function Shortcuts() {
  const rows: [string, string][] = [
    ['Espaço', 'iniciar / pausar a apuração'],
    ['← →', '−1% / +1%  (com Shift: ±5%)'],
    ['1 – 8', 'cena do telão (na ordem dos botões)'],
    ['/', 'buscar distrito para o telão'],
    ['Esc', 'tirar as tarjas manuais do CG'],
    ['?', 'mostrar / esconder esta ajuda'],
  ];
  return (
    <div className="px-5 py-3 border-b border-white/10 bg-[#13131b] flex flex-wrap gap-x-8 gap-y-1.5 text-xs">
      {rows.map(([k, v]) => (
        <span key={k} className="flex items-center gap-2"><kbd className="font-mono bg-white/10 rounded px-1.5 py-0.5 text-white">{k}</kbd><span className="text-white/60">{v}</span></span>
      ))}
      <span className="text-white/40">Os atalhos não valem enquanto você digita num campo.</span>
    </div>
  );
}

