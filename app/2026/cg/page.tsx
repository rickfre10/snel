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
import { DEFAULT_CG, DEFAULT_CG_TEXT, CgText } from '@/lib/haagar2026/control';
import type { DistrictSnapshot, ElectionSnapshot, FrontTotals } from '@/lib/haagar2026/model';
import { FRONT_ORDER, MAJORITY, STATE_ORDER, TOTAL_SEATS, frontColor, textOn } from '@/lib/haagar/rules';
import { Backdrop, Stage, caseOf } from '@/components/tv/TvChrome';
import TelaoScene from '@/components/tv/TelaoScene';
import IdleScreen from '@/components/tv/IdleScreen';
import { AnimatedNumber, BrandLogo, N8Seal, TargetMark, fmtPct, g } from '@/components/tv/ui';

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
  const { state, snapshot: snap } = useElection2026();
  const brand = BRANDS[state.brand] ?? BRANDS.smartv;
  const cg = { ...DEFAULT_CG, ...state.cg };
  const text = { ...DEFAULT_CG_TEXT, ...cg.text };
  const manualTextOn = text.show && !!text.headline.trim();
  // Plantão de última hora (o texto manual tem prioridade)
  const breaking = useBreaking(snap, state.seed);
  const breakingOn = !!cg.breaking && !!breaking && !manualTextOn;
  // Mantém o último plantão montado durante a animação de saída
  const [lastBreaking, setLastBreaking] = useState<Breaking | null>(null);
  useEffect(() => { if (breaking) setLastBreaking(breaking); }, [breaking]);
  const [fundo, setFundo] = useState('transparente');

  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get('fundo');
    if (f && BACKGROUNDS[f]) setFundo(f);
    // Garante fundo transparente no documento (para OBS/vMix/navegador de CG)
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }, []);

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
          <Slide show={cg.seats && !manualTextOn && !breakingOn} from="bottom">
            <SeatsTarja snap={snap} brand={brand} count={cg.count} raised={cg.ticker} />
          </Slide>
          <Slide show={manualTextOn} from="bottom">
            <TextTarja text={text} brand={brand} raised={cg.ticker} />
          </Slide>
          <Slide show={breakingOn} from="bottom">
            {lastBreaking && (
              <TextTarja key={lastBreaking.id} brand={brand} raised={cg.ticker} front={lastBreaking.front}
                text={{ show: true, label1: 'última', label2: 'hora', headline: lastBreaking.headline, sub: lastBreaking.sub }} />
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

function AlternatingBlock({ brand, subject }: { brand: typeof BRANDS.smartv; subject: string }) {
  const [showLogo, setShowLogo] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setShowLogo(v => !v), ALTERNATE_MS);
    return () => clearInterval(id);
  }, []);
  const layer = 'absolute inset-0 flex flex-col justify-center pl-8 transition-all duration-700 ease-out';
  return (
    <div className="relative w-[310px] shrink-0 text-white overflow-hidden"
      style={{ background: 'linear-gradient(115deg, rgb(var(--tv-accent2)) 0%, rgb(var(--tv-accent)) 55%, rgb(var(--tv-tarja) / 0) 100%)' }}>
      <div className={layer} style={{ opacity: showLogo ? 0 : 1, transform: showLogo ? 'translateY(-24px)' : 'none' }}>
        <span className="text-[24px] font-semibold leading-none opacity-85">{caseOf(brand, 'Parlamento')}</span>
        <span className="text-[50px] font-extrabold leading-[1.05] mt-1">{caseOf(brand, subject)}</span>
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
      style={{ bottom: raised ? 138 : 68, background: 'rgb(var(--tv-tarja) / 0.94)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
      {/* Bloco de abertura em gradiente: alterna logo "eleições" e o assunto */}
      <AlternatingBlock brand={brand} subject={count === 'projecao' ? 'Projeção' : 'Resultados'} />

      <div className="flex-1 flex items-center gap-3 py-4 pr-4">
        {fronts.map(f => {
          const c = frontColor(f.legend);
          const fg = textOn(c);
          const extra = count === 'projecao' ? f.confirmed : f.districtLeading + f.prProjected;
          return (
            <div key={f.legend} className="flex-1 h-full rounded-[18px] flex flex-col items-center justify-center min-w-0" style={{ background: c, color: fg }}>
              <div className="text-[26px] font-extrabold leading-none tracking-wide">{f.legend}</div>
              <div className="text-[64px] font-black leading-none tabular-nums mt-1"><AnimatedNumber value={value(f)} /></div>
              <div className="text-[16px] font-bold leading-none mt-1.5 opacity-80 tabular-nums">
                {count === 'projecao' ? `${extra} eleitos` : extra > 0 ? `+${extra} na frente` : ' '}
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-[250px] shrink-0 flex flex-col justify-center px-6 text-white border-l border-white/15">
        <div className="text-[18px] font-bold uppercase tracking-wider opacity-80">{caseOf(brand, 'Maioria')}</div>
        <div className="text-[52px] font-black leading-none tabular-nums">{MAJORITY}<span className="text-[24px] opacity-70"> / {TOTAL_SEATS}</span></div>
        <div className="mt-2 h-2.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${snap.reported}%`, background: 'rgb(var(--tv-accent2))' }} />
        </div>
        <div className="text-[16px] font-semibold mt-1.5 opacity-85">
          {majorityReached ? `${leader.legend} ${count === 'projecao' ? 'projeta maioria' : 'tem maioria'}` : `${fmtPct(snap.reported)} apurado`}
        </div>
      </div>
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
      <div className="w-[216px] shrink-0 rounded-[14px] bg-tv-accent text-white flex items-center justify-center text-[28px] font-extrabold tabular-nums">{clock}</div>
      <div className="flex-1 rounded-[14px] overflow-hidden flex items-center" style={{ background: 'rgb(var(--tv-tarja) / 0.94)' }}>
        <N8Seal size={28} />
        {d ? <DistrictLine key={d.id} d={d} brand={brand} /> : (
          <div className="px-6 text-[26px] font-bold text-white">{caseOf(brand, 'Aguardando as primeiras urnas')}</div>
        )}
      </div>
    </div>
  );
}

function DistrictLine({ d, brand }: { d: DistrictSnapshot; brand: typeof BRANDS.smartv }) {
  const lead = d.leader!;
  return (
    <div className="flex-1 min-w-0 flex items-center gap-5 px-5 text-white tv-scene-in">
      <span className="shrink-0 text-[19px] font-black opacity-80">{d.uf}</span>
      <span className="text-[24px] font-extrabold uppercase truncate max-w-[380px]">{d.name}</span>
      <span className="shrink-0 rounded-[8px] px-2.5 py-0.5 text-[17px] font-extrabold uppercase" style={{ background: d.status.backgroundColor, color: d.status.textColor }}>
        {d.status.label}
      </span>
      <span className="flex-1 min-w-0 flex items-baseline justify-center gap-2 truncate">
        <span className="shrink-0 self-center rounded-[6px] px-1.5 font-extrabold text-[15px]" style={{ background: frontColor(lead.front), color: textOn(frontColor(lead.front)) }}>{lead.front}</span>
        <span className="text-[22px] font-extrabold uppercase truncate">{lead.name}</span>
        {(lead.incumbent || lead.incumbentParty) && (
          <span className="shrink-0 self-center rounded-[6px] border border-white/60 px-1.5 text-[13px] font-extrabold uppercase leading-[1.4]">
            {lead.incumbent ? caseOf(brand, g('Deputado atual', 'Deputada atual', lead.gender)) : caseOf(brand, 'Incumbente')}
          </span>
        )}
        <span className="text-[20px] font-bold opacity-90 tabular-nums">{fmtPct(lead.pct)}</span>
      </span>
      {d.runnerUp && (
        <span className="shrink-0 flex items-baseline gap-2 text-[19px] opacity-90">
          <span className="font-semibold">2º</span>
          <span className="rounded-[6px] px-1.5 font-extrabold text-[15px]" style={{ background: frontColor(d.runnerUp.front), color: textOn(frontColor(d.runnerUp.front)) }}>{d.runnerUp.front}</span>
          <span className="font-bold uppercase truncate max-w-[200px]">{d.runnerUp.name}</span>
          <span className="tabular-nums">{fmtPct(d.runnerUp.pct)}</span>
        </span>
      )}
      <span className="shrink-0 text-[15px] font-semibold opacity-70 tabular-nums">{caseOf(brand, `${fmtPct(d.reported)} apur.`)}</span>
    </div>
  );
}

// ------------------------------------------------ Tarja de texto livre ----
/** Manchete escrita pelo operador (formato "edição das 19h" da News). */
function TextTarja({ text, brand, raised, front }: { text: CgText; brand: typeof BRANDS.smartv; raised: boolean; front?: string | null }) {
  const long = text.headline.length > 42;
  return (
    <div className="absolute left-[104px] right-[104px] min-h-[176px] flex rounded-[26px] overflow-hidden transition-[bottom] duration-500"
      style={{ bottom: raised ? 138 : 68, background: 'rgb(var(--tv-tarja) / 0.94)', boxShadow: '0 12px 40px rgba(0,0,0,0.35)' }}>
      <div className="w-[310px] shrink-0 flex flex-col justify-center pl-8 text-white leading-[1.05]"
        style={{ background: 'linear-gradient(115deg, rgb(var(--tv-accent2)) 0%, rgb(var(--tv-accent)) 55%, rgb(var(--tv-tarja) / 0) 100%)' }}>
        <span className="text-[44px] font-normal">{caseOf(brand, text.label1)}</span>
        {text.label2 && <span className="text-[44px] font-normal">{caseOf(brand, text.label2)}</span>}
      </div>
      {front && <div className="w-3 shrink-0" style={{ background: frontColor(front) }} />}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-10 py-5 text-white">
        <div className={`${long ? 'text-[50px]' : 'text-[60px]'} font-extrabold uppercase leading-[1.05] line-clamp-2`}>{text.headline}</div>
        {text.sub && <div className={`${text.sub.length > 55 ? 'text-[24px]' : 'text-[32px]'} font-semibold uppercase mt-2 text-white/90 truncate`}>{text.sub}</div>}
      </div>
      {front && (
        <div className="shrink-0 flex items-center pr-8">
          <span className="rounded-full px-6 py-2 text-[36px] font-black" style={{ background: frontColor(front), color: textOn(frontColor(front)) }}>{front}</span>
        </div>
      )}
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
