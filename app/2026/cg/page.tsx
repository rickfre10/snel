// app/2026/cg/page.tsx
"use client";
// CG para sobrepor ao vídeo (fundo transparente por padrão): caixas de
// cadeiras por frente + faixa de distritos, no formato das tarjas da
// SmartvNews (e na versão Smartv). O operador liga/desliga cada parte pelo
// controle da apuração.
//
// Parâmetros de URL:
//   ?fundo=transparente (padrão) | verde | azul | preto | cena | telao
import React, { useEffect, useMemo, useState } from 'react';
import { BRANDS } from '@/lib/brand';
import { useElection2026 } from '@/lib/haagar2026/useElection2026';
import { Breaking, useBreaking } from '@/lib/haagar2026/useBreaking';
import { buildTicker } from '@/lib/haagar2026/ticker';
import { DEFAULT_CG, DEFAULT_CG_TEXT, CgText } from '@/lib/haagar2026/control';
import type { CandidateResult, DistrictSnapshot, ElectionSnapshot, FrontTotals } from '@/lib/haagar2026/model';
import { FRONT_ORDER, MAJORITY, STATE_ORDER, TOTAL_SEATS, frontColor, frontName, textOn } from '@/lib/haagar/rules';
import { Backdrop, Stage, caseOf } from '@/components/tv/TvChrome';
import TelaoScene from '@/components/tv/TelaoScene';
import PillGrid from '@/components/tv/PillGrid';
import IdleScreen from '@/components/tv/IdleScreen';
import { AnimatedNumber, Avatar, BrandLogo, N8Seal, TargetMark, fmtInt, fmtPct, g } from '@/components/tv/ui';

const TICKER_MS = 6000;
const BACKGROUNDS: Record<string, string> = {
  transparente: 'transparent',
  verde: '#00b140',
  azul: '#0047bb',
  preto: '#000000',
  // Simula uma imagem de estúdio para conferir o CG sem vídeo
  cena: 'linear-gradient(160deg, #6d7f95 0%, #3a4656 45%, #1d232c 100%)',
  // Replica o que o telão está mostrando (cena publicada pelo /2026)
  telao: 'telao',
};

