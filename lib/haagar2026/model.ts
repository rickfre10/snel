// lib/haagar2026/model.ts
// Modelo da eleição 2026 de Haagar.
//
// 1) `buildModel` sorteia (de forma determinística pela semente) o resultado
//    FINAL de 2026, partindo da votação de 2022 de cada distrito/estado e
//    aplicando swings nacional, estadual e local.
// 2) `snapshotAt` devolve a fotografia da apuração para um progresso global
//    (0–100%): cada distrito apura num ritmo próprio e os votos iniciais têm
//    um viés que vai desaparecendo — o que cria viradas durante a noite.

import { districtsData, partyData } from '@/lib/staticData';
import type { Baseline2022 } from '@/lib/haagar/baseline';
import { previousDistrictResultsData } from '@/lib/previousElectionData';
import { FRONT_ORDER, STATE_ORDER, PR_SEATS_BY_STATE, allocateStatePR, frontColor } from '@/lib/haagar/rules';
import { calculateDistrictDynamicStatus, DistrictStatusOutput } from '@/lib/statusCalculator';
import { rngFor, gauss, pick, hash } from './random';
import { fictionalName } from './names';

// ---------------------------------------------------------------- Tipos ----

export interface ModelCandidate {
  front: string;
  party: string | null;
  name: string;
  photo: string | null;
  gender: 'F' | 'M' | null;
  incumbent: boolean;      // deputado atual (venceu este distrito em 2022) e concorre de novo
  incumbentParty: boolean; // frente que venceu em 2022, com outro candidato (deputado não concorre)
  rerun: boolean;          // disputou este distrito em 2022
  finalVotes: number;
  bias: number;            // viés (p.p.) dos votos apurados primeiro
}

export interface ModelDistrict {
  id: number;
  name: string;
  uf: string;
  ufName: string;
  region: string;
  voters: number;
  polls: number;
  total: number;           // votos válidos finais 2026
  delay: number;           // atraso para começar a apurar (0–1)
  curve: number;           // formato da curva de apuração
  candidates: ModelCandidate[];
}

export interface ModelState {
  uf: string;
  name: string;
  prTotal: number;
  prFinal: Record<string, number>;
  prBias: Record<string, number>;
  distFinalPct: Record<string, number>;  // % final do voto distrital no estado (por frente)
}

export interface ElectionModel {
  seed: number;
  districts: ModelDistrict[];
  states: Record<string, ModelState>;
  nationalSwing: Record<string, number>;
}

export interface CandidateResult {
  front: string;
  party: string | null;
  name: string;
  photo: string | null;
  gender: 'F' | 'M' | null;
  incumbent: boolean;
  incumbentParty: boolean;
  rerun: boolean;
  votes: number;
  pct: number;
}

export interface DistrictSnapshot {
  id: number;
  name: string;
  uf: string;
  ufName: string;
  region: string;
  voters: number;
  polls: number;
  pollsCounted: number;
  reported: number;        // % apurado (0–100)
  counted: number;         // votos apurados
  expectedTotal: number;
  turnout: number;         // comparecimento projetado (% eleitores)
  candidates: CandidateResult[];
  shares: Record<string, number>;   // % por frente (2026, parcial)
  leader: CandidateResult | null;
  runnerUp: CandidateResult | null;
  marginPct: number;
  marginVotes: number;
  status: DistrictStatusOutput;
  isFinal: boolean;
  // ---- 2022
  prev: {
    front: string | null;
    name: string | null;
    party: string | null;
    shares: Record<string, number>;
    total: number;
    turnout: number;
    marginPct: number;
    pct: number;                 // % do deputado eleito em 2022
    deputyRunning: boolean;      // o deputado atual disputa 2026
    candidates: { name: string; front: string; party: string | null; votes: number; pct: number; photo: string | null; gender: 'F' | 'M' | null }[];
  };
  // ---- 2018 (vencedor e %)
  y2018: { front: string; pct: number } | null;
  /** Voto proporcional estimado no distrito (% por frente; vazio sem apuração). */
  prShares: Record<string, number>;
  flipped: boolean;        // final e com frente diferente de 2022
  leadingFlip: boolean;    // liderança (ainda não final) diferente de 2022
}

