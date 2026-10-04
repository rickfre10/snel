// components/tv/PillGrid.tsx
"use client";
// Grade de pílulas animada da Smartv: colunas em progressão geométrica que
// deslizam para a esquerda e encolhem, num loop contínuo (mesma animação da
// vinheta). Usada na vinheta, nas tarjas do CG e no fundo do telão.
import React, { useEffect, useRef } from 'react';

interface PillGridProps {
  width: number;
  height: number;
  rows?: number[];            // alturas relativas das linhas (somam ~1)
  ratio?: number;             // quanto cada coluna é mais larga que a anterior
  secondsPerColumn?: number;  // velocidade
  gap?: number;
  originX?: number;           // ponto de fuga (pode ser negativo, fora da área)
  pool?: number;              // colunas desenhadas
  fill?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function PillGrid({
  width, height, rows = [0.27, 0.345, 0.385], ratio = 1.3, secondsPerColumn = 3.2,
  gap = 4, originX = 0, pool = 16, fill = 'rgb(var(--tv-accent))', className = '', style,
}: PillGridProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rowsKey = rows.join(',');

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rs = rowsKey.split(',').map(Number);
    const rects = Array.from(svg.querySelectorAll<SVGRectElement>('rect[data-cell]'));
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const gridW = width - originX;
    const rowTops: number[] = [];
    rs.reduce((acc, h) => { rowTops.push(acc); return acc + h * height; }, 0);
    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const p = reduce ? 0 : ((now - start) / 1000 / secondsPerColumn) % 1;
      for (let c = 0; c < pool; c++) {
        const s0 = 1 - c - p;   // coluna c, da direita para a esquerda
        const xR = gridW * Math.pow(ratio, s0);
        const xL = gridW * Math.pow(ratio, s0 - 1);
        const w = xR - xL - gap;
        rs.forEach((rh, r) => {
          const el = rects[c * rs.length + r];
          if (!el) return;
          const h = rh * height - gap;
          el.setAttribute('x', String(originX + xL + gap / 2));
          el.setAttribute('y', String(rowTops[r] + gap / 2));
          el.setAttribute('width', String(Math.max(0, w)));
          el.setAttribute('height', String(Math.max(0, h)));
          el.setAttribute('rx', String(Math.max(0, Math.min(w, h) / 2)));
        });
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [width, height, rowsKey, ratio, secondsPerColumn, gap, originX, pool]);

  return (
    <svg ref={svgRef} width={width} height={height} className={className} style={style} aria-hidden>
      {Array.from({ length: pool }).flatMap((_, c) => rows.map((__, r) => (
        <rect key={`${c}-${r}`} data-cell="" fill={fill} />
      )))}
    </svg>
  );
}