export default function Cg2026() {
  const { state, snapshot: snap, ready } = useElection2026();
  const brand = BRANDS[state.brand] ?? BRANDS.smartv;
  const cg = { ...DEFAULT_CG, ...state.cg };
  const text = { ...DEFAULT_CG_TEXT, ...cg.text };
  const autoResults = cg.autoResults !== false;

  // ---- Urgência (sobrepõe QUALQUER outra tarja): resultados de distrito
  // definidos (15 s cada, em fila) e plantão de última hora (viradas, maioria).
  // O CG detecta sozinho — não depende do telão estar aberto.
  const urgent = useBreaking(snap, state.seed, {
    results: autoResults, ready, skipRev: cg.queueSkip ?? 0, clearRev: cg.queueClear ?? 0,
  });
  const urgentOn = !!urgent && (urgent.kind === 'result' ? autoResults : !!cg.breaking);
  // Mantém o último item montado durante a animação de saída
  const [lastUrgent, setLastUrgent] = useState<Breaking | null>(null);
  useEffect(() => { if (urgent) setLastUrgent(urgent); }, [urgent]);

  // ---- Tarjas do operador (abaixo da urgência)
  const manualTextOn = text.show && !!text.headline.trim();
  // Tarja de maioria manual: frente com maioria confirmada (ou projetada)
  const majority = snap ? majorityOf(snap) : null;
  const majorityOn = !!cg.majority && !!majority;
  const [lastMajority, setLastMajority] = useState<{ front: string; projected: boolean } | null>(null);
  useEffect(() => { if (majority) setLastMajority(majority); }, [majority?.front, majority?.projected]); // eslint-disable-line react-hooks/exhaustive-deps
  const districtOn = !majorityOn && !!cg.district?.show && !!snap?.districtById[cg.district.id];
  const [lastDistrictId, setLastDistrictId] = useState<number | null>(null);
  useEffect(() => { if (cg.district?.id) setLastDistrictId(cg.district.id); }, [cg.district?.id]);

  const [fundo, setFundo] = useState('transparente');
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get('fundo');
    if (f && BACKGROUNDS[f]) setFundo(f);
    // Garante fundo transparente no documento (para OBS/vMix/navegador de CG)
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }, []);

  const urgentDistrict = lastUrgent?.kind === 'result' && lastUrgent.districtId ? snap?.districtById[lastUrgent.districtId] : null;
  const manualDistrict = lastDistrictId ? snap?.districtById[lastDistrictId] : null;

  return (
    <Stage brand={brand} background={fundo === 'telao' ? undefined : BACKGROUNDS[fundo]}>
      {fundo === 'telao' && (
        <TvFrame>
          {state.view?.scene === 'idle' ? <IdleScreen brand={brand} /> : (
            <>
              <Backdrop brand={brand} />
              <TelaoScene brand={brand} snap={snap} scene={state.view?.scene ?? 'geral'} uf={state.view?.uf ?? 'MA'} districtId={state.view?.districtId ?? 201} />
            </>
          )}
        </TvFrame>
      )}
      {/* Selo de local + AO VIVO no canto superior esquerdo (News); texto editável no controle */}
      {brand.cgPlaceBadge && (
        <Slide show={cg.bug} from="top">
          <div className="absolute left-[104px] top-[84px] flex flex-col items-start gap-1.5" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}>
            <span className="rounded-[10px] bg-tv-accent2 text-white px-3 py-1 text-[30px] font-extrabold leading-tight uppercase">{cg.place?.trim() || 'Haagar · Eleições 2026'}</span>
            <span className="rounded-[8px] bg-tv-tarja text-white px-2.5 py-0.5 text-[19px] font-bold leading-tight uppercase">Ao vivo</span>
          </div>
        </Slide>
      )}

      {/* Logo da emissora no canto superior direito */}
      <Slide show={cg.bug} from="top">
        <div className="absolute right-[104px] top-[72px]" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}>
          {brand.logo.kind === 'target' ? (
            <div className="flex flex-col items-center gap-2 text-white">
              <TargetMark size={72} />
              <span className="text-[20px] font-extrabold tracking-wide leading-none">{caseOf(brand, 'Ao vivo')}</span>
            </div>
          ) : (
            <div className="opacity-90"><BrandLogo brand={brand} size={52} color="#ffffff" /></div>
          )}
        </div>
      </Slide>

      {snap && (
        <>
          <Slide show={cg.seats && !manualTextOn && !districtOn && !majorityOn && !urgentOn} from="bottom">
            <SeatsTarja snap={snap} brand={brand} count={cg.count} raised={cg.ticker} />
          </Slide>
          <Slide show={manualTextOn && !districtOn && !majorityOn && !urgentOn} from="bottom">
            <TextTarja text={text} brand={brand} raised={cg.ticker} />
          </Slide>
          <Slide show={districtOn && !urgentOn} from="bottom">
            {manualDistrict && <DistrictTarja d={manualDistrict} brand={brand} raised={cg.ticker} />}
          </Slide>
          <Slide show={majorityOn && !urgentOn} from="bottom">
            {lastMajority && <MajorityTarja snap={snap} front={lastMajority.front} projected={lastMajority.projected} brand={brand} raised={cg.ticker} />}
          </Slide>
          {/* Urgência: sempre por cima de tudo */}
          <Slide show={urgentOn && lastUrgent?.kind === 'result'} from="bottom">
            {urgentDistrict && <DistrictTarja key={lastUrgent!.id} d={urgentDistrict} brand={brand} raised={cg.ticker} urgent />}
          </Slide>
          <Slide show={urgentOn && lastUrgent?.kind === 'majority'} from="bottom">
            {lastUrgent?.kind === 'majority' && lastUrgent.front && (
              <MajorityTarja key={lastUrgent.id} snap={snap} front={lastUrgent.front} projected={false} brand={brand} raised={cg.ticker} urgent />
            )}
          </Slide>
          <Slide show={urgentOn && lastUrgent?.kind === 'flip'} from="bottom">
            {lastUrgent && lastUrgent.kind === 'flip' && (
              <TextTarja key={lastUrgent.id} brand={brand} raised={cg.ticker} front={lastUrgent.front}
                text={{ show: true, label1: 'última', label2: 'hora', headline: lastUrgent.headline, sub: lastUrgent.sub }} />
            )}
          </Slide>
          <Slide show={cg.ticker} from="bottom">
            <TickerBar snap={snap} brand={brand} />
          </Slide>
        </>
      )}
    </Stage>
  );
}

function Slide({ show, from, children }: { show: boolean; from: 'top' | 'bottom'; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 pointer-events-none transition-all duration-500 ease-out"
      style={{ opacity: show ? 1 : 0, transform: show ? 'none' : `translateY(${from === 'top' ? -40 : 40}px)` }}>
      {children}
    </div>
  );
}

// -------------------------------------------------- Tarja de cadeiras -----
const ALTERNATE_MS = 5000;

