// lib/brand.ts
// ---------------------------------------------------------------------------
// Temas de marca do telão 2026 e da página de seleção.
//
// Para trocar o visual (cores, fonte e logo) basta editar o objeto da marca
// abaixo. Nenhum componente usa cor fixa de marca: tudo lê estas variáveis.
//
//  • logo.kind = 'target'  → desenha o símbolo de alvo (círculos) + nome em texto
//    logo.kind = 'image'   → usa um arquivo em /public (ex.: /brands/smartvnews/logo.svg)
//  • fontFamily: pilha CSS da fonte. A fonte das marcas é a Posterama (comercial):
//    coloque os arquivos em /public/fonts/posterama/ (nomes em app/globals.css).
//    Enquanto não estiverem lá, cai para a Outfit (Google Fonts, desenho parecido).
//  • colors: hex. Viram variáveis CSS (--tv-*) usadas pelas classes Tailwind
//    `tv-*` (ver tailwind.config.ts).
// ---------------------------------------------------------------------------

export type BrandId = 'smartv' | 'smartvnews';

export type BrandLogo =
  | { kind: 'target'; wordmark: string }            // ◎ SMARTV  (alvo antes do nome)
  | { kind: 'superscript'; wordmark: string }       // news°     (alvo sobrescrito depois)
  | { kind: 'image'; src: string; height: number; alt: string };

export interface BrandTheme {
  id: BrandId;
  name: string;            // Nome da emissora
  logo: BrandLogo;
  programTitle: string;    // Título da cobertura (ex.: "Eleições")
  titleCase: 'upper' | 'lower' | 'none'; // Caixa do título da cobertura e das tarjas
  backdrop: 'arcs' | 'pills';             // Grafismo de fundo: arcos (Smartv) ou pílulas (News)
  fontFamily: string;      // Pilha CSS da fonte principal
  monoFontFamily: string;  // Pilha CSS da fonte numérica
  colors: {
    bg: string;            // Fundo do palco (escuro)
    bgGlow: string;        // Brilho do gradiente do fundo
    surface: string;       // Cartões
    surface2: string;      // Cartões elevados / hover
    border: string;        // Bordas e divisores
    text: string;          // Texto principal (sobre fundo escuro)
    muted: string;         // Texto secundário
    accent: string;        // Cor da marca
    accentText: string;    // Texto sobre a cor da marca
    accent2: string;       // Cor secundária (gradientes, selos, pílula de local)
    kicker: string;        // Destaque em texto sobre fundo escuro (rótulos pequenos)
    live: string;          // Indicador "AO VIVO"
    paper: string;         // Fundo claro (painéis claros, seleção de eleição)
    ink: string;           // Texto sobre fundo claro
  };
}

// Posterama (local, /public/fonts/posterama) com Outfit como reserva.
const BRAND_FONT = "'Posterama', var(--font-outfit)";

const SMARTV_COLORS: BrandTheme['colors'] = {
  bg: '#1c1213',
  bgGlow: '#6e1414',
  surface: '#2a1c1d',
  surface2: '#382627',
  border: '#4b3637',
  text: '#f6f4ef',
  muted: '#b8a8a5',
  accent: '#ff1a1a',
  accentText: '#ffffff',
  accent2: '#ff6a3d',
  kicker: '#ff3d3d',
  live: '#ff1a1a',
  paper: '#f6f4ef',
  ink: '#311f20',
};

export const BRANDS: Record<BrandId, BrandTheme> = {
  smartv: {
    id: 'smartv',
    name: 'Smartv',
    logo: { kind: 'target', wordmark: 'SMARTV' },
    programTitle: 'Eleições',
    titleCase: 'upper',
    backdrop: 'arcs',
    fontFamily: BRAND_FONT,
    monoFontFamily: 'var(--font-jetbrains)',
    colors: SMARTV_COLORS,
  },
  // SmartvNews: azul royal, marinho e azul-céu; wordmark "news°" em caixa baixa.
  smartvnews: {
    id: 'smartvnews',
    name: 'SmartvNews',
    logo: { kind: 'superscript', wordmark: 'news' },
    programTitle: 'eleições',
    titleCase: 'lower',
    backdrop: 'pills',
    fontFamily: BRAND_FONT,
    monoFontFamily: 'var(--font-jetbrains)',
    colors: {
      bg: '#08083a',
      bgGlow: '#1212cc',
      surface: '#11114f',
      surface2: '#1b1b66',
      border: '#2c2d80',
      text: '#ffffff',
      muted: '#a9acd8',
      accent: '#1414d4',
      accentText: '#ffffff',
      accent2: '#1a9be8',
      kicker: '#4cc0ff',
      live: '#1a9be8',
      paper: '#e1e2e6',
      ink: '#10106b',
    },
  },
};

export const DEFAULT_BRAND: BrandId = 'smartv';

const hexToRgbTriplet = (hex: string): string => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

/** Variáveis CSS a aplicar no elemento raiz do telão / páginas de marca. */
export function brandCssVars(brand: BrandTheme): Record<string, string> {
  const vars: Record<string, string> = {
    '--tv-font': brand.fontFamily,
    '--tv-mono': brand.monoFontFamily,
  };
  Object.entries(brand.colors).forEach(([key, hex]) => {
    const cssKey = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
    vars[`--tv-${cssKey}`] = hexToRgbTriplet(hex);
  });
  return vars;
}
