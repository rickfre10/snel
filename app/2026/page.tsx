// app/2026/page.tsx
"use client";
// Telão interativo — Eleições 2026 de Haagar.
//  • Atalhos discretos: tecla C (ou segurar o logo por 1 s) abre o controle
//    da apuração; F alterna tela cheia; Esc fecha o controle.
//  • O controle completo também fica em /2026/controle (ideal para outro
//    computador/tablet do operador).
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BRANDS, BrandId } from '@/lib/brand';
import { useElection2026 } from '@/lib/haagar2026/useElection2026';
import type { SceneId } from '@/lib/haagar2026/control';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { MAJORITY, STATE_ORDER, frontName } from '@/lib/haagar/rules';
import { Stage, TopBar, Ticker, LowerThird, Breaking, caseOf } from '@/components/tv/TvChrome';
import { BrandLogo, fmtPct } from '@/components/tv/ui';
import ControlPanel from '@/components/tv/ControlPanel';
import IdleScreen from '@/components/tv/IdleScreen';
import SceneGeral from '@/components/tv/scenes/SceneGeral';
import SceneParlamento from '@/components/tv/scenes/SceneParlamento';
import SceneEstado from '@/components/tv/scenes/SceneEstado';
import SceneDistrito from '@/components/tv/scenes/SceneDistrito';
import SceneViradas from '@/components/tv/scenes/SceneViradas';
import SceneComparativo from '@/components/tv/scenes/SceneComparativo';

const ROTATE_MS = 15000;
const BREAKING_MS = 7000;

