// lib/haagar/expected2022.ts
// Total final de votos válidos de cada distrito em 2022 (do resultado oficial
// embutido). O painel 2022 usa isso para calcular os "votos restantes" —
// com comparecimento de 70–85%, usar o total de eleitores deixaria distritos
// já 100% apurados como "liderando".
import totals from '@/lib/data/haagar2022-totals.json';

const TOTALS = totals as Record<string, number>;

/** Votos esperados ao fim da apuração; cai para o nº de eleitores se faltar o dado. */
export function expectedVotes2022(districtId: number, votersQtn: number): number {
  return TOTALS[String(districtId)] ?? votersQtn;
}