export interface StateSnapshot {
  uf: string;
  name: string;
  reported: number;
  districtIds: number[];
  prCounted: number;
  prVotes: Record<string, number>;
  prPct: Record<string, number>;
  prSeats: Record<string, number>;      // projeção (votos parciais)
  prGuaranteed: Record<string, number>; // cadeiras já garantidas (nenhuma virada possível tira)
  prSeatsFinal: boolean;
  prev: { prPct: Record<string, number>; prSeats: Record<string, number> };
  districtWins: Record<string, number>;     // finais
  districtLeads: Record<string, number>;    // finais + liderando
  prevDistrictWins: Record<string, number>;
  hold: number | null;
}

export interface FrontTotals {
  legend: string;
  districtWon: number;
  districtLeading: number;   // liderando, ainda não definido
  prConfirmed: number;
  prProjected: number;       // projeção em estados ainda apurando
  confirmed: number;
  projected: number;         // confirmed + liderando + projeção PR
  prev: { district: number; pr: number; total: number };
  prVotes: number;
  prPct: number;
  prevPrPct: number;
  gains: number;             // distritos tomados de outras frentes (finais)
  losses: number;            // distritos perdidos (finais)
}

export interface ElectionSnapshot {
  progress: number;
  reported: number;          // % de votos apurados (nacional)
  pollsCounted: number;
  pollsTotal: number;
  counted: number;
  expectedTotal: number;
  districts: DistrictSnapshot[];
  districtById: Record<number, DistrictSnapshot>;
  states: Record<string, StateSnapshot>;
  fronts: FrontTotals[];     // ordenadas por cadeiras projetadas
  frontByLegend: Record<string, FrontTotals>;
  calledCount: number;
  flips: DistrictSnapshot[];
  baselineSource: Baseline2022['source'];
}

// ------------------------------------------------------------ Utilidades --

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const normalize = (rec: Record<string, number>, to = 100): Record<string, number> => {
  const sum = Object.values(rec).reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  Object.entries(rec).forEach(([k, v]) => { out[k] = (v / sum) * to; });
  return out;
};

const toPct = (votes: Record<string, number>): Record<string, number> => {
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  Object.entries(votes).forEach(([k, v]) => { out[k] = total > 0 ? (v / total) * 100 : 0; });
  return out;
};

/** Distribui `total` inteiro proporcionalmente aos pesos (maiores restos). */
function apportion(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map(w => (w / sum) * total);
  const floor = raw.map(Math.floor);
  let rest = total - floor.reduce((a, b) => a + b, 0);
  raw.map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => { if (rest > 0) { floor[i]++; rest--; } });
  return floor;
}

const partiesOfFront = (front: string) => partyData.filter(p => p.parl_front_legend === front && p.party_legend);

/** Fração apurada de um distrito dado o progresso (0–1) da sua UF. */
function reportedFraction(p: number, delay: number, curve: number): number {
  if (p >= 1) return 1;
  if (p <= delay) return 0;
  const x = (p - delay) / (1 - delay);
  return clamp(1 - Math.pow(1 - x, curve), 0, 1);
}

// ------------------------------------------------------------- Modelo -----

/** Banco de rostos para candidatos sem foto (ver /api/2026/photos). */
export interface PhotoPool { female: string[]; male: string[] }

/** Ajuste do operador: swing nacional extra (p.p.) por frente, somado ao sorteado. */
export interface Scenario { swing: Record<string, number> }

