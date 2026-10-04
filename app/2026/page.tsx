// app/2026/page.tsx
"use client";
// Telão interativo — Eleições 2026 de Haagar.
//  • Atalhos discretos: tecla C (ou segurar o logo por 1 s) abre o controle
//    da apuração; F alterna tela cheia; Esc fecha o controle.
//  • O controle completo também fica em /2026/controle (ideal para outro
//    computador/tablet do operador).
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BRANDS } from '@/lib/brand';
import { useElection2026 } from '@/lib/haagar2026/useElection2026';
import type { SceneId } from '@/lib/haagar2026/control';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { MAJORITY, STATE_ORDER } from '@/lib/haagar/rules';
import { Stage, Ticker, LowerThird } from '@/components/tv/TvChrome';
import { fmtPct } from '@/components/tv/ui';
import ControlPanel from '@/components/tv/ControlPanel';
import { useBreaking } from '@/lib/haagar2026/useBreaking';
import IdleScreen from '@/components/tv/IdleScreen';
import TelaoScene from '@/components/tv/TelaoScene';

const ROTATE_MS = 15000;

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

  // ---- Publica a cena atual para o CG com fundo de telão replicar
  const viewKey = `${scene}|${scene === 'estado' ? uf : ''}|${scene === 'distrito' ? districtId : ''}`;
  useEffect(() => {
    if (!el.ready) return;
    const v = state.view;
    const current = v ? `${v.scene}|${v.uf ?? ''}|${v.districtId ?? ''}` : '';
    if (current === viewKey) return;
    const t = setTimeout(() => dispatch({
      type: 'setView',
      view: { scene, uf: scene === 'estado' ? uf : undefined, districtId: scene === 'distrito' ? districtId : undefined },
    }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey, el.ready]);

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

  return (
    <>
      <Stage brand={brand}>
        <TelaoScene brand={brand} snap={snap} scene={scene} uf={uf} districtId={districtId}
          onScene={setScene} onDistrict={openDistrict} onUf={setUf} onLogoLongPress={() => setDrawer(true)} />

        <LowerThird brand={brand} item={scene === 'idle' ? null : breaking} />
        <Ticker brand={brand} items={tickerItems} />
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
