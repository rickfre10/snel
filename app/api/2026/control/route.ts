// app/api/2026/control/route.ts
// Estado do controle da apuração 2026 (ritmo, pausa, semente, cena do telão,
// CG). Telão, CG e painel de controle — mesmo em computadores diferentes —
// leem daqui. Armazenamento: ver lib/server/controlStore.ts (Redis ou memória).
// Para proteger, defina CONTROL_PIN no ambiente; o painel pedirá o PIN.
import { NextRequest, NextResponse } from 'next/server';
import { ControlAction, ControlState, applyControlAction, isControlState } from '@/lib/haagar2026/control';
import { loadControl, newest, saveControl, storeKind } from '@/lib/server/controlStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await loadControl();
  return NextResponse.json({ state, serverNow: Date.now(), store: storeKind() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const pin = process.env.CONTROL_PIN;
  if (pin && request.headers.get('x-control-pin') !== pin) {
    return NextResponse.json({ error: 'PIN inválido' }, { status: 401 });
  }
  let body: { action?: ControlAction; base?: ControlState } & Partial<ControlAction>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Comando inválido' }, { status: 400 });
  }
  // Aceita { action, base } (atual) ou a ação pura (formato antigo).
  const action = (body.action ?? body) as ControlAction;
  if (!action || typeof action.type !== 'string') {
    return NextResponse.json({ error: 'Comando inválido' }, { status: 400 });
  }
  // `base` é o estado mais novo que o painel conhece: protege contra uma
  // instância do servidor com estado desatualizado.
  const current = newest(await loadControl(), isControlState(body.base) ? body.base : null);
  const next = applyControlAction(current, action, Date.now());
  await saveControl(next);
  return NextResponse.json({ state: next, serverNow: Date.now(), store: storeKind() });
}
