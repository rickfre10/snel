// app/2026/controle/page.tsx
"use client";
// Mesa de controle da apuração 2026 para o operador (computador). Não é
// linkada em nenhuma tela pública. No telão, a tecla C abre a versão compacta.
import React from 'react';
import { useElection2026 } from '@/lib/haagar2026/useElection2026';
import ControlDesk from '@/components/tv/ControlDesk';

export default function Controle2026() {
  const el = useElection2026();
  return <ControlDesk state={el.state} dispatch={el.dispatch} progress={el.progress} snap={el.snapshot} mode={el.mode} error={el.error} store={el.store} />;
}