export function buildModel(baseline: Baseline2022, seed: number, photos?: PhotoPool | null, scenario?: Scenario | null): ElectionModel {
  const natR = rngFor(seed, 'national');
  const nationalSwing: Record<string, number> = {};
  FRONT_ORDER.forEach(f => { nationalSwing[f] = gauss(natR) * 3.2; });
  // Uma frente "surpresa" da noite
  const surprise = pick(natR, FRONT_ORDER);
  nationalSwing[surprise] += 2.5 + natR() * 3;
  // Cenário montado pelo operador (/2026/cenario)
  if (scenario) FRONT_ORDER.forEach(f => { nationalSwing[f] += scenario.swing[f] ?? 0; });
  // Comparecimento de 2026: cada estado entre 85% e 90%; distritos variam em volta.
  // A variação de cada distrito é recentrada para a média do estado (ponderada
  // pelos eleitores) cair exatamente no valor sorteado.
  const turnoutById: Record<number, number> = {};
  STATE_ORDER.forEach(uf => {
    const target = 85 + rngFor(seed, 'turnout', uf)() * 5;
    const ds = districtsData.filter(d => d.uf === uf);
    const raw = ds.map(d => gauss(rngFor(seed, 'turnout', d.district_id)) * 1.6);
    const voters = ds.reduce((a, d) => a + d.voters_qtn, 0);
    const mean = voters > 0 ? ds.reduce((a, d, i) => a + raw[i] * d.voters_qtn, 0) / voters : 0;
    ds.forEach((d, i) => { turnoutById[d.district_id] = clamp(target + raw[i] - mean, 81, 94); });
  });

  const stateSwing: Record<string, Record<string, number>> = {};
  STATE_ORDER.forEach(uf => {
    const r = rngFor(seed, 'state', uf);
    stateSwing[uf] = {};
    FRONT_ORDER.forEach(f => { stateSwing[uf][f] = gauss(r) * 2.4; });
  });
  // Ritmo de apuração de cada estado (alguns estados apuram mais rápido)
  const stateDelay: Record<string, number> = {};
  STATE_ORDER.forEach(uf => { stateDelay[uf] = rngFor(seed, 'pace', uf)() * 0.08; });

  const districts: ModelDistrict[] = districtsData.map(d => {
    const r = rngFor(seed, 'district', d.district_id);
    const base = baseline.districts[d.district_id];
    const baseShares = base && base.total > 0 ? toPct(base.votes) : {};

    // Frentes que concorrem: as de 2022 e, às vezes, uma estreante.
    const running = new Set(Object.keys(baseShares).filter(f => baseShares[f] > 0));
    FRONT_ORDER.forEach(f => { if (!running.has(f) && r() < 0.12) running.add(f); });
    if (running.size < 2) FRONT_ORDER.slice(0, 3).forEach(f => running.add(f));

    const finalShares: Record<string, number> = {};
    running.forEach(f => {
      const b = baseShares[f] ?? (2 + r() * 5);
      const scale = clamp(0.35 + b / 28, 0.35, 1.4);
      const delta = ((nationalSwing[f] ?? 0) + (stateSwing[d.uf]?.[f] ?? 0) + gauss(r) * 3) * scale;
      finalShares[f] = Math.max(0.4, b + delta);
    });
    const shares = normalize(finalShares);

    // Comparecimento do distrito: o do estado ± alguns pontos.
    const turnout = turnoutById[d.district_id] ?? 87.5;
    const total = Math.round(d.voters_qtn * turnout / 100);

    const fronts = Object.keys(shares);
    const votes = apportion(fronts.map(f => shares[f]), total);

    const candidates: ModelCandidate[] = fronts.map((f, i) => {
      const cr = rngFor(seed, 'cand', d.district_id, f);
      const prevCand = base?.candidates.find(c => c.front === f) ?? null;
      const wasWinner = !!prevCand && base?.winnerName === prevCand.name;
      const rerun = !!prevCand && cr() < (wasWinner ? 0.78 : 0.4);
      const parties = partiesOfFront(f);
      const party = rerun && prevCand?.party ? prevCand.party : (parties.length ? pick(cr, parties).party_legend : f);
      const gender: 'F' | 'M' | null = rerun && prevCand ? prevCand.gender ?? null : cr() < 0.45 ? 'F' : 'M';
      return {
        front: f,
        party,
        name: rerun && prevCand ? prevCand.name : fictionalName(cr, gender),
        photo: rerun && prevCand ? prevCand.photo : null,
        gender,
        incumbent: rerun && wasWinner,
        incumbentParty: f === base?.winnerFront && !(rerun && wasWinner),
        rerun,
        finalVotes: votes[i],
        bias: gauss(cr) * 5.5,
      };
    });

    return {
      id: d.district_id,
      name: d.district_name,
      uf: d.uf,
      ufName: d.uf_name,
      region: d.region_name,
      voters: d.voters_qtn,
      polls: d.polls_qtn,
      total,
      delay: clamp(stateDelay[d.uf] + Math.pow(r(), 1.5) * 0.25, 0, 0.35),
      curve: 0.7 + r() * 3.3,
      candidates: candidates.sort((a, b) => b.finalVotes - a.finalVotes),
    };
  });

  // Rostos gerados para quem não tem foto: escolha determinística e sem repetir.
  if (photos && (photos.female.length || photos.male.length)) {
    const used = new Set<string>();
    districts.forEach(d => d.candidates.forEach(c => { if (c.photo) used.add(c.photo); }));
    districts.forEach(d => d.candidates.forEach(c => {
      if (c.photo) return;
      const g = c.gender ?? (hash(seed, d.id, c.front, 'g') % 2 ? 'F' : 'M');
      const pool = (g === 'F' ? photos.female : photos.male).length ? (g === 'F' ? photos.female : photos.male) : (photos.female.length ? photos.female : photos.male);
      const start = hash(seed, d.id, c.front, 'photo') % pool.length;
      for (let k = 0; k < pool.length; k++) {
        const url = pool[(start + k) % pool.length];
        if (!used.has(url)) { c.photo = url; used.add(url); break; }
      }
    }));
  }

  const states: Record<string, ModelState> = {};
  STATE_ORDER.forEach(uf => {
    const r = rngFor(seed, 'pr', uf);
    const base = baseline.states[uf];
    const basePct = base && base.total > 0 ? toPct(base.votes) : {};
    // O proporcional caminha com o distrital: 70% do voto distrital do estado
    // + 30% da tendência do proporcional de 2022 (com as mesmas ondas).
    const distVotes: Record<string, number> = {};
    districts.filter(d => d.uf === uf).forEach(d => d.candidates.forEach(c => { distVotes[c.front] = (distVotes[c.front] || 0) + c.finalVotes; }));
    const distFinalPct = toPct(distVotes);
    const final: Record<string, number> = {};
    FRONT_ORDER.forEach(f => {
      const b = basePct[f] ?? 1;
      const scale = clamp(0.4 + b / 30, 0.4, 1.3);
      const prior = Math.max(0.3, b + ((nationalSwing[f] ?? 0) + (stateSwing[uf]?.[f] ?? 0)) * scale);
      final[f] = Math.max(0.3, 0.7 * (distFinalPct[f] ?? 0) + 0.3 * prior + gauss(r) * 0.8);
    });
    const prTotal = Math.round(districts.filter(d => d.uf === uf).reduce((s, d) => s + d.total, 0) * 0.985);
    const fronts = Object.keys(final);
    const v = apportion(fronts.map(f => final[f]), prTotal);
    const prFinal: Record<string, number> = {};
    const prBias: Record<string, number> = {};
    fronts.forEach((f, i) => { prFinal[f] = v[i]; prBias[f] = gauss(r) * 3; });
    const name = districtsData.find(d => d.uf === uf)?.uf_name ?? uf;
    states[uf] = { uf, name, prTotal, prFinal, prBias, distFinalPct };
  });

  return { seed, districts, states, nationalSwing };
}