export default function Telao2026() {
  const el = useElection2026();
  const { state, snapshot: snap, dispatch } = el;
  const brand = BRANDS[state.brand] ?? BRANDS.smartv;

  const [scene, setScene] = useState<SceneId>('geral');
  const [uf, setUf] = useState('MA');
  const [districtId, setDistrictId] = useState<number>(201);
  const [drawer, setDrawer] = useState(false);

  const openDistrict = useCallback((id: number) => { setDistrictId(id); setScene('distrito'); }, []);
  const openUf = useCallback((u: string) => { setUf(u); setScene('estado'); }, []);

  // ---- Cena enviada pelo operador
  const lastFocusRev = useRef<number | null>(null);
  useEffect(() => {
    const f = state.focus;
    if (!f || f.rev === lastFocusRev.current) return;
    lastFocusRev.current = f.rev;
    if (f.uf) setUf(f.uf);
    if (f.districtId) setDistrictId(f.districtId);
    setScene(f.scene);
  }, [state.focus]);

  // ---- Rotação automática de cenas
  useEffect(() => {
    if (!state.autoRotate) return;
    const seq: { scene: SceneId; uf?: string }[] = [
      { scene: 'geral' }, { scene: 'parlamento' },
      ...STATE_ORDER.filter(u => u !== 'TP').map(u => ({ scene: 'estado' as SceneId, uf: u })),
      { scene: 'viradas' }, { scene: 'comparativo' },
    ];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % seq.length;
      if (seq[i].uf) setUf(seq[i].uf!);
      setScene(seq[i].scene);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [state.autoRotate]);

  // ---- Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'c' || e.key === 'C') setDrawer(d => !d);
      else if (e.key === 'i' || e.key === 'I') setScene(s => (s === 'idle' ? 'geral' : 'idle'));
      else if (e.key === 'Escape') setDrawer(false);
      else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- Última hora: viradas confirmadas e maioria
  const breaking = useBreaking(snap, state.seed);
  const tickerItems = useMemo(() => (snap ? buildTicker(snap) : []), [snap]);

  const nav = [
    { id: 'geral', label: caseOf(brand, 'Visão geral') },
    { id: 'parlamento', label: caseOf(brand, 'Parlamento') },
    { id: 'estado', label: caseOf(brand, 'Estados') },
    { id: 'viradas', label: caseOf(brand, 'Viradas') },
    { id: 'comparativo', label: '2022 × 2026' },
    ...(scene === 'distrito' && snap ? [{ id: 'distrito', label: snap.districtById[districtId]?.name ?? 'Distrito' }] : []),
  ].map(n => ({ ...n, active: scene === n.id, onClick: () => setScene(n.id as SceneId) }));

  const toggleBrand = () => {
    const ids = Object.keys(BRANDS) as BrandId[];
    dispatch({ type: 'setBrand', brand: ids[(ids.indexOf(state.brand) + 1) % ids.length] });
  };

  return (
    <>
      <Stage brand={brand}>
        <TopBar brand={brand} snap={snap} nav={nav} onLogoLongPress={() => setDrawer(true)} />

        <main className="absolute left-10 right-10 top-[132px] bottom-[100px]">
          {!snap ? (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-tv-muted">
              <div className="tv-pulse"><BrandLogo brand={brand} size={88} color="rgb(var(--tv-text))" /></div>
              <div className="text-[22px]">Carregando base de 2022…</div>
            </div>
          ) : (
            <div key={`${scene}-${scene === 'estado' ? uf : ''}-${scene === 'distrito' ? districtId : ''}`} className="h-full tv-scene-in">
              {scene === 'geral' && <SceneGeral snap={snap} onDistrict={openDistrict} />}
              {scene === 'parlamento' && <SceneParlamento snap={snap} />}
              {scene === 'estado' && <SceneEstado snap={snap} uf={uf} onUf={setUf} onDistrict={openDistrict} />}
              {scene === 'distrito' && <SceneDistrito snap={snap} districtId={districtId} onDistrict={openDistrict} onUf={openUf} />}
              {scene === 'viradas' && <SceneViradas snap={snap} onDistrict={openDistrict} />}
              {scene === 'comparativo' && <SceneComparativo snap={snap} onDistrict={openDistrict} />}
            </div>
          )}
        </main>

        <LowerThird brand={brand} item={scene === 'idle' ? null : breaking} />
        <Ticker brand={brand} items={tickerItems} right={
          <button onClick={toggleBrand} title={`Visual: ${brand.name} (trocar)`}
            className="w-[56px] rounded-[14px] bg-tv-text/[0.08] hover:bg-tv-text/20 flex items-center justify-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: BRANDS.smartv.colors.accent, opacity: state.brand === 'smartv' ? 1 : 0.35 }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: BRANDS.smartvnews.colors.accent2, opacity: state.brand === 'smartvnews' ? 1 : 0.35 }} />
          </button>
        } />
        {scene === 'idle' && (
          <IdleScreen brand={brand} onExit={() => setScene('geral')}
            info={snap && snap.reported > 0 ? `${fmtPct(snap.reported)} dos votos apurados` : 'Acompanhe a apuração ao vivo'} />
        )}
      </Stage>

      {/* Gaveta discreta de controle (fora do palco, sem escala) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-[440px] max-w-full bg-[#0b0b0f]/95 backdrop-blur border-l border-white/10 shadow-2xl transition-transform duration-300 overflow-y-auto ${drawer ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[#0b0b0f] border-b border-white/10 font-sans text-white">
          <div>
            <div className="font-bold">Controle da apuração</div>
            <Link href="/2026/controle" target="_blank" className="text-xs text-white/60 underline">abrir em outra janela ↗</Link>
          </div>
          <button onClick={() => setDrawer(false)} className="w-9 h-9 rounded-lg hover:bg-white/10 text-xl" aria-label="Fechar">×</button>
        </div>
        <div className="p-4">
          <ControlPanel state={state} dispatch={dispatch} progress={el.progress} snap={snap} mode={el.mode} error={el.error} store={el.store} />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Helpers --

function useBreaking(snap: ElectionSnapshot | null, seed: number): Breaking | null {
  const seen = useRef<{ seed: number; finals: Set<number>; majority: string | null } | null>(null);
  const queue = useRef<Breaking[]>([]);
  const [current, setCurrent] = useState<Breaking | null>(null);

  useEffect(() => {
    if (!snap) return;
    const finals = new Set(snap.districts.filter(d => d.isFinal).map(d => d.id));
    const majorityFront = snap.fronts.find(f => f.confirmed >= MAJORITY)?.legend ?? null;
    // Primeira leitura (ou novo cenário / volta no tempo): só memoriza.
    if (!seen.current || seen.current.seed !== seed || finals.size < seen.current.finals.size) {
      seen.current = { seed, finals, majority: majorityFront };
      queue.current = [];
      return;
    }
    const prev = seen.current;
    snap.districts.forEach(d => {
      if (d.flipped && !prev.finals.has(d.id) && d.leader) {
        queue.current.push({
          id: `flip-${seed}-${d.id}`,
          headline: `${d.leader.front} toma ${d.name}`,
          sub: `Cadeira era da ${d.prev.front} · ${d.ufName} · ${d.leader.name} eleito com ${fmtPct(d.leader.pct)}`,
          front: d.leader.front,
        });
      }
    });
    if (majorityFront && prev.majority !== majorityFront) {
      const f = snap.frontByLegend[majorityFront];
      queue.current.unshift({
        id: `maj-${seed}-${majorityFront}`,
        headline: `${majorityFront} conquista a maioria`,
        sub: `${frontName(majorityFront)} chega a ${f.confirmed} cadeiras confirmadas (maioria: ${MAJORITY})`,
        front: majorityFront,
      });
    }
    // Evita fila gigante em saltos grandes de apuração
    if (queue.current.length > 6) queue.current = queue.current.slice(0, 6);
    seen.current = { seed, finals, majority: majorityFront };
  }, [snap, seed]);

  useEffect(() => {
    if (current) {
      const t = setTimeout(() => setCurrent(queue.current.shift() ?? null), BREAKING_MS);
      return () => clearTimeout(t);
    }
    const poll = setInterval(() => {
      const next = queue.current.shift();
      if (next) setCurrent(next);
    }, 800);
    return () => clearInterval(poll);
  }, [current]);

  return current;
}

function buildTicker(snap: ElectionSnapshot): string[] {
  const items: string[] = [];
  const leader = snap.fronts[0];
  if (snap.reported <= 0) return ['Urnas fechadas em Haagar · a apuração começa em instantes', `São ${MAJORITY} cadeiras para a maioria no Parlamento`];
  if (leader) items.push(`${leader.legend} projeta ${leader.projected} cadeiras · ${leader.confirmed} confirmadas · maioria: ${MAJORITY}`);
  items.push(`${fmtPct(snap.reported)} dos votos apurados · ${snap.calledCount} distritos definidos`);
  [...snap.flips].slice(-6).forEach(d => items.push(`${d.leader!.front} toma ${d.name} (${d.uf}) da ${d.prev.front}`));
  snap.districts
    .filter(d => d.leader && d.runnerUp && !d.isFinal && d.marginPct < 2 && d.reported > 20)
    .sort((a, b) => a.marginPct - b.marginPct)
    .slice(0, 4)
    .forEach(d => items.push(`Disputa apertada em ${d.name}: ${d.leader!.front} × ${d.runnerUp!.front} separados por ${fmtPct(d.marginPct)}`));
  STATE_ORDER.forEach(u => {
    const s = snap.states[u];
    if (s.reported >= 100) items.push(`${s.name}: apuração concluída`);
  });
  return items;
}
