// lib/haagar2026/audio.ts
// Trilha sonora por marca: em que arquivo e em que trecho (segundos) fica
// cada som. Marca sem entrada aqui não tem trilha/vinheta (só o som da urna).
import type { BrandId } from '@/lib/brand';

export type Clip = [from: number, to: number];

export interface BrandAudio {
  src: string;
  stinger: Clip;      // vinheta de última hora em tela cheia (disparada pelo operador)
  breaking: Clip;     // plantão automático (virada / maioria)
  bg: Clip;           // trilha de fundo em loop
  fadeOutS: number;   // fade no último trecho da vinheta e do plantão
}

export const BRAND_AUDIO: Partial<Record<BrandId, BrandAudio>> = {
  smartv: { src: '/audio/smartv.mp3', stinger: [0, 11], breaking: [6, 11], bg: [12, 50], fadeOutS: 1 },
  // smartvnews: aguardando as minutagens de /audio/snews.mp3
};

export const URNA: { src: string; clip: Clip } = { src: '/audio/urna.mp3', clip: [3, 5] };