// Fundo das tarjas: sólido na Smartv, levemente translúcido na News.
const tarjaBg = (brand: typeof BRANDS.smartv) => (brand.cgPaper ? 'rgb(var(--tv-paper))' : brand.cgSolid ? 'rgb(var(--tv-tarja))' : 'rgb(var(--tv-tarja) / 0.94)');
// Cor do texto sobre a tarja (escuro no estilo creme da Smartv)
const tarjaInk = (brand: typeof BRANDS.smartv) => (brand.cgPaper ? 'rgb(var(--tv-ink))' : '#ffffff');
// Faixa de distritos: marrom sólido no estilo creme
const tickerBg = (brand: typeof BRANDS.smartv) => (brand.cgPaper ? 'rgb(var(--tv-ink))' : tarjaBg(brand));
// Bloco em gradiente da esquerda: na Smartv termina sólido (sem vazar para a tarja).
const blockBg = (brand: typeof BRANDS.smartv) => (brand.cgPaper ? 'rgb(var(--tv-paper))' : brand.cgBlockFade
  // News: azul-céu → azul royal, fundindo na tarja (como "edição das 19h")
  // Duas camadas: o desvanecimento horizontal (com curva suave) chega exatamente
  // no cinza da tarja em toda a borda direita; por baixo, a cor em diagonal.
  ? 'linear-gradient(90deg, rgb(var(--tv-tarja) / 0) 0%, rgb(var(--tv-tarja) / 0) 38%, rgb(var(--tv-tarja) / 0.06) 46%, rgb(var(--tv-tarja) / 0.18) 55%, rgb(var(--tv-tarja) / 0.36) 64%, rgb(var(--tv-tarja) / 0.57) 73%, rgb(var(--tv-tarja) / 0.77) 82%, rgb(var(--tv-tarja) / 0.92) 91%, rgb(var(--tv-tarja)) 100%), linear-gradient(110deg, rgb(var(--tv-accent2)) 0%, rgb(var(--tv-accent)) 45%, rgb(var(--tv-accent)) 100%)'
  : 'linear-gradient(115deg, rgb(var(--tv-accent2)) 0%, rgb(var(--tv-accent)) 70%)');
/** Tamanho de fonte para o texto caber na largura (fonte pesada ≈ 0,68 em por letra). */
const fitSize = (text: string, width: number, max: number) => Math.min(max, Math.floor(width / (Math.max(1, text.length) * 0.68)));

function AlternatingBlock({ brand, subject }: { brand: typeof BRANDS.smartv; subject: string }) {
  const [showLogo, setShowLogo] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setShowLogo(v => !v), ALTERNATE_MS);
    return () => clearInterval(id);
  }, []);
  const layer = 'absolute inset-0 flex flex-col justify-center pl-8 transition-all duration-700 ease-out';
  return (
    <div className="relative w-[310px] shrink-0 overflow-hidden"
      style={{ background: blockBg(brand), color: brand.cgPaper ? 'rgb(var(--tv-accent))' : '#ffffff' }}>
      <div className={layer} style={{ opacity: showLogo ? 0 : 1, transform: showLogo ? 'translateY(-24px)' : 'none' }}>
        <span className={`text-[24px] leading-none ${brand.cgPaper ? 'text-tv-ink font-bold' : 'opacity-85'} ${brand.cgBlockFade ? 'font-normal' : 'font-semibold'}`}>{caseOf(brand, 'Parlamento')}</span>
        <span className={`leading-[1.05] mt-1 whitespace-nowrap ${brand.cgBlockFade ? 'font-medium' : 'font-extrabold'}`} style={{ fontSize: fitSize(caseOf(brand, subject), 262, brand.cgBlockFade ? 46 : 50) }}>{caseOf(brand, subject)}</span>
      </div>
      <div className={layer} style={{ opacity: showLogo ? 1 : 0, transform: showLogo ? 'none' : 'translateY(24px)' }}>
        {brand.logo.kind === 'target' ? (
          <span className="inline-flex items-center gap-2.5 text-[36px] font-black leading-none">
            <TargetMark size={40} />{caseOf(brand, 'Eleições')}
          </span>
        ) : (
          <span className="text-[56px] font-light leading-none tracking-tight">{caseOf(brand, 'Eleições')}</span>
        )}
      </div>
    </div>
  );
}

