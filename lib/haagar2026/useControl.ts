// lib/haagar2026/useControl.ts
"use client";
// Sincronização do controle da apuração.
//  • Fonte principal: API /api/2026/control (funciona entre computadores).
//  • Mesmo navegador: BroadcastChannel deixa a resposta instantânea.
//  • Sem servidor disponível: cai para modo local (localStorage), que
//    sincroniza janelas/abas do mesmo computador.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlAction, ControlState, applyControlAction, initialControlState, isControlState } from './control';

const CHANNEL = 'haagar2026-control';
const STORAGE_KEY = 'haagar2026-control-state';
const PIN_KEY = 'haagar2026-control-pin';
const POLL_MS = 1000;
// NEXT_PUBLIC_CONTROL_MODE=local força o modo local (ex.: hospedagem serverless,
// onde a memória do servidor não é compartilhada entre instâncias).
const FORCE_LOCAL = process.env.NEXT_PUBLIC_CONTROL_MODE === 'local';

type Mode = 'connecting' | 'server' | 'local';

const readLocal = (): ControlState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return isControlState(parsed) ? parsed : null;
  } catch { return null; }
};
const writeLocal = (s: ControlState) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* sem storage */ }
};

export function useControl() {
  const [state, setState] = useState<ControlState>(() => initialControlState(0));
  const [mode, setMode] = useState<Mode>('connecting');
  const [clockOffset, setClockOffset] = useState(0); // serverNow - Date.now()
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const modeRef = useRef<Mode>('connecting');
  const channelRef = useRef<BroadcastChannel | null>(null);
  const failures = useRef(0);
  const [store, setStore] = useState<'redis' | 'memory' | null>(null);

  const accept = useCallback((incoming: ControlState, force = false) => {
    const cur = stateRef.current;
    if (force || incoming.updatedAt > cur.updatedAt || (incoming.updatedAt === cur.updatedAt && incoming.rev > cur.rev) || cur.updatedAt === 0) {
      stateRef.current = incoming;
      setState(incoming);
    }
  }, []);

  const setModeBoth = (m: Mode) => { modeRef.current = m; setMode(m); };

  // BroadcastChannel + storage
  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(CHANNEL);
      ch.onmessage = e => { if (isControlState(e.data)) accept(e.data); };
      channelRef.current = ch;
    } catch { /* navegador sem BroadcastChannel */ }
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && modeRef.current === 'local') {
        const s = readLocal();
        if (s) accept(s);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => { ch?.close(); window.removeEventListener('storage', onStorage); };
  }, [accept]);

  // Polling do servidor
  useEffect(() => {
    if (FORCE_LOCAL) {
      setModeBoth('local');
      accept(readLocal() ?? initialControlState(), true);
      return;
    }
    let alive = true;
    const poll = async () => {
      try {
        const t0 = Date.now();
        const res = await fetch('/api/2026/control', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const body = await res.json();
        if (!alive) return;
        const t1 = Date.now();
        setClockOffset(body.serverNow - (t0 + t1) / 2);
        failures.current = 0;
        if (modeRef.current !== 'server') setModeBoth('server');
        if (body.store) setStore(body.store);
        if (isControlState(body.state)) {
          // Nunca volta para um estado mais antigo (instância do servidor
          // desatualizada em hospedagem serverless).
          accept(body.state);
        }
      } catch {
        if (!alive) return;
        failures.current++;
        if (failures.current >= 2 && modeRef.current !== 'local') {
          setModeBoth('local');
          setClockOffset(0);
          const s = readLocal() ?? initialControlState();
          accept(s, true);
        }
      }
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [accept]);

  const dispatch = useCallback(async (action: ControlAction) => {
    setError(null);
    if (modeRef.current === 'server') {
      try {
        let pin: string | null = null;
        try { pin = localStorage.getItem(PIN_KEY); } catch { /* */ }
        const res = await fetch('/api/2026/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(pin ? { 'x-control-pin': pin } : {}) },
          body: JSON.stringify({ action, base: stateRef.current.updatedAt ? stateRef.current : undefined }),
        });
        const body = await res.json();
        if (res.status === 401) {
          const typed = window.prompt('PIN do controle da apuração:');
          if (typed) {
            try { localStorage.setItem(PIN_KEY, typed); } catch { /* */ }
            return dispatch(action);
          }
          setError('PIN necessário para controlar a apuração.');
          return;
        }
        if (!res.ok) throw new Error(body.error || 'Falha ao enviar comando');
        if (isControlState(body.state)) {
          accept(body.state, true);
          channelRef.current?.postMessage(body.state);
        }
        return;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Falha ao enviar comando');
        return;
      }
    }
    const next = applyControlAction(stateRef.current, action, Date.now());
    accept(next, true);
    writeLocal(next);
    channelRef.current?.postMessage(next);
  }, [accept]);

  const ready = mode !== 'connecting';
  return { state, dispatch, mode, ready, clockOffset, error, store };
}
