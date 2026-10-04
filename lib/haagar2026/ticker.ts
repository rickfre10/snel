// lib/haagar2026/ticker.ts
// Frases da faixa de notícias (telão e CG enquanto não há resultados).
import type { ElectionSnapshot } from './model';
import { MAJORITY, STATE_ORDER } from '@/lib/haagar/rules';
import { fmtPct } from '@/components/tv/ui';

export function buildTicker(snap: ElectionSnapshot): string[] {
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
