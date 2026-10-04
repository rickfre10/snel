// components/tv/TelaoScene.tsx
"use client";
// Conteúdo do telão (barra superior + cena), compartilhado entre o telão
// (/2026) e o CG com fundo de telão (/2026/cg?fundo=telao).
import React from 'react';
import type { BrandTheme } from '@/lib/brand';
import type { SceneId } from '@/lib/haagar2026/control';
import type { ElectionSnapshot } from '@/lib/haagar2026/model';
import { TopBar, caseOf } from './TvChrome';
import { BrandLogo } from './ui';
import SceneGeral from './scenes/SceneGeral';
import SceneParlamento from './scenes/SceneParlamento';
import SceneEstado from './scenes/SceneEstado';
import SceneDistrito from './scenes/SceneDistrito';
import SceneViradas from './scenes/SceneViradas';
import SceneComparativo from './scenes/SceneComparativo';

export interface TelaoSceneProps {
  brand: BrandTheme;
  snap: ElectionSnapshot | null;
  scene: SceneId;
  uf: string;
  districtId: number;
  onScene?: (s: SceneId) => void;
  onDistrict?: (id: number) => void;
  onUf?: (uf: string) => void;
  onLogoLongPress?: () => void;
}

const noop = () => {};

export default function TelaoScene({ brand, snap, scene, uf, districtId, onScene = noop, onDistrict = noop, onUf = noop, onLogoLongPress = noop }: TelaoSceneProps) {
  const nav = [
    { id: 'geral', label: caseOf(brand, 'Visão geral') },
    { id: 'parlamento', label: caseOf(brand, 'Parlamento') },
    { id: 'estado', label: caseOf(brand, 'Estados') },
    { id: 'viradas', label: caseOf(brand, 'Viradas') },
    { id: 'comparativo', label: '2022 × 2026' },
    ...(scene === 'distrito' && snap ? [{ id: 'distrito', label: snap.districtById[districtId]?.name ?? 'Distrito' }] : []),
  ].map(n => ({ ...n, active: scene === n.id, onClick: () => onScene(n.id as SceneId) }));

  const openUf = (u: string) => { onUf(u); onScene('estado'); };

  return (
    <>
      <TopBar brand={brand} snap={snap} nav={nav} onLogoLongPress={onLogoLongPress} />
      <main className="absolute left-10 right-10 top-[132px] bottom-[100px]">
        {!snap ? (
          <div className="h-full flex flex-col items-center justify-center gap-6 text-tv-muted">
            <div className="tv-pulse"><BrandLogo brand={brand} size={88} color="rgb(var(--tv-text))" /></div>
            <div className="text-[22px]">Carregando base de 2022…</div>
          </div>
        ) : (
          <div key={`${scene}-${scene === 'estado' ? uf : ''}-${scene === 'distrito' ? districtId : ''}`} className="h-full tv-scene-in">
            {scene === 'geral' && <SceneGeral snap={snap} onDistrict={onDistrict} />}
            {scene === 'parlamento' && <SceneParlamento snap={snap} />}
            {scene === 'estado' && <SceneEstado snap={snap} uf={uf} onUf={onUf} onDistrict={onDistrict} />}
            {scene === 'distrito' && <SceneDistrito snap={snap} districtId={districtId} onDistrict={onDistrict} onUf={openUf} />}
            {scene === 'viradas' && <SceneViradas snap={snap} onDistrict={onDistrict} />}
            {scene === 'comparativo' && <SceneComparativo snap={snap} onDistrict={onDistrict} />}
          </div>
        )}
      </main>
    </>
  );
}
