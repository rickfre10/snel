// components/tv/scenes/SceneDistrito.tsx
"use client";
import React from 'react';
import type { CandidateResult, DistrictSnapshot, ElectionSnapshot } from '@/lib/haagar2026/model';
import { FRONT_ORDER, frontColor, frontName } from '@/lib/haagar/rules';
import { AnimatedNumber, Avatar, Delta, FrontPill, Panel, ProgressBar, StatusChip, fmtInt, fmtPct, g } from '../ui';

export default function SceneDistrito({ snap, districtId, onDistrict, onUf }: { snap: ElectionSnapshot; districtId: number; onDistrict: (id: number) => void; onUf: (uf: string) => void }) {
  const d = snap.districtById[districtId];
  if (!d) return null;
  const st = snap.states[d.uf];
  const idx = st.districtIds.indexOf(d.id);
  const prevId = st.districtIds[(idx - 1 + st.districtIds.length) % st.districtIds.length];
  const nextId = st.districtIds[(idx + 1) % st.districtIds.length];

  const top = d.candidates.slice(0, 5);
  const maxPct = Math.max(50, ...top.map(c => c.pct));
  const fronts = FRONT_ORDER.filter(f => (d.shares[f] ?? 0) > 0 || (d.prev.shares[f] ?? 0) > 0);
  const hasData = d.counted > 0;


  return (
    <div className="h-full flex flex-col gap-5">
      {/* Cabeçalho do distrito */}
      <div className="rounded-[28px] bg-tv-surface/90 border border-tv-border/70 px-8 py-5 flex items-center gap-8">
        <div className="flex gap-2">
          <button onClick={() => onDistrict(prevId)} className="w-12 h-12 rounded-full bg-tv-surface2 text-[22px] font-black hover:bg-tv-border" aria-label="Distrito anterior">‹</button>
          <button onClick={() => onDistrict(nextId)} className="w-12 h-12 rounded-full bg-tv-surface2 text-[22px] font-black hover:bg-tv-border" aria-label="Próximo distrito">›</button>
        </div>
        <div className="min-w-0 flex-1">
          <button onClick={() => onUf(d.uf)} className="text-[14px] uppercase tracking-[0.2em] text-tv-kicker font-bold hover:underline">{d.ufName} · {d.region} · Distrito {d.id}</button>
          <h1 className="text-[52px] font-black leading-none truncate mt-1">{d.name}</h1>
        </div>
        <div className="w-[380px]">
          <div className="flex justify-between text-[15px] mb-2"><span className="text-tv-muted">Urnas apuradas</span><span className="font-bold tabular-nums">{fmtInt(d.pollsCounted)}/{fmtInt(d.polls)} · {fmtPct(d.reported)}</span></div>
          <ProgressBar value={d.reported} height={12} />
        </div>
        <StatusChip label={d.status.label} bg={d.status.backgroundColor} fg={d.status.textColor} final={d.isFinal} size="lg" />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[1fr_620px] gap-6">
        <Panel kicker="Candidatos 2026" title={hasData && d.leader ? `${d.leader.name} ${d.isFinal ? g('eleito', 'eleita', d.leader.gender) : 'à frente'}` : 'Aguardando primeiras urnas'}
          bodyClassName="flex flex-col gap-3">
          {top.map((c, i) => {
            const col = frontColor(c.front);
            const elected = d.isFinal && i === 0;
            return (
              <div key={c.front} className={`relative rounded-[24px] border flex items-center gap-5 px-5 overflow-hidden ${i === 0 ? 'py-5 bg-tv-surface2/80 border-tv-border' : 'py-3 bg-tv-surface2/40 border-tv-border/50'}`}>
                <Avatar name={c.name} legend={c.front} photo={c.photo} size={i === 0 ? 92 : 64} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`${i === 0 ? 'text-[32px]' : 'text-[24px]'} font-black leading-tight truncate`}>{c.name}</span>
                    {elected && <span className="rounded-full bg-[#3fd0b8] text-[#06231e] px-3 py-0.5 text-[14px] font-black uppercase">{g('Eleito', 'Eleita', c.gender)}</span>}
                    {c.incumbent && <span className="rounded-full bg-tv-text text-tv-bg px-2.5 py-0.5 text-[12px] font-black uppercase tracking-wider">{g('Deputado atual', 'Deputada atual', c.gender)}</span>}
                    {c.incumbentParty && <span className="rounded-full border-2 px-2.5 py-0.5 text-[12px] font-black uppercase tracking-wider" style={{ borderColor: col }}>Partido incumbente</span>}
                    {!c.incumbent && c.rerun && <span className="rounded-full border border-tv-border px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-tv-muted">Também disputou 2022</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[15px] text-tv-muted">
                    <FrontPill legend={c.front} size="sm" />
                    <span className="truncate">{c.party ?? ''} · {frontName(c.front)}</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-tv-border/60 overflow-hidden">
                    <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${(c.pct / maxPct) * 100}%`, background: col }} />
                  </div>
                </div>
                <div className="text-right w-[190px]">
                  <div className={`${i === 0 ? 'text-[54px]' : 'text-[38px]'} font-black leading-none tabular-nums`}><AnimatedNumber value={c.pct} format={n => fmtPct(n)} /></div>
                  <div className="text-[16px] text-tv-muted tabular-nums mt-1"><AnimatedNumber value={c.votes} /> votos</div>
                  {hasData && (d.prev.shares[c.front] ?? 0) > 0 && <div className="text-[15px]"><span className="text-tv-muted">vs 2022 </span><Delta value={c.pct - (d.prev.shares[c.front] ?? 0)} /></div>}
                </div>
              </div>
            );
          })}
        </Panel>

        <div className="grid grid-rows-[auto_1fr] gap-6 min-h-0 min-w-0">
          <IncumbentPanel d={d} />
          <Panel kicker="2018 · 2022 · 2026" title="Histórico do distrito" bodyClassName="flex flex-col gap-3">
            <div className="grid grid-cols-[64px_1fr_70px_70px_76px_70px] text-[12px] uppercase tracking-wider text-tv-muted font-bold pb-1.5 border-b border-tv-border">
              <span>Frente</span><span>Candidato 2022</span><span className="text-right">2022</span><span className="text-right">2026</span><span className="text-right">Var.</span><span className="text-right" title="Voto proporcional estimado no distrito">Prop.</span>
            </div>
            {fronts.map(f => {
              const c22 = d.prev.candidates.find(c => c.front === f);
              const p22 = d.prev.shares[f] ?? 0;
              const p26 = hasData ? d.shares[f] ?? 0 : null;
              const won22 = d.prev.front === f;
              return (
                <div key={f} className="grid grid-cols-[64px_1fr_70px_70px_76px_70px] items-center text-[17px] -mt-1.5 tabular-nums">
                  <span><FrontPill legend={f} size="sm" /></span>
                  <span className={`truncate ${won22 ? 'font-black' : 'text-tv-muted'}`}>{c22?.name ?? '—'}{won22 && ' ✓'}</span>
                  <span className="text-right">{p22 > 0 ? fmtPct(p22) : '—'}</span>
                  <span className="text-right font-black">{p26 !== null ? fmtPct(p26) : '—'}</span>
                  <span className="text-right">{p26 !== null && p22 > 0 ? <Delta value={p26 - p22} unit="" className="text-[15px]" /> : ''}</span>
                  <span className="text-right text-tv-muted">{hasData && d.prShares[f] ? fmtPct(d.prShares[f]) : '—'}</span>
                </div>
              );
            })}
            <div className="grid grid-cols-3 gap-2.5 mt-auto">
              <Fact label="Vencedor em 2018" value={d.y2018 ? <span className="flex items-center gap-2"><FrontPill legend={d.y2018.front} size="sm" />{fmtPct(d.y2018.pct)}</span> : '—'} />
              <Fact label="Margem 2022 → 2026" value={<span>{fmtPct(d.prev.marginPct)} → {hasData ? fmtPct(d.marginPct) : '—'}</span>} />
              <Fact label="Comparecimento" value={<span>{fmtPct(d.prev.turnout)} → {fmtPct(d.turnout)}</span>} sub={`2022: ${fmtInt(d.prev.total)} votos válidos`} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-[18px] bg-tv-surface2/50 border border-tv-border/50 px-3.5 py-2.5 min-w-0">
      <div className="text-[11px] uppercase tracking-[0.12em] text-tv-muted font-bold truncate">{label}</div>
      <div className="text-[18px] font-black mt-1 tabular-nums truncate tracking-tight">{value}</div>
      {sub && <div className="text-[13px] text-tv-muted mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

/** Quem ocupa a cadeira hoje (eleito em 2022) e como ele/a frente está em 2026. */
function IncumbentPanel({ d }: { d: DistrictSnapshot }) {
  const front = d.prev.front;
  const now = d.candidates.find(c => c.incumbent) ?? null;
  const defender = d.candidates.find(c => c.incumbentParty) ?? null;
  const pos = (c: CandidateResult | null) => (c ? d.candidates.indexOf(c) + 1 : 0);
  const hasData = d.counted > 0;
  const prevGender = d.prev.candidates.find(c => c.name === d.prev.name)?.gender ?? null;
  return (
    <Panel kicker={g('Deputado atual', 'Deputada atual', prevGender)} title={d.prev.name ?? frontName(front)}>
      <div className="flex items-center gap-5">
        <Avatar name={d.prev.name ?? front ?? '?'} legend={front} photo={now?.photo ?? d.prev.candidates.find(c => c.name === d.prev.name)?.photo ?? null} size={76} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[16px] text-tv-muted">
            <FrontPill legend={front} size="sm" />
            <span className="truncate">{d.prev.party ?? ''} · {g('eleito', 'eleita', prevGender)} em 2022 com <b className="text-tv-text">{fmtPct(d.prev.pct)}</b></span>
          </div>
          <div className="mt-2.5 text-[18px] font-bold">
            {d.prev.deputyRunning ? (
              <span>Concorre à reeleição{hasData && now ? <span className="text-tv-muted font-semibold"> · {pos(now)}º lugar com {fmtPct(now.pct)}</span> : null}</span>
            ) : (
              <span>Não concorre em 2026{defender ? <span className="text-tv-muted font-semibold"> · {front} defende a cadeira com <b className="text-tv-text">{defender.name}</b>{hasData ? ` (${pos(defender)}º, ${fmtPct(defender.pct)})` : ''}</span> : null}</span>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
