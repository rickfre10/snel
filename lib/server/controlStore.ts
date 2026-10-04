// lib/server/controlStore.ts
// Onde o estado do controle 2026 fica guardado no servidor.
//
//  • Com Redis (Upstash ou Vercel KV) configurado, o estado é compartilhado
//    por todas as instâncias do servidor — obrigatório em hospedagem
//    serverless (ex.: Vercel), onde cada instância tem a sua memória.
//    Variáveis aceitas: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//    ou KV_REST_API_URL + KV_REST_API_TOKEN.
//  • Sem Redis, fica na memória do processo (ok para `npm start` numa máquina).
import { ControlState, initialControlState, isControlState } from '@/lib/haagar2026/control';

const KEY = process.env.CONTROL_STORE_KEY || 'haagar2026:control';
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const storeKind = (): 'redis' | 'memory' => (REDIS_URL && REDIS_TOKEN ? 'redis' : 'memory');

const g = globalThis as unknown as { __haagar2026Control?: ControlState };

// Estado inicial de uma instância nova: com updatedAt 0 ele nunca "vence" o
// estado real que os painéis já conhecem (evita o controle zerar sozinho).
const fresh = (): ControlState => ({ ...initialControlState(), rev: 0, updatedAt: 0 });

async function redis(command: (string | number)[]) {
  const res = await fetch(REDIS_URL as string, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return (await res.json()) as { result: unknown };
}

export async function loadControl(): Promise<ControlState> {
  if (storeKind() === 'redis') {
    try {
      const { result } = await redis(['GET', KEY]);
      const parsed = typeof result === 'string' ? JSON.parse(result) : null;
      if (isControlState(parsed)) return (g.__haagar2026Control = parsed);
    } catch (e) {
      console.error('[controle] Falha ao ler Redis, usando memória:', e);
    }
  }
  return (g.__haagar2026Control ??= fresh());
}

export async function saveControl(state: ControlState): Promise<void> {
  g.__haagar2026Control = state;
  if (storeKind() === 'redis') {
    try {
      await redis(['SET', KEY, JSON.stringify(state)]);
    } catch (e) {
      console.error('[controle] Falha ao gravar Redis:', e);
    }
  }
}

/** O estado mais recente entre dois (por updatedAt / rev). */
export const newest = (a: ControlState, b: ControlState | null | undefined): ControlState =>
  b && (b.updatedAt > a.updatedAt || (b.updatedAt === a.updatedAt && b.rev > a.rev)) ? b : a;
