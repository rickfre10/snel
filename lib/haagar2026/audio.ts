// lib/haagar2026/audio.ts
// Trilha sonora por marca: de onde vem cada som. Marca sem entrada aqui não
// tem trilha/vinheta (só o som da urna).
import type { BrandId } from '@/lib/brand';

/** Um trecho: arquivo + início e fim em segundos. */
export interface Clip { src: string; from: number; to: number }

export interface BrandAudio {
  vinheta: Clip;      // vinheta DO PROGRAMA (música estendida): só no botão "▶ Tocar vinheta (música)"
  breaking: Clip;     // ÚLTIMA HORA / breaking news (curto, o "punch"): botão e tecla U, vinheta automática da maioria e plantão de virada
  bg: Clip;           // trilha de fundo em loop
  fadeOutS: number;   // fade no fim da vinheta do programa
  breakingFadeInS?: number; // fade-in do plantão
  breakingFadeS: number;    // fade de saída do plantão
}

export const BRAND_AUDIO: Partial<Record<BrandId, BrandAudio>> = {
  smartv: {
    vinheta: { src: '/audio/smartv.mp3', from: 0, to: 11 },
    breaking: { src: '/audio/smartv.mp3', from: 4, to: 8 },
    bg: { src: '/audio/smartv.mp3', from: 12, to: 50 },
    fadeOutS: 1,
    breakingFadeInS: 0.3,
    breakingFadeS: 1,
  },
  // snews.mp3 tem ~25 min (decodificar inteiro custaria ~570 MB de memória no
  // navegador), então os trechos foram cortados em arquivos próprios:
  //   vinheta 00:58–01:20 · breaking 13:22–13:30 · fundo 16:45–19:38
  smartvnews: {
    vinheta: { src: '/audio/snews-vinheta.mp3', from: 0, to: 22 },
    breaking: { src: '/audio/snews-breaking.mp3', from: 0, to: 8 },
    bg: { src: '/audio/snews-bg.mp3', from: 0, to: 173 },
    fadeOutS: 1,
    breakingFadeInS: 1,
    breakingFadeS: 1.5,
  },
};

export const URNA: Clip = { src: '/audio/urna.mp3', from: 3, to: 5 };
