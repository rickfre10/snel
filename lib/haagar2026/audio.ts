// lib/haagar2026/audio.ts
// Trilha sonora por marca: de onde vem cada som. Marca sem entrada aqui não
// tem trilha/vinheta (só o som da urna).
import type { BrandId } from '@/lib/brand';

/** Um trecho: arquivo + início e fim em segundos. */
export interface Clip { src: string; from: number; to: number }

export interface BrandAudio {
  stinger: Clip;      // vinheta de última hora em tela cheia (disparada pelo operador)
  breaking: Clip;     // plantão automático (virada / maioria)
  bg: Clip;           // trilha de fundo em loop
  fadeOutS: number;   // fade no último trecho da vinheta e do plantão
}

export const BRAND_AUDIO: Partial<Record<BrandId, BrandAudio>> = {
  smartv: {
    stinger: { src: '/audio/smartv.mp3', from: 0, to: 11 },
    breaking: { src: '/audio/smartv.mp3', from: 6, to: 11 },
    bg: { src: '/audio/smartv.mp3', from: 12, to: 50 },
    fadeOutS: 1,
  },
  // snews.mp3 tem ~25 min (decodificar inteiro custaria ~570 MB de memória no
  // navegador), então os trechos foram cortados em arquivos próprios:
  //   vinheta 00:58–01:20 · breaking 13:18–13:30 · fundo 16:45–19:38
  smartvnews: {
    stinger: { src: '/audio/snews-vinheta.mp3', from: 0, to: 22 },
    breaking: { src: '/audio/snews-breaking.mp3', from: 0, to: 12 },
    bg: { src: '/audio/snews-bg.mp3', from: 0, to: 173 },
    fadeOutS: 1,
  },
};

export const URNA: Clip = { src: '/audio/urna.mp3', from: 3, to: 5 };