// ------------------------------------------------------------ Snapshot ----

/**
 * Cadeiras proporcionais já garantidas num estado: para cada frente, o pior
 * cenário possível — todos os votos que faltam vão para as outras frentes
 * (espalhados ou concentrados numa só) — e quantas cadeiras ela mantém mesmo
 * assim (com a barreira e o mínimo de votos aplicados ao total final).
 */
function guaranteedPR(uf: string, counted: Record<string, number>, remaining: number): Record<string, number> {
  const seats = PR_SEATS_BY_STATE[uf] ?? 0;
  const fronts = Object.keys(counted);
  const total = fronts.reduce((s, f) => s + counted[f], 0);
  const out: Record<string, number> = {};
  if (!seats || total <= 0) return out;
  fronts.forEach(f => {
    if (counted[f] <= 0) return;
    const others = fronts.filter(g => g !== f);
    const otherTotal = total - counted[f];
    const scenarios: Record<string, number>[] = [];
    // espalhados entre as outras frentes, na proporção atual
    scenarios.push(Object.fromEntries(fronts.map(g => [g, counted[g] + (g === f ? 0 : remaining * (otherTotal > 0 ? counted[g] / otherTotal : 1 / others.length))])));
    // ou todos numa única frente rival
    others.forEach(o => scenarios.push(Object.fromEntries(fronts.map(g => [g, counted[g] + (g === o ? remaining : 0)]))));
    out[f] = Math.min(...scenarios.map(sc => allocateStatePR(uf, sc, 1)[f] ?? 0));
  });
  // Segurança: nunca mais garantidas do que cadeiras
  let sum = Object.values(out).reduce((a, b) => a + b, 0);
  while (sum > seats) {
    const top = Object.keys(out).sort((a, b) => out[b] - out[a])[0];
    out[top]--; sum--;
  }
  return out;
}

