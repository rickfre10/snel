// lib/haagar2026/useSfx.ts
"use client";
// Sons do telão e do CG:
//  • urna.mp3 (3–5 s): uma vez no começo de cada fila de cadeiras decididas
//    (se a fila esvazia e volta, toca de novo) e quando uma frente passa a
//    projetar maioria;
//  • plantão (virada / maioria): trecho "breaking" da marca, com fade;
//  • vinheta de última hora: trecho "stinger" da marca;
//  • trilha de fundo em loop, ligada e com volume pelo painel (por canal).
import { useEffect, useRef, useState } from 'react';
import type { BrandId } from '@/lib/brand';
import type { AudioCue, AudioSettings } from './control';
import { DEFAULT_AUDIO } from './control';
import type { ElectionSnapshot } from './model';
import { BRAND_AUDIO, URNA } from './audio';
import { audioRunning, initAudio, onAudioState, playClip, preload, setVolumes, startBg, stopBg, stopClips } from './sfx';
import { useBreaking, type Breaking } from './useBreaking';

export type Channel = 'telao' | 'cg';

/** Trilha de fundo + volumes + pré-carga dos arquivos. Chamar uma vez por tela. */
export function useAudioBed(channel: Channel, brand: BrandId, audio: AudioSettings | undefined) {
  const a = { ...DEFAULT_AUDIO, ...audio };
  const cfg = BRAND_AUDIO[brand];
  const [running, setRunning] = useState(false);
  useEffect(() => {
    initAudio();
    setRunning(audioRunning());
    preload(URNA.src);
    return onAudioState(() => setRunning(audioRunning()));
  }, []);
  useEffect(() => { if (cfg) [cfg.bg, cfg.breaking, cfg.stinger].forEach(c => preload(c.src)); }, [cfg]);
  useEffect(() => { setVolumes({ bg: a.bgVolume, sfx: a.sfxVolume }); }, [a.bgVolume, a.sfxVolume]);
  const on = channel === 'telao' ? a.bgTelao : a.bgCg;
  useEffect(() => {
    if (on && cfg && running) startBg(cfg.bg);
    else stopBg();
    return () => stopBg(0.3);
  }, [on, cfg, running]);
}

/** Som da fila de resultados e do plantão (flip/maioria). */
export function useQueueSound(urgent: Breaking | null, brand: BrandId) {
  const cfg = BRAND_AUDIO[brand];
  const inRun = useRef(false);        // já tocou nesta fila?
  const lastId = useRef<string | null>(null);
  useEffect(() => {
    if (!urgent) { inRun.current = false; lastId.current = null; return; } // fila saiu: a próxima é nova
    if (urgent.id === lastId.current) return;
    lastId.current = urgent.id;
    // Maioria / projeção de maioria: a vinheta em tela cheia (com a música da vinheta) já toca antes — aqui fica quieto
    if ((urgent.kind === 'majority' || urgent.kind === 'projection') && cfg) return;
    const breaking = urgent.kind === 'flip' || urgent.kind === 'majority' || urgent.kind === 'projection';
    if (!breaking && urgent.kind !== 'result') return;
    if (urgent.kind === 'flip' && cfg) {                       // plantão: trecho de breaking da marca
      inRun.current = true;
      playClip(cfg.breaking, { fadeInS: cfg.breakingFadeInS, fadeOutS: cfg.breakingFadeS, duckBg: true, releaseS: 4 }); // trilha volta com fade-in longo
      return;
    }
    if (inRun.current) return;                   // uma vez só por fila
    inRun.current = true;
    playClip(URNA, { fadeInS: 0.15 }); // por cima da trilha, sem abaixá-la
  }, [urgent, cfg]);
}

/** Vinheta de última hora em tela cheia (disparada pelo operador). */
export function useStingerSound(stingerKey: number | null, brand: BrandId) {
  const cfg = BRAND_AUDIO[brand];
  useEffect(() => {
    if (stingerKey === null || !cfg) return;
    playClip(cfg.stinger, { fadeOutS: cfg.fadeOutS, duckBg: true, releaseS: 3 });
  }, [stingerKey]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Música da vinheta solta à mão pelo operador (botão "Tocar vinheta"), ou parada com fade. */
export function useAudioCue(cue: AudioCue | undefined, clockOffset: number, ready: boolean, brand: BrandId) {
  const cfg = BRAND_AUDIO[brand];
  const lastRev = useRef<number | null>(null);
  useEffect(() => {
    if (!ready || !cue || cue.rev === lastRev.current) return;
    lastRev.current = cue.rev;
    if (Date.now() + clockOffset - cue.at > 3000) return;   // disparo velho (tela aberta depois): não toca
    if (cue.kind === 'stop') stopClips(1.5);
    else if (cfg) playClip(cfg.stinger, { fadeOutS: cfg.fadeOutS, duckBg: true, releaseS: 3 });
  }, [cue?.rev, ready]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Telão: mesma regra do CG, com fila própria só para o som. */
export function useTelaoSounds(snap: ElectionSnapshot | null, seed: number, ready: boolean, brand: BrandId, audio: AudioSettings | undefined, stingerKey: number | null, cue: AudioCue | undefined, clockOffset: number) {
  const queue = useBreaking(snap, seed, { results: true, ready });
  useAudioBed('telao', brand, audio);
  useQueueSound(queue, brand);
  useStingerSound(stingerKey, brand);
  useAudioCue(cue, clockOffset, ready, brand);
}
