// app/2026/idle/page.tsx
"use client";
// Vinheta de espera em tela cheia (segue a marca escolhida no controle).
import React from 'react';
import { BRANDS } from '@/lib/brand';
import { useControl } from '@/lib/haagar2026/useControl';
import { Stage } from '@/components/tv/TvChrome';
import IdleScreen from '@/components/tv/IdleScreen';

export default function Idle2026() {
  const { state } = useControl();
  const brand = BRANDS[state.brand] ?? BRANDS.smartv;
  return (
    <Stage brand={brand} background="#000">
      <IdleScreen brand={brand} />
    </Stage>
  );
}