function SeatsTarja({ snap, brand, count, raised }: { snap: ElectionSnapshot; brand: typeof BRANDS.smartv; count: 'confirmadas' | 'projecao'; raised: boolean }) {
  const value = (f: FrontTotals) => (count === 'projecao' ? f.projected : f.confirmed);
  // Ordem por cadeiras (maior primeiro); empate segue a ordem fixa das frentes.
  const fronts = FRONT_ORDER.map(f => snap.frontByLegend[f]).filter(Boolean)
    .sort((a, b) => value(b) - value(a) || FRONT_ORDER.indexOf(a.legend) - FRONT_ORDER.indexOf(b.legend));
  const leader = fronts[0];
  const majorityReached = leader && value(leader) >= MAJORITY;

  return (
    <div className="absolute left-[104px] right-[104px] h-[176px] flex rounded-[26px] overflow-hidden transition-[bottom] duration-500"
      style={{ bottom: raised ? 138 : 68, background: tarjaBg(brand), boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
      {/* Bloco de abertura em gradiente: alterna logo "eleições" e o assunto */}
      <AlternatingBlock brand={brand} subject={count === 'projecao' ? 'Projeção' : 'Resultados'} />

      <div className={`flex-1 flex items-center gap-3 py-4 pr-4 ${brand.cgBlockFade ? 'pl-2' : ''}`}>
        {fronts.map(f => {
          const c = frontColor(f.legend);
          const fg = textOn(c);
          const extra = count === 'projecao' ? f.confirmed : f.districtLeading + f.prProjected;
          return (
            <div key={f.legend} className="flex-1 h-full rounded-[18px] flex flex-col items-center justify-center min-w-0" style={{ background: c, color: fg }}>
              <div className="text-[26px] font-extrabold leading-none tracking-wide">{f.legend}</div>
              <div className="text-[64px] font-black leading-none tabular-nums mt-1"><AnimatedNumber value={value(f)} /></div>
              <div className="text-[16px] font-bold leading-none mt-1.5 opacity-80 tabular-nums">
                {count === 'projecao' ? `${extra} ${extra === 1 ? 'eleito' : 'eleitos'}` : extra > 0 ? `+${extra} na frente` : ' '}
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-[250px] shrink-0 flex flex-col justify-center px-6" style={{ color: tarjaInk(brand), borderLeft: `1px solid ${brand.cgPaper ? 'rgb(var(--tv-ink) / 0.15)' : 'rgba(255,255,255,0.15)'}` }}>
        <div className="text-[18px] font-bold uppercase tracking-wider opacity-80">{caseOf(brand, 'Maioria')}</div>
        <div className="text-[52px] font-black leading-none tabular-nums">{MAJORITY}<span className="text-[24px] opacity-70"> / {TOTAL_SEATS}</span></div>
        <div className="mt-2 h-2.5 rounded-full overflow-hidden" style={{ background: brand.cgPaper ? 'rgb(var(--tv-ink) / 0.15)' : 'rgba(255,255,255,0.2)' }}>
          <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${snap.reported}%`, background: brand.cgPaper ? 'rgb(var(--tv-accent))' : 'rgb(var(--tv-accent2))' }} />
        </div>
        <div className="text-[16px] font-semibold mt-1.5 opacity-85">
          {majorityReached ? `${leader.legend} ${count === 'projecao' ? 'projeta maioria' : 'tem maioria'}` : `${fmtPct(snap.reported)} apurado`}
        </div>
      </div>
      {brand.cgPaper && <PillStrip />}
    </div>
  );
}

// ------------------------------------------------ Faixa de distritos ------
function TickerBar({ snap, brand }: { snap: ElectionSnapshot; brand: typeof BRANDS.smartv }) {
  const list = useMemo(
    () => STATE_ORDER.flatMap(uf => snap.states[uf].districtIds).map(id => snap.districtById[id]).filter(d => d.counted > 0),
    [snap],
  );
  const [i, setI] = useState(0);
  const [clock, setClock] = useState('');
  useEffect(() => {
    const id = setInterval(() => setI(n => n + 1), TICKER_MS);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const tick = () => { const d = new Date(); setClock(`${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`); };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);
  const d = list.length ? list[i % list.length] : null;

  return (
    <div className="absolute left-[104px] right-[104px] bottom-[68px] h-[56px] flex gap-3">
      <div className="w-[216px] shrink-0 rounded-[14px] bg-tv-accent text-white flex items-center justify-center text-[28px] font-bold tabular-nums">{clock}</div>
      <div className="flex-1 rounded-[14px] overflow-hidden flex items-center" style={{ background: tickerBg(brand) }}>
        <N8Seal size={28} />
        {d ? <DistrictLine key={d.id} d={d} brand={brand} /> : <TickerMarquee items={buildTicker(snap)} brand={brand} />}
      </div>
    </div>
  );
}

/** Antes dos resultados: as mesmas frases da faixa do telão, rolando. */
function TickerMarquee({ items, brand }: { items: string[]; brand: typeof BRANDS.smartv }) {
  const list = items.length ? items : ['Aguardando as primeiras urnas'];
  const duration = Math.max(30, list.join(' ').length / 7);
  return (
    <div className="relative flex-1 overflow-hidden h-full text-white">
      <div className="tv-marquee absolute inset-y-0 left-0 flex items-center whitespace-nowrap" style={{ ['--tv-marquee-duration' as string]: `${duration}s` }}>
        {[0, 1].map(k => (
          <span key={k} className="flex items-center">
            {list.map((t, i) => (
              <span key={`${k}-${i}`} className="px-10 text-[24px] font-semibold tracking-wide uppercase">{t}</span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

function DistrictLine({ d, brand }: { d: DistrictSnapshot; brand: typeof BRANDS.smartv }) {
  const lead = d.leader!;
  return (
    <div className="flex-1 min-w-0 flex items-center gap-5 px-5 text-white tv-scene-in">
      <span className="shrink-0 text-[19px] font-bold opacity-80">{d.uf}</span>
      <span className="text-[24px] font-semibold uppercase truncate max-w-[380px]">{d.name}</span>
      <span className="shrink-0 rounded-[8px] px-2.5 py-0.5 text-[17px] font-bold uppercase" style={{ background: d.status.backgroundColor, color: d.status.textColor }}>
        {d.status.label}
      </span>
      <span className="flex-1 min-w-0 flex items-baseline justify-center gap-2 truncate">
        <span className="shrink-0 self-center rounded-[6px] px-1.5 font-extrabold text-[15px]" style={{ background: frontColor(lead.front), color: textOn(frontColor(lead.front)) }}>{lead.front}</span>
        <span className="text-[22px] font-semibold uppercase truncate">{lead.name}</span>
        {(lead.incumbent || lead.incumbentParty) && (
          <span className="shrink-0 self-center rounded-[6px] border border-white/60 px-1.5 text-[13px] font-semibold uppercase leading-[1.4]">
            {lead.incumbent ? g('Deputado atual', 'Deputada atual', lead.gender) : 'Incumbente'}
          </span>
        )}
        <span className="text-[20px] font-medium opacity-90 tabular-nums">{fmtPct(lead.pct)}</span>
      </span>
      {d.runnerUp && (
        <span className="shrink-0 flex items-baseline gap-2 text-[19px] opacity-90">
          <span className="font-medium">2º</span>
          <span className="rounded-[6px] px-1.5 font-extrabold text-[15px]" style={{ background: frontColor(d.runnerUp.front), color: textOn(frontColor(d.runnerUp.front)) }}>{d.runnerUp.front}</span>
          <span className="font-semibold uppercase truncate max-w-[200px]">{d.runnerUp.name}</span>
          <span className="tabular-nums">{fmtPct(d.runnerUp.pct)}</span>
        </span>
      )}
      <span className="shrink-0 text-[15px] font-medium opacity-70 tabular-nums uppercase">{`${fmtPct(d.reported)} apur.`}</span>
    </div>
  );
}

// ------------------------------------------------ Tarja de distrito -------
/** Situação do distrito em uma frase curta (lidera / muito próximo / mantém / toma de X). */
function districtSituation(d: DistrictSnapshot): { label: string; front: string | null } {
  const lead = d.leader;
  if (!lead || d.counted <= 0) return { label: 'Aguardando apuração', front: null };
  const prev = d.prev.front;
  if (d.isFinal) {
    if (prev && prev !== lead.front) return { label: `${lead.front} toma do ${prev}`, front: lead.front };
    if (prev === lead.front) return { label: `${lead.front} mantém`, front: lead.front };
    return { label: `${lead.front} ${g('eleito', 'eleita', lead.gender)}`, front: lead.front };
  }
  if (d.runnerUp && d.marginPct < 2) return { label: 'Muito próximo', front: null };
  if (prev && prev !== lead.front) return { label: `${lead.front} pode tomar do ${prev}`, front: lead.front };
  return { label: `${lead.front} lidera`, front: lead.front };
}

const DISTRICT_H = 214;

/** Líder × 2º colocado de um distrito, com apuração e situação. */
function DistrictTarja({ d, brand, raised, urgent }: { d: DistrictSnapshot; brand: typeof BRANDS.smartv; raised: boolean; urgent?: boolean }) {
  const ink = tarjaInk(brand);
  const line = brand.cgPaper ? 'rgb(var(--tv-ink) / 0.15)' : 'rgba(255,255,255,0.16)';
  const [a, b] = d.leader ? [d.leader, d.runnerUp] : [d.candidates[0] ?? null, d.candidates[1] ?? null];
  const sit = districtSituation(d);
  const sitBg = sit.front ? frontColor(sit.front) : d.counted > 0 ? '#ffb020' : (brand.cgPaper ? 'rgb(var(--tv-ink))' : 'rgba(255,255,255,0.2)');
  const sitFg = sit.front ? textOn(frontColor(sit.front)) : d.counted > 0 ? '#1a1a1a' : '#ffffff';
  const blockColor = brand.cgPaper ? 'rgb(var(--tv-accent))' : '#ffffff';
  const ufLabel = caseOf(brand, d.ufName);
  // Espaço do nome: largura útil menos situação e apuração
  const nameRoom = 1712 - 310 - 64 - (brand.cgPaper ? 133 : 0) - 260 - 32 - (sit.label.length * 15 + 30);

  return (
    <div className="absolute left-[104px] right-[104px] flex rounded-[26px] overflow-hidden transition-[bottom] duration-500"
      style={{ height: DISTRICT_H, bottom: raised ? 138 : 68, background: tarjaBg(brand), boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
      {/* Bloco: "Resultado"/"Distrito" + estado */}
      <div className="w-[310px] shrink-0 flex flex-col justify-center pl-8 pr-4 leading-[1.05]" style={{ background: blockBg(brand), color: blockColor }}>
        <span className={`text-[24px] leading-none flex items-center gap-2 ${brand.cgPaper ? 'text-tv-ink font-bold' : 'opacity-85 font-normal'}`}>
          {urgent && <span className="w-3 h-3 rounded-full bg-current animate-pulse" style={{ color: brand.cgPaper ? 'rgb(var(--tv-accent))' : '#ffffff' }} />}
          {caseOf(brand, urgent ? 'Resultado' : 'Distrito')}
        </span>
        <span className={`mt-1.5 whitespace-nowrap ${brand.cgBlockFade ? 'font-medium' : 'font-extrabold'}`} style={{ fontSize: fitSize(ufLabel, 262, 46) }}>{ufLabel}</span>
        <span className={`text-[20px] mt-2 font-bold tabular-nums ${brand.cgPaper ? 'text-tv-ink/70' : 'opacity-80'}`}>{d.uf} · {String(d.id)}</span>
      </div>
      {brand.cgPaper && <div className="w-[3px] my-6 shrink-0 rounded-full bg-tv-accent" />}

      <div className="flex-1 min-w-0 flex flex-col px-8 py-4" style={{ color: ink }}>
        {/* Linha 1: distrito, situação e apuração (com a vantagem) */}
        <div className="flex items-center gap-4 min-w-0 h-[56px]">
          <span className="font-extrabold uppercase leading-none whitespace-nowrap" style={{ fontSize: fitSize(d.name, nameRoom, 46) }}>{d.name}</span>
          <span className="shrink-0 rounded-[10px] px-3 py-1 text-[22px] font-extrabold uppercase leading-tight whitespace-nowrap" style={{ background: sitBg, color: sitFg }}>{sit.label}</span>
          <span className="flex-1" />
          <div className="shrink-0 w-[260px]">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-bold uppercase tracking-wider opacity-75">{caseOf(brand, 'Apurado')}</span>
              <span className="text-[28px] font-black tabular-nums leading-none">{fmtPct(d.reported)}</span>
            </div>
            <div className="mt-1.5 h-2.5 rounded-full overflow-hidden" style={{ background: line }}>
              <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${d.reported}%`, background: brand.cgPaper ? 'rgb(var(--tv-accent))' : 'rgb(var(--tv-accent2))' }} />
            </div>
            {a && b && d.counted > 0 && (
              <div className="text-[15px] font-semibold uppercase opacity-80 tabular-nums mt-1 whitespace-nowrap">
                {`vantagem ${fmtPct(d.marginPct).replace('%', ' p.p.')} · ${fmtInt(d.marginVotes)} votos`}
              </div>
            )}
          </div>
        </div>

        {/* Linha 2: 1º e 2º colocados */}
        <div className="flex-1 flex items-center gap-5 mt-3 min-h-0">
          {a && <CandidateBox c={a} first final={d.isFinal} brand={brand} ink={ink} line={line} counted={d.counted > 0} />}
          {b && <CandidateBox c={b} final={false} brand={brand} ink={ink} line={line} counted={d.counted > 0} />}
        </div>
      </div>
      {brand.cgPaper && <PillStrip height={DISTRICT_H} />}
    </div>
  );
}

function CandidateBox({ c, first, final, brand, ink, line, counted }: { c: CandidateResult; first?: boolean; final: boolean; brand: typeof BRANDS.smartv; ink: string; line: string; counted: boolean }) {
  const col = frontColor(c.front);
  const tag = final && first ? g('Eleito', 'Eleita', c.gender)
    : c.incumbent ? g('Deputado atual', 'Deputada atual', c.gender)
    : c.incumbentParty ? 'Partido incumbente' : null;
  return (
    <div className="flex-1 min-w-0 h-full flex items-center gap-4 rounded-[18px] pl-3 pr-5"
      style={{ background: first ? (brand.cgPaper ? 'rgb(var(--tv-ink) / 0.06)' : 'rgba(255,255,255,0.08)') : 'transparent', border: `1px solid ${first ? col : line}` }}>
      <Avatar name={c.name} legend={c.front} photo={c.photo} size={78} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 rounded-[6px] px-2 text-[18px] font-extrabold leading-[1.45]" style={{ background: col, color: textOn(col) }}>{c.front}</span>
          {c.party && <span className="shrink-0 text-[16px] font-semibold opacity-70 uppercase">{c.party}</span>}
          {tag && (
            <span className="shrink-0 rounded-[6px] px-1.5 text-[14px] font-bold uppercase leading-[1.5]"
              style={final && first ? { background: col, color: textOn(col) } : { border: `1px solid ${ink}`, opacity: 0.85 }}>{tag}</span>
          )}
        </div>
        <div className="font-bold uppercase leading-tight truncate mt-1" style={{ fontSize: fitSize(c.name, 360, 28) }}>{c.name}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`${first ? 'text-[50px]' : 'text-[42px]'} font-black leading-none tabular-nums`}>{counted ? fmtPct(c.pct) : '—'}</div>
        <div className="text-[16px] font-semibold opacity-70 tabular-nums mt-1">{counted ? `${fmtInt(c.votes)} votos` : ' '}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------ Tarja de maioria -------
/** Frente com maioria confirmada; senão, a que projeta maioria. */
function majorityOf(snap: ElectionSnapshot): { front: string; projected: boolean } | null {
  const c = snap.fronts.find(f => f.confirmed >= MAJORITY);
  if (c) return { front: c.legend, projected: false };
  const p = snap.fronts.find(f => f.projected >= MAJORITY);
  return p ? { front: p.legend, projected: true } : null;
}

/** Tarja na cor da frente: "X forma a maioria" (ou "projeta maioria"). */
function MajorityTarja({ snap, front, projected, brand, raised, urgent }: { snap: ElectionSnapshot; front: string; projected: boolean; brand: typeof BRANDS.smartv; raised: boolean; urgent?: boolean }) {
  const col = frontColor(front);
  const fg = textOn(col);
  const f = snap.frontByLegend[front];
  const seats = f ? (projected ? f.projected : f.confirmed) : 0;
  const name = frontName(front);
  const headline = `${front} ${projected ? 'projeta maioria' : 'forma a maioria'}`;
  return (
    <div className="absolute left-[104px] right-[104px] h-[176px] flex rounded-[26px] overflow-hidden transition-[bottom] duration-500"
      style={{ bottom: raised ? 138 : 68, background: col, color: fg, boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
      {/* Bloco com o logo da cobertura */}
      <div className="w-[310px] shrink-0 flex flex-col justify-center pl-8 gap-2" style={{ background: 'rgba(0,0,0,0.18)' }}>
        {brand.logo.kind === 'target' ? (
          <span className="inline-flex items-center gap-2.5 text-[36px] font-black leading-none"><TargetMark size={40} />{caseOf(brand, 'Eleições')}</span>
        ) : (
          <BrandLogo brand={brand} size={60} color={fg} />
        )}
        <span className="text-[20px] font-bold uppercase tracking-wider opacity-85 flex items-center gap-2">
          {urgent && <span className="w-3 h-3 rounded-full bg-current animate-pulse" />}
          {projected ? 'Projeção' : 'Parlamento'}
        </span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center px-10">
        <div className="text-[20px] font-bold uppercase tracking-[0.14em] opacity-85">{projected ? 'Maioria projetada no Parlamento' : 'Maioria no Parlamento'}</div>
        <div className="font-black uppercase leading-[1.05] whitespace-nowrap mt-1" style={{ fontSize: fitSize(headline, 900, 72) }}>{headline}</div>
        <div className="text-[26px] font-semibold uppercase mt-1.5 opacity-90 truncate">{name}</div>
      </div>
      <div className="w-[300px] shrink-0 flex flex-col justify-center px-7" style={{ background: 'rgba(0,0,0,0.12)' }}>
        <div className="flex items-baseline gap-2">
          <span className="text-[76px] font-black leading-none tabular-nums"><AnimatedNumber value={seats} /></span>
          <span className="text-[22px] font-bold uppercase opacity-85">cadeiras</span>
        </div>
        {/* barra das cadeiras com a marca da maioria */}
        <div className="relative mt-3 h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }}>
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (seats / TOTAL_SEATS) * 100)}%`, background: fg }} />
          <div className="absolute -top-1.5 -bottom-1.5 w-[3px] rounded" style={{ left: `${(MAJORITY / TOTAL_SEATS) * 100}%`, background: fg, opacity: 0.9 }} />
        </div>
        <div className="text-[16px] font-semibold mt-2 opacity-85 tabular-nums uppercase">{`maioria: ${MAJORITY} de ${TOTAL_SEATS}`}</div>
      </div>
      {brand.cgPaper && <PillStrip />}
    </div>
  );
}

// ------------------------------------------------ Tarja de texto livre ----
/** Manchete escrita pelo operador (formato "edição das 19h" da News). */
function TextTarja({ text, brand, raised, front }: { text: CgText; brand: typeof BRANDS.smartv; raised: boolean; front?: string | null }) {
  const long = text.headline.length > 42;
  return (
    <div className="absolute left-[104px] right-[104px] min-h-[176px] flex rounded-[26px] overflow-hidden transition-[bottom] duration-500"
      style={{ bottom: raised ? 138 : 68, background: tarjaBg(brand), boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
      <div className="w-[310px] shrink-0 flex flex-col justify-center pl-8 leading-[1.05]"
        style={{ background: blockBg(brand), color: brand.cgPaper ? 'rgb(var(--tv-accent))' : '#ffffff' }}>
        {!text.label1.trim() && !text.label2.trim() ? (
          // Bloco vazio: mostra o logo (Smartv: ◎ ELEIÇÕES · News: news°)
          brand.logo.kind === 'target' ? (
            <span className="inline-flex items-center gap-2.5 text-[36px] font-black leading-none">
              <TargetMark size={40} />{caseOf(brand, 'Eleições')}
            </span>
          ) : (
            <span className="text-white"><BrandLogo brand={brand} size={64} color="#ffffff" /></span>
          )
        ) : (
          <>
            <span className={`text-[44px] ${brand.cgPaper ? 'font-black' : 'font-normal'}`}>{caseOf(brand, text.label1)}</span>
            {text.label2 && <span className={`text-[44px] ${brand.cgPaper ? 'font-black' : 'font-normal'}`}>{caseOf(brand, text.label2)}</span>}
          </>
        )}
      </div>
      {brand.cgPaper && !front && <div className="w-[3px] my-6 shrink-0 rounded-full bg-tv-accent" />}
      {front && <div className="w-3 shrink-0" style={{ background: frontColor(front) }} />}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-10 py-5" style={{ color: tarjaInk(brand) }}>
        <div className={`${long ? 'text-[50px]' : 'text-[60px]'} font-extrabold uppercase leading-[1.05] line-clamp-2`}>{text.headline}</div>
        {text.sub && <div className={`${text.sub.length > 55 ? 'text-[24px]' : 'text-[32px]'} font-semibold uppercase mt-2 opacity-85 truncate`}>{text.sub}</div>}
      </div>
      {front && (
        <div className="shrink-0 flex items-center pr-8">
          <span className="rounded-full px-6 py-2 text-[36px] font-black" style={{ background: frontColor(front), color: textOn(frontColor(front)) }}>{front}</span>
        </div>
      )}
      {brand.cgPaper && <PillStrip />}
    </div>
  );
}

/** Ponta da tarja com as pílulas vermelhas animadas sobre o marrom (grafismo da vinheta Smartv). */
function PillStrip({ height = 176 }: { height?: number }) {
  return (
    <div className="w-[130px] shrink-0 relative overflow-hidden" style={{ background: 'rgb(var(--tv-ink))' }}>
      <PillGrid width={130} height={height} rows={[0.42, 0.58]} ratio={1.6} secondsPerColumn={2.6} gap={3} originX={-110} pool={10} className="absolute inset-0" />
    </div>
  );
}

// ------------------------------------------------ Telão em moldura de TV --
// O telão (1920×1080) reduzido dentro de uma "TV", acima das tarjas do CG.
const TV_W = 1180;                 // largura da tela dentro da moldura
const TV_H = Math.round(TV_W * 9 / 16);
const TV_TOP = 40;

function TvFrame({ children }: { children: React.ReactNode }) {
  const scale = TV_W / 1920;
  return (
    <div className="absolute pointer-events-none" style={{ left: (1920 - TV_W) / 2 - 22, top: TV_TOP }}>
      {/* moldura */}
      <div className="relative rounded-[30px] p-[22px] pb-[30px]"
        style={{ background: 'linear-gradient(180deg, #2a2a30 0%, #121216 100%)', boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.6)' }}>
        <div className="relative overflow-hidden rounded-[10px] bg-tv-bg" style={{ width: TV_W, height: TV_H, boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.8)' }}>
          <div className="absolute left-0 top-0 font-tv text-tv-text" style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {children}
          </div>
          {/* reflexo sutil da tela */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(125deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 35%)' }} />
        </div>
        {/* LED */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[11px] w-2 h-2 rounded-full bg-tv-live/80" />
      </div>
    </div>
  );
}
