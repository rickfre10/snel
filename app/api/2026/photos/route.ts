// app/api/2026/photos/route.ts
// Banco de rostos gerados (generated.photos) para candidatos de 2026 sem foto.
// Requer GENERATED_PHOTOS_API_KEY. Sem a chave, devolve listas vazias e o
// telão usa avatares com iniciais. A ordem é estável (mesmas páginas da API),
// então todas as telas atribuem o mesmo rosto ao mesmo candidato.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API = 'https://api.generated.photos/api/v1/faces';
const CACHE_MS = 24 * 60 * 60 * 1000;
// Faixas etárias plausíveis para candidatos
const AGES = ['adult', 'middle-adult'];
const PER_PAGE = 100;

interface PhotoPool { enabled: boolean; female: string[]; male: string[]; error?: string }
let cache: { data: PhotoPool; at: number } | null = null;

/** Extrai a melhor URL (≈256px) de um rosto, tolerando variações do formato da API. */
function faceUrl(face: any): string | null {
  const urls: any[] = Array.isArray(face?.urls) ? face.urls : [];
  const bySize: Record<string, string> = {};
  urls.forEach(u => {
    if (u && typeof u === 'object') Object.entries(u).forEach(([k, v]) => { if (typeof v === 'string') bySize[k] = v; });
    else if (typeof u === 'string') bySize[String(Object.keys(bySize).length)] = u;
  });
  return bySize['256'] ?? bySize['512'] ?? bySize['128'] ?? Object.values(bySize)[0] ?? null;
}

async function fetchFaces(key: string, gender: 'female' | 'male'): Promise<string[]> {
  const out: string[] = [];
  // 2 faixas etárias × 2 páginas × 100 = até 400 rostos por gênero
  for (const age of AGES) for (const page of [1, 2]) {
    const url = `${API}?per_page=${PER_PAGE}&page=${page}&gender=${gender}&age=${age}&order_by=oldest`;
    const res = await fetch(url, { headers: { Authorization: `API-Key ${key}` }, cache: 'no-store' });
    if (!res.ok) throw new Error(`generated.photos ${res.status}`);
    const body = await res.json();
    (body?.faces ?? []).forEach((f: unknown) => { const u = faceUrl(f); if (u) out.push(u); });
  }
  return Array.from(new Set(out));
}

export async function GET() {
  const key = process.env.GENERATED_PHOTOS_API_KEY;
  if (!key) return NextResponse.json({ enabled: false, female: [], male: [] } satisfies PhotoPool);
  if (cache && Date.now() - cache.at < CACHE_MS) return NextResponse.json(cache.data);
  try {
    const [female, male] = await Promise.all([fetchFaces(key, 'female'), fetchFaces(key, 'male')]);
    cache = { data: { enabled: true, female, male }, at: Date.now() };
    return NextResponse.json(cache.data);
  } catch (e) {
    console.error('[Fotos 2026] Falha ao buscar generated.photos:', e);
    return NextResponse.json({ enabled: false, female: [], male: [], error: String(e) } satisfies PhotoPool);
  }
}
