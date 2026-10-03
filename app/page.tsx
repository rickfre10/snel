// app/page.tsx
// Seleção do pleito: 2026 (telão ao vivo) ou 2022 (resultado da planilha).
import Link from 'next/link';
import { BRANDS, brandCssVars } from '@/lib/brand';
import { TargetMark } from '@/components/tv/ui';

const brand = BRANDS.smartv;

// Grade de pílulas do grafismo da marca (lado direito)
const PILLS: { col: string; row: string; r: string }[] = [
  { col: '1 / 2', row: '1 / 2', r: '999px' },
  { col: '2 / 3', row: '1 / 2', r: '999px' },
  { col: '3 / 4', row: '1 / 2', r: '999px 999px 999px 999px' },
  { col: '1 / 2', row: '2 / 4', r: '999px' },
  { col: '2 / 3', row: '2 / 3', r: '50%' },
  { col: '3 / 4', row: '2 / 3', r: '50%' },
  { col: '2 / 3', row: '3 / 5', r: '999px' },
  { col: '3 / 4', row: '3 / 5', r: '999px' },
  { col: '1 / 2', row: '4 / 5', r: '999px' },
];

export default function ElectionSelector() {
  return (
    <div className="min-h-screen bg-tv-ink font-tv text-tv-ink flex flex-col lg:flex-row" style={brandCssVars(brand) as React.CSSProperties}>
      <section className="bg-tv-paper lg:w-[56%] lg:rounded-r-[48px] rounded-b-[36px] lg:rounded-bl-none px-6 py-10 sm:px-14 lg:px-20 flex flex-col justify-center gap-10">
        <div className="flex items-center gap-5 text-tv-accent">
          <TargetMark size={84} />
          <h1 className="text-[56px] sm:text-[84px] font-black leading-none tracking-tight">ELEIÇÕES</h1>
        </div>
        <p className="text-xl sm:text-2xl font-medium max-w-xl text-tv-ink/80">
          Cobertura {brand.name} das eleições legislativas de Haagar. Escolha o pleito:
        </p>

        <div className="grid gap-5 max-w-2xl">
          <Link href="/2026" className="group rounded-[32px] bg-tv-accent text-white p-7 sm:p-8 flex items-center justify-between gap-6 transition-transform hover:-translate-y-0.5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold tracking-wider">
                <span className="w-2 h-2 rounded-full bg-white tv-pulse" /> AO VIVO
              </div>
              <div className="text-[64px] font-black leading-none mt-3">2026</div>
              <div className="text-lg font-medium mt-2 text-white/85">Telão interativo da apuração · comparação distrito a distrito com 2022</div>
            </div>
            <span className="text-5xl font-light transition-transform group-hover:translate-x-1">→</span>
          </Link>

          <Link href="/2022" className="group rounded-[32px] border-[3px] border-tv-ink/15 p-7 sm:p-8 flex items-center justify-between gap-6 hover:border-tv-accent transition-colors">
            <div>
              <div className="inline-flex rounded-full bg-tv-ink/10 px-3 py-1 text-sm font-extrabold tracking-wider">ARQUIVO</div>
              <div className="text-[64px] font-black leading-none mt-3">2022</div>
              <div className="text-lg font-medium mt-2 text-tv-ink/70">Resultados oficiais a partir da planilha · mapa, estados, distritos e balanço de poder</div>
            </div>
            <span className="text-5xl font-light text-tv-accent transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>
      </section>

      <section className="flex-1 p-6 lg:p-8 min-h-[320px]" aria-hidden>
        <div className="h-full grid grid-cols-[0.8fr_1fr_1fr] grid-rows-4 gap-2">
          {PILLS.map((p, i) => (
            <div key={i} className="bg-tv-accent" style={{ gridColumn: p.col, gridRow: p.row, borderRadius: p.r }} />
          ))}
        </div>
      </section>
    </div>
  );
}
