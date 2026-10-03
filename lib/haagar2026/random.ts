// lib/haagar2026/random.ts
// Gerador pseudoaleatório determinístico: a mesma semente produz exatamente
// a mesma eleição em qualquer tela (telão, controle, segundo monitor...).

export function hash(...parts: (number | string)[]): number {
  let h = 2166136261 >>> 0;
  parts.forEach(part => {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x9e3779b9;
    h = Math.imul(h, 16777619);
  });
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof mulberry32>;

export const rngFor = (...parts: (number | string)[]) => mulberry32(hash(...parts));

/** Normal padrão (Box–Muller). */
export function gauss(r: Rng): number {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const pick = <T,>(r: Rng, list: T[]): T => list[Math.floor(r() * list.length) % list.length];