/** Voto proporcional estimado no distrito: o % final do estado, deslocado pelo desvio local do voto distrital. */
function districtPrShares(statePr: Record<string, number>, stateDist: Record<string, number>, districtShares: Record<string, number>): Record<string, number> {
  const raw: Record<string, number> = {};
  FRONT_ORDER.forEach(f => {
    const v = (statePr[f] ?? 0) + ((districtShares[f] ?? 0) - (stateDist[f] ?? 0)) * 0.85;
    raw[f] = Math.max(0.3, v);
  });
  return normalize(raw);
}

/** Votos parciais: proporção final + viés decrescente, aplicado sobre `counted`. */
function partialVotes(finalVotes: Record<string, number>, bias: Record<string, number>, fraction: number, counted: number): Record<string, number> {
  const keys = Object.keys(finalVotes);
  if (fraction >= 1) return { ...finalVotes };
  const finalPct = toPct(finalVotes);
  const decay = Math.pow(1 - fraction, 1.3);
  const weights = keys.map(k => Math.max(0.1, finalPct[k] + (bias[k] ?? 0) * decay));
  const v = apportion(weights, counted);
  const out: Record<string, number> = {};
  keys.forEach((k, i) => { out[k] = v[i]; });
  return out;
}

export function snapshotAt(
  model: ElectionModel,
  baseline: Baseline2022,
  progress: number,
  holds: Record<string, number | null> = {},
): ElectionSnapshot {
  const colorMap: Record<string, string> = {};
  FRONT_ORDER.forEach(f => { colorMap[f] = frontColor(f); });
  const prFinalPct: Record<string, Record<string, number>> = {};
  STATE_ORDER.forEach(uf => { prFinalPct[uf] = toPct(model.states[uf].prFinal); });

  const districts: DistrictSnapshot[] = model.districts.map(d => {
    const hold = holds[d.uf];
    const p = Math.min(progress, hold ?? 100) / 100;
    const fraction = reportedFraction(p, d.delay, d.curve);
    const counted = Math.round(d.total * fraction);

    const finalVotes: Record<string, number> = {};
    const bias: Record<string, number> = {};
    d.candidates.forEach(c => { finalVotes[c.front] = c.finalVotes; bias[c.front] = c.bias; });
    const votes = partialVotes(finalVotes, bias, fraction, counted);

    const candidates: CandidateResult[] = d.candidates
      .map(c => ({
        front: c.front, party: c.party, name: c.name, photo: c.photo, gender: c.gender,
        incumbent: c.incumbent, incumbentParty: c.incumbentParty, rerun: c.rerun,
        votes: votes[c.front] ?? 0,
        pct: counted > 0 ? ((votes[c.front] ?? 0) / counted) * 100 : 0,
      }))
      .sort((a, b) => b.votes - a.votes || a.front.localeCompare(b.front));

    const leader = counted > 0 ? candidates[0] : null;
    const runnerUp = counted > 0 ? candidates[1] ?? null : null;

    const base = baseline.districts[d.id];
    const prevShares = base && base.total > 0 ? toPct(base.votes) : {};
    const prevSorted = Object.entries(prevShares).sort((a, b) => b[1] - a[1]);
    const prevFront = base?.winnerFront ?? prevSorted[0]?.[0] ?? null;

    const status = calculateDistrictDynamicStatus({
      isLoading: false,
      leadingCoalition: leader ? { legend: leader.front, votes: leader.votes, name: leader.name } : undefined,
      runnerUpCoalition: runnerUp ? { legend: runnerUp.front, votes: runnerUp.votes, name: runnerUp.name } : undefined,
      totalVotesInDistrict: counted,
      remainingVotesEstimate: d.total - counted,
      previousSeatHolderCoalitionLegend: prevFront,
      coalitionColorMap: colorMap,
    });
    const isFinal = status.isFinal;

    const shares: Record<string, number> = {};
    candidates.forEach(c => { shares[c.front] = c.pct; });

    return {
      id: d.id, name: d.name, uf: d.uf, ufName: d.ufName, region: d.region,
      voters: d.voters, polls: d.polls,
      pollsCounted: Math.round(d.polls * fraction),
      reported: fraction * 100,
      counted,
      expectedTotal: d.total,
      turnout: (d.total / d.voters) * 100,
      candidates,
      shares,
      leader,
      runnerUp,
      marginPct: leader && runnerUp ? leader.pct - runnerUp.pct : leader ? leader.pct : 0,
      marginVotes: leader && runnerUp ? leader.votes - runnerUp.votes : leader ? leader.votes : 0,
      status,
      isFinal,
      prev: {
        front: prevFront,
        name: base?.winnerName ?? null,
        party: base?.winnerParty ?? null,
        shares: prevShares,
        total: base?.total ?? 0,
        turnout: base && base.total > 0 ? (base.total / d.voters) * 100 : 0,
        marginPct: prevSorted.length > 1 ? prevSorted[0][1] - prevSorted[1][1] : prevSorted[0]?.[1] ?? 0,
        pct: prevFront ? prevShares[prevFront] ?? 0 : 0,
        deputyRunning: d.candidates.some(c => c.incumbent),
        candidates: (base?.candidates ?? []).slice(0, 5).map(c => ({
          name: c.name, front: c.front, party: c.party, votes: c.votes, photo: c.photo, gender: c.gender ?? null,
          pct: base && base.total > 0 ? (c.votes / base.total) * 100 : 0,
        })),
      },
      y2018: (() => {
        const r = previousDistrictResultsData.find(x => x.district_id === d.id);
        return r ? { front: r.winner_2018_legend, pct: r.winner_2018_percentage } : null;
      })(),
      prShares: counted > 0 ? districtPrShares(prFinalPct[d.uf], model.states[d.uf].distFinalPct, shares) : {},
      flipped: isFinal && !!leader && !!prevFront && leader.front !== prevFront,
      leadingFlip: !isFinal && !!leader && !!prevFront && leader.front !== prevFront,
    };
  });

  const districtById: Record<number, DistrictSnapshot> = {};
  districts.forEach(d => { districtById[d.id] = d; });

  // ---- Estados
  const states: Record<string, StateSnapshot> = {};
  STATE_ORDER.forEach(uf => {
    const m = model.states[uf];
    const ds = districts.filter(d => d.uf === uf);
    const expected = ds.reduce((s, d) => s + d.expectedTotal, 0);
    const counted = ds.reduce((s, d) => s + d.counted, 0);
    const fraction = expected > 0 ? counted / expected : 0;
    const prCounted = Math.round(m.prTotal * fraction);
    // Votos parciais do proporcional acompanham o desvio do distrital apurado
    // (mesmas urnas): começam enviesados e convergem para o resultado final.
    const distPartial: Record<string, number> = {};
    ds.forEach(d => d.candidates.forEach(c => { distPartial[c.front] = (distPartial[c.front] || 0) + c.votes; }));
    const distPartialPct = toPct(distPartial);
    const decay = Math.pow(1 - fraction, 1.3);
    const prVotes = fraction >= 1 ? { ...m.prFinal } : (() => {
      const keys = Object.keys(m.prFinal);
      const w = keys.map(f => Math.max(0.1, prFinalPct[uf][f] + ((distPartialPct[f] ?? 0) - (m.distFinalPct[f] ?? 0)) * 0.8 + (m.prBias[f] ?? 0) * decay * 0.3));
      const v = apportion(w, prCounted);
      const out: Record<string, number> = {};
      keys.forEach((f, i) => { out[f] = v[i]; });
      return out;
    })();
    const districtWins: Record<string, number> = {};
    const districtLeads: Record<string, number> = {};
    const prevDistrictWins: Record<string, number> = {};
    ds.forEach(d => {
      if (d.leader) {
        districtLeads[d.leader.front] = (districtLeads[d.leader.front] || 0) + 1;
        if (d.isFinal) districtWins[d.leader.front] = (districtWins[d.leader.front] || 0) + 1;
      }
      if (d.prev.front) prevDistrictWins[d.prev.front] = (prevDistrictWins[d.prev.front] || 0) + 1;
    });
    const base = baseline.states[uf];
    states[uf] = {
      uf,
      name: m.name,
      reported: fraction * 100,
      districtIds: ds.map(d => d.id),
      prCounted,
      prVotes,
      prPct: toPct(prVotes),
      prSeats: prCounted > 0 ? allocateStatePR(uf, prVotes, fraction) : {},
      prGuaranteed: fraction >= 1 ? allocateStatePR(uf, prVotes, 1) : prCounted > 0 ? guaranteedPR(uf, prVotes, Math.max(0, m.prTotal - prCounted) * 1.02) : {},
      prSeatsFinal: fraction >= 1,
      prev: { prPct: base ? toPct(base.votes) : {}, prSeats: base?.seats ?? {} },
      districtWins,
      districtLeads,
      prevDistrictWins,
      hold: holds[uf] ?? null,
    };
  });

  // ---- Frentes (nacional)
  const fronts: Record<string, FrontTotals> = {};
  const ensure = (f: string) => {
    if (!fronts[f]) {
      fronts[f] = {
        legend: f, districtWon: 0, districtLeading: 0, prConfirmed: 0, prProjected: 0,
        confirmed: 0, projected: 0, prev: { district: 0, pr: 0, total: 0 },
        prVotes: 0, prPct: 0, prevPrPct: 0, gains: 0, losses: 0,
      };
    }
    return fronts[f];
  };
  FRONT_ORDER.forEach(ensure);

  districts.forEach(d => {
    if (d.leader) {
      const f = ensure(d.leader.front);
      if (d.isFinal) f.districtWon++; else f.districtLeading++;
    }
    if (d.prev.front) ensure(d.prev.front).prev.district++;
    if (d.flipped && d.leader && d.prev.front) {
      ensure(d.leader.front).gains++;
      ensure(d.prev.front).losses++;
    }
  });
  let prTotalCounted = 0;
  let prevPrTotal = 0;
  const prevPrVotes: Record<string, number> = {};
  Object.values(states).forEach(s => {
    // Garantidas contam como confirmadas; o restante da projeção fica em aberto.
    FRONT_ORDER.forEach(f => {
      const g = s.prGuaranteed[f] ?? 0;
      ensure(f).prConfirmed += g;
      ensure(f).prProjected += Math.max(0, (s.prSeats[f] ?? 0) - g);
    });
    Object.entries(s.prev.prSeats).forEach(([f, n]) => { ensure(f).prev.pr += n; });
    Object.entries(s.prVotes).forEach(([f, v]) => { ensure(f).prVotes += v; prTotalCounted += v; });
    const base = baseline.states[s.uf];
    if (base) Object.entries(base.votes).forEach(([f, v]) => { prevPrVotes[f] = (prevPrVotes[f] || 0) + v; prevPrTotal += v; });
  });
  Object.values(fronts).forEach(f => {
    f.confirmed = f.districtWon + f.prConfirmed;
    f.projected = f.confirmed + f.districtLeading + f.prProjected;
    f.prev.total = f.prev.district + f.prev.pr;
    f.prPct = prTotalCounted > 0 ? (f.prVotes / prTotalCounted) * 100 : 0;
    f.prevPrPct = prevPrTotal > 0 ? ((prevPrVotes[f.legend] || 0) / prevPrTotal) * 100 : 0;
  });
  const frontList = Object.values(fronts).sort((a, b) => b.projected - a.projected || b.prev.total - a.prev.total);

  const counted = districts.reduce((s, d) => s + d.counted, 0);
  const expectedTotal = districts.reduce((s, d) => s + d.expectedTotal, 0);
  const pollsCounted = districts.reduce((s, d) => s + d.pollsCounted, 0);
  const pollsTotal = districts.reduce((s, d) => s + d.polls, 0);

  return {
    progress,
    reported: expectedTotal > 0 ? (counted / expectedTotal) * 100 : 0,
    pollsCounted,
    pollsTotal,
    counted,
    expectedTotal,
    districts,
    districtById,
    states,
    fronts: frontList,
    frontByLegend: fronts,
    calledCount: districts.filter(d => d.isFinal).length,
    flips: districts.filter(d => d.flipped),
    baselineSource: baseline.source,
  };
}

export { PR_SEATS_BY_STATE };
