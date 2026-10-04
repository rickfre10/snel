// app/2026/cenario/page.tsx
"use client";
// Montagem de cenário para 2026 (página do operador, não vai ao ar): ajusta a
// votação de cada frente — ou digita a meta de cadeiras e o sistema acha a
// votação —, mostra o resultado final previsto e manda para o controle.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useBaseline2022 } from '@/lib/haagar2026/useElection2026';
import { useControl } from '@/lib/haagar2026/useControl';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { FRONT_ORDER, MAJORITY, TOTAL_SEATS, frontColor, frontName, textOn } from '@/lib/haagar/rules';
import { SWING_LIMIT, cleanScenario, finalResult, fitSeats, parseScenarioCode, scenarioCode } from '@/lib/haagar2026/scenario';

const fmt1 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (n: number) => `${n > 0 ? '+' : ''}${fmt1(n)}`;

export default function Cenario2026() {
  const baseline = useBaseline2022();
  const { state, dispatch, ready } = useControl();

  const [seed, setSeed] = useState<number>(2026);
  const [swing, setSwing] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  // Começa pelo que está no ar
  useEffect(() => {
    if (!ready || loaded) return;
    setSeed(state.seed);
    setSwing({ ...(state.scenario?.swing ?? {}) });
    setLoaded(true);
  }, [ready, loaded, state.seed, state.scenario]);

  const scenario = useMemo(() => cleanScenario({ swing }), [swing]);
  const code = scenarioCode(seed, scenario);

  // Prévia do resultado final (100% apurado)
  const [preview, setPreview] = useState<ElectionSnapshot | null>(null);
  const [base, setBase] = useState<ElectionSnapshot | null>(null); // mesma semente, sem ajuste
  useEffect(() => {
    if (!baseline) return;
    const t = setTimeout(() => setPreview(finalResult(baseline, seed, scenario)), 60);
    return () => clearTimeout(t);
  }, [baseline, seed, scenario]);
  useEffect(() => { if (baseline) setBase(finalResult(baseline, seed, null)); }, [baseline, seed]);

  // Meta de cadeiras
  const [target, setTarget] = useState<Record<string, string>>({});
  const [fitting, setFitting] = useState<string | null>(null);
  const cancel = useRef(false);
  const targetNum = Object.fromEntries(FRONT_ORDER.map(f => [f, parseInt(target[f] ?? '', 10)]));
  const targetFilled = FRONT_ORDER.every(f => !isNaN(targetNum[f]));
  const targetSum = FRONT_ORDER.reduce((a, f) => a + (isNaN(targetNum[f]) ? 0 : targetNum[f]), 0);
  const fillTarget = () => preview && setTarget(Object.fromEntries(FRONT_ORDER.map(f => [f, String(preview.frontByLegend[f]?.confirmed ?? 0)])));
  const runFit = async () => {
    if (!baseline || !targetFilled) return;
    cancel.current = false;
    setFitting('Calculando…');
    const best = await fitSeats(baseline, seed, targetNum, scenario, (b, i) => {
      setFitting(`Calculando… passo ${i + 1} · diferença de ${b.distance} ${b.distance === 1 ? 'cadeira' : 'cadeiras'}`);
    });
    if (cancel.current) return;
    setSwing({ ...(best.scenario?.swing ?? {}) });
    setFitting(best.distance === 0 ? 'Meta atingida exatamente.' : `Melhor resultado: ${best.distance} ${best.distance === 1 ? 'cadeira' : 'cadeiras'} de diferença no total.`);
  };

  // Usar
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [paste, setPaste] = useState('');
  const pasted = paste.trim() ? parseScenarioCode(paste) : null;
  const send = () => {
    if (!confirm(`Mandar o cenário ${code} para o controle? A apuração será zerada.`)) return;
    dispatch({ type: 'newSeed', seed, scenario });
    setSent(true);
    setTimeout(() => setSent(false), 2500);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* sem permissão */ }
  };

  const onAir = scenarioCode(state.seed, state.scenario);

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white font-sans">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold">Montar cenário · 2026</h1>
            <p className="text-xs text-white/50">Ajuste a votação ou digite a meta de cadeiras, confira o resultado final e mande para o controle.</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-white/50">No ar: <b className="text-white font-mono">{onAir}</b></span>
            <Link href="/2026/controle" target="_blank" className="underline text-white/70">controle ↗</Link>
            <Link href="/2026" target="_blank" className="underline text-white/70">telão ↗</Link>
          </div>
        </header>

        {!baseline ? <div className="text-white/60">Carregando a base de 2022…</div> : (
          <div className="grid lg:grid-cols-[1fr_440px] gap-5">
            <div className="flex flex-col gap-5">
              {/* Semente */}
              <Card title="Semente" hint="Muda os detalhes (candidatos, distritos que viram, ritmo da apuração). A tendência geral vem do ajuste de votação.">
                <div className="flex flex-wrap gap-2">
                  <input type="number" value={seed} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setSeed(v); }}
                    className="w-40 h-10 rounded-lg bg-black/40 border border-white/15 px-3 font-mono" />
                  <Btn onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>Sortear outra</Btn>
                  <Btn onClick={() => { setSeed(state.seed); setSwing({ ...(state.scenario?.swing ?? {}) }); }}>Carregar o que está no ar</Btn>
                </div>
              </Card>

              {/* Votação */}
              <Card title="Votação por frente" hint="Pontos percentuais somados à votação sorteada em todo o país (distrital e proporcional)."
                right={<Btn onClick={() => setSwing({})}>Zerar ajustes</Btn>}>
                <div className="flex flex-col gap-3">
                  {FRONT_ORDER.map(f => {
                    const v = swing[f] ?? 0;
                    const now = preview?.frontByLegend[f];
                    const was = base?.frontByLegend[f];
                    return (
                      <div key={f} className="grid grid-cols-[64px_1fr_64px_120px] items-center gap-3">
                        <span className="font-black flex items-center gap-2"><span className="w-3 h-3 rounded" style={{ background: frontColor(f) }} />{f}</span>
                        <input type="range" min={-SWING_LIMIT} max={SWING_LIMIT} step={0.5} value={v}
                          onChange={e => setSwing(s => ({ ...s, [f]: parseFloat(e.target.value) }))} style={{ accentColor: frontColor(f) }} className="w-full" />
                        <span className={`text-right font-mono text-sm ${v === 0 ? 'text-white/40' : ''}`}>{signed(v)}</span>
                        <span className="text-right text-xs text-white/60 tabular-nums">
                          prop. {now ? fmt1(now.prPct) : '—'}%{was && now && Math.abs(now.prPct - was.prPct) >= 0.05 ? <span className="text-white/40"> ({signed(now.prPct - was.prPct)})</span> : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Meta de cadeiras */}
              <Card title="Meta de cadeiras" hint="Digite quantas cadeiras cada frente deve ter no fim; o sistema ajusta a votação para chegar perto."
                right={<Btn onClick={fillTarget}>Copiar o resultado atual</Btn>}>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {FRONT_ORDER.map(f => (
                    <label key={f} className="flex flex-col gap-1">
                      <span className="text-xs font-black flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: frontColor(f) }} />{f}</span>
                      <input inputMode="numeric" value={target[f] ?? ''} onChange={e => setTarget(t => ({ ...t, [f]: e.target.value.replace(/\D/g, '') }))}
                        placeholder={String(preview?.frontByLegend[f]?.confirmed ?? '')}
                        className="h-10 rounded-lg bg-black/40 border border-white/15 px-3 font-mono" />
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <Btn primary onClick={runFit} disabled={!targetFilled || !!fitting?.startsWith('Calculando')}>Ajustar votação para esta meta</Btn>
                  <span className={`text-xs ${targetSum === TOTAL_SEATS ? 'text-white/60' : 'text-amber-300'}`}>Soma: {targetSum} de {TOTAL_SEATS}{targetSum !== TOTAL_SEATS && targetFilled ? ' (o sistema chega no mais perto possível)' : ''}</span>
                </div>
                {fitting && <div className="text-xs text-white/70 mt-2">{fitting}</div>}
              </Card>
            </div>

            {/* Resultado + usar */}
            <div className="flex flex-col gap-5">
              <Card title="Resultado final previsto" hint="Com 100% apurado, nesta semente e com estes ajustes.">
                {preview ? <Result snap={preview} base={base} target={targetFilled ? targetNum : null} /> : <div className="text-white/60 text-sm">Calculando…</div>}
              </Card>

              <Card title="Usar este cenário">
                <div className="flex gap-2">
                  <code className="flex-1 min-w-0 h-10 rounded-lg bg-black/40 border border-white/15 px-3 flex items-center font-mono text-sm truncate">{code}</code>
                  <Btn onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar'}</Btn>
                </div>
                <Btn primary className="w-full mt-2" onClick={send}>{sent ? 'Enviado ✓' : 'Enviar para o controle (zera a apuração)'}</Btn>
                <p className="text-[11px] text-white/50 mt-2">O código também pode ser colado na seção &quot;Cenário&quot; do controle.</p>
                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="text-xs text-white/60 mb-1.5">Abrir um código</div>
                  <div className="flex gap-2">
                    <input value={paste} onChange={e => setPaste(e.target.value)} placeholder="ex.: 2026:UNI+12,TDS-6"
                      className="flex-1 min-w-0 h-10 rounded-lg bg-black/40 border border-white/15 px-3 font-mono text-sm" />
                    <Btn disabled={!pasted} onClick={() => { if (pasted) { setSeed(pasted.seed); setSwing({ ...(pasted.scenario?.swing ?? {}) }); setPaste(''); } }}>Abrir</Btn>
                  </div>
                  {paste.trim() && !pasted && <div className="text-[11px] text-amber-300 mt-1">Código inválido.</div>}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Resultado --
function Result({ snap, base, target }: { snap: ElectionSnapshot; base: ElectionSnapshot | null; target: Record<string, number> | null }) {
  const fronts = [...snap.fronts].sort((a, b) => b.confirmed - a.confirmed);
  const leader = fronts[0];
  const coalition = minimalCoalition(Object.fromEntries(fronts.map(f => [f.legend, f.confirmed])));
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl px-4 py-3 font-bold" style={leader.confirmed >= MAJORITY ? { background: frontColor(leader.legend), color: textOn(frontColor(leader.legend)) } : { background: 'rgba(255,255,255,0.08)' }}>
        {leader.confirmed >= MAJORITY
          ? `${leader.legend} forma a maioria sozinha (${leader.confirmed} de ${MAJORITY})`
          : `Parlamento sem maioria · menor coalizão: ${coalition.join(' + ')}`}
      </div>
      {/* barra de cadeiras com a linha da maioria */}
      <div className="relative h-7 rounded-lg overflow-hidden flex bg-white/5">
        {fronts.map(f => <div key={f.legend} style={{ width: `${(f.confirmed / TOTAL_SEATS) * 100}%`, background: frontColor(f.legend) }} title={`${f.legend}: ${f.confirmed}`} />)}
        <div className="absolute inset-y-0 w-[2px] bg-white" style={{ left: `${(MAJORITY / TOTAL_SEATS) * 100}%` }} />
      </div>
      <div className="grid grid-cols-[1fr_52px_96px_60px] text-[11px] uppercase tracking-wider text-white/50 font-bold pb-1 border-b border-white/10">
        <span>Frente</span><span className="text-right">Cad.</span><span className="text-right">dist · prop</span><span className="text-right">2022</span>
      </div>
      {fronts.map(f => {
        const t = target?.[f.legend];
        return (
          <div key={f.legend} className="grid grid-cols-[1fr_52px_96px_60px] items-center text-sm tabular-nums -mt-1.5">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded shrink-0" style={{ background: frontColor(f.legend) }} />
              <b>{f.legend}</b><span className="text-white/40 text-xs truncate">{frontName(f.legend)}</span>
            </span>
            <span className="text-right font-black text-base">{f.confirmed}{t !== undefined && !isNaN(t) && t !== f.confirmed && <span className="text-[10px] text-amber-300 font-normal"> ({t})</span>}</span>
            <span className="text-right text-white/60">{f.districtWon} · {f.prConfirmed}</span>
            <span className="text-right text-white/50">{f.prev.total}</span>
          </div>
        );
      })}
      <div className="grid grid-cols-3 gap-2 text-center mt-1">
        <Stat label="Viradas" value={snap.flips.length} />
        <Stat label="Maioria" value={MAJORITY} />
        <Stat label="Sem ajuste" value={base ? `${[...base.fronts].sort((a, b) => b.confirmed - a.confirmed)[0].legend} ${[...base.fronts].sort((a, b) => b.confirmed - a.confirmed)[0].confirmed}` : '—'} />
      </div>
    </div>
  );
}

/** Menor coalizão que chega à maioria (menos frentes; empate: mais cadeiras). */
function minimalCoalition(seats: Record<string, number>): string[] {
  const fronts = Object.keys(seats).filter(f => seats[f] > 0);
  let best: string[] | null = null;
  for (let mask = 1; mask < 1 << fronts.length; mask++) {
    const set = fronts.filter((_, i) => mask & (1 << i));
    const total = set.reduce((a, f) => a + seats[f], 0);
    if (total < MAJORITY) continue;
    const bestTotal = best ? best.reduce((a, f) => a + seats[f], 0) : 0;
    if (!best || set.length < best.length || (set.length === best.length && total > bestTotal)) best = set;
  }
  return (best ?? fronts).sort((a, b) => seats[b] - seats[a]);
}

// --------------------------------------------------------------- Pedaços --
function Card({ title, hint, right, children }: { title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-bold">{title}</h2>
          {hint && <p className="text-[11px] text-white/50 mt-0.5">{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Btn({ children, onClick, primary, disabled, className = '' }: { children: React.ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`h-10 px-3 rounded-lg text-sm font-bold border transition-colors shrink-0 disabled:opacity-40 ${primary ? 'bg-white text-black border-white hover:bg-white/85' : 'border-white/15 hover:bg-white/10'} ${className}`}>
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold">{label}</div>
      <div className="font-black tabular-nums">{value}</div>
    </div>
  );
}
