// app/api/2026/control/route.ts
// Estado do controle da apuração 2026 (ritmo, pausa, semente, cena do telão).
// Fica em memória no servidor: telão e painel de controle — mesmo em
// computadores diferentes — leem daqui. Para proteger, defina CONTROL_PIN
// no ambiente; o painel pedirá o PIN para enviar comandos.
import { NextRequest, NextResponse } from 'next/server';
import { ControlAction, ControlState, applyControlAction, initialControlState } from '@/lib/haagar2026/control';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const g = globalThis as unknown as { __haagar2026Control?: ControlState };
const getState = () => (g.__haagar2026Control ??= initialControlState());

export async function GET() {
  return NextResponse.json({ state: getState(), serverNow: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const pin = process.env.CONTROL_PIN;
  if (pin && request.headers.get('x-control-pin') !== pin) {
    return NextResponse.json({ error: 'PIN inválido' }, { status: 401 });
  }
  let action: ControlAction;
  try {
    action = (await request.json()) as ControlAction;
  } catch {
    return NextResponse.json({ error: 'Comando inválido' }, { status: 400 });
  }
  if (!action || typeof action.type !== 'string') {
    return NextResponse.json({ error: 'Comando inválido' }, { status: 400 });
  }
  g.__haagar2026Control = applyControlAction(getState(), action, Date.now());
  return NextResponse.json({ state: g.__haagar2026Control, serverNow: Date.now() });
}
