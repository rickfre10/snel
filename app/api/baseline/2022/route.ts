// app/api/baseline/2022/route.ts
// Resultado final de 2022 (aba 100% da planilha) consolidado por distrito e
// estado. Base de comparação do painel 2026. Sem acesso à planilha, usa o
// resultado oficial embutido em lib/data/haagar2022.json.
import { NextResponse } from 'next/server';
import { readVoteSheets, parseSheetNumber, sheetsConfigured } from '@/lib/server/sheets';
import { Baseline2022, buildBaselineFromRows, buildEmbeddedBaseline } from '@/lib/haagar/baseline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// O resultado de 2022 é fechado: cache longo em memória.
const CACHE_MS = 30 * 60 * 1000;
let cache: { data: Baseline2022; at: number } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) return NextResponse.json(cache.data);

  if (!sheetsConfigured()) {
    return NextResponse.json(await buildEmbeddedBaseline());
  }
  try {
    const { candidates, proportional } = await readVoteSheets('100');
    const data = buildBaselineFromRows(
      candidates
        .filter(c => c.district_id && c.candidate_name)
        .map(c => ({
          district_id: parseInt(String(c.district_id), 10),
          candidate_name: String(c.candidate_name),
          party_legend: c.party_legend ?? null,
          parl_front_legend: c.parl_front_legend ?? null,
          votes_qtn: parseSheetNumber(c.votes_qtn),
          candidate_photo: c.candidate_photo ?? null,
          gender: c.gender ?? null,
        })),
      proportional
        .filter(p => p.uf && p.parl_front_legend)
        .map(p => ({
          uf: String(p.uf),
          parl_front_legend: String(p.parl_front_legend),
          proportional_votes_qtn: parseSheetNumber(p.proportional_votes_qtn),
        })),
    );
    cache = { data, at: Date.now() };
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Baseline 2022] Falha ao ler planilha, usando dados embutidos:', error);
    return NextResponse.json(await buildEmbeddedBaseline());
  }
}
