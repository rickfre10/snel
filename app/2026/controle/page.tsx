// app/2026/controle/page.tsx
"use client";
// Controle da apuração 2026 para o operador (outro computador, tablet ou
// janela). Não é linkado em nenhuma tela pública.
import React from 'react';
import Link from 'next/link';
import { useElection2026 } from '@/lib/haagar2026/useElection2026';
import ControlPanel from '@/components/tv/ControlPanel';

export default function Controle2026() {
  const el = useElection2026();
  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white font-sans">
      <div className="max-w-xl mx-auto p-4 sm:p-6">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold">Controle da apuração · 2026</h1>
            <p className="text-xs text-white/50">Os comandos chegam ao telão em até 1 segundo.</p>
          </div>
          <Link href="/2026" target="_blank" className="text-xs underline text-white/70">abrir telão ↗</Link>
        </header>
        <ControlPanel state={el.state} dispatch={el.dispatch} progress={el.progress} snap={el.snapshot} mode={el.mode} error={el.error} store={el.store} />
      </div>
    </div>
  );
}
