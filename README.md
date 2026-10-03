# Smartv Eleições · Haagar

Painéis de apuração das eleições legislativas (fictícias) de **Haagar**, cobertura **Smartv / SmartvNews**.

| Rota | O que é |
|---|---|
| `/` | Seleção do pleito |
| `/2022` (+ `/estado/[uf]`, `/distrito/[id]`, `/nacional`, `/nacional/parlamento`, `/ganhos-e-perdas`) | Painel 2022 — dados do Google Sheets (visual original) |
| `/2026` | **Telão interativo 2026** (16:9, pensado para TV/touch) |
| `/2026/controle` | Controle do ritmo da apuração (operador; não é linkado no telão) |

## Rodando

```bash
npm install
npm run dev            # desenvolvimento
npm run build && npm start   # produção (recomendado no dia do programa)
```

Variáveis de ambiente (as mesmas de 2022):

```
GOOGLE_SHEETS_CLIENT_EMAIL=...
GOOGLE_SHEETS_PRIVATE_KEY=...
GOOGLE_SHEET_ID=...
CONTROL_PIN=1234                 # opcional: exige PIN para comandar a apuração
NEXT_PUBLIC_CONTROL_MODE=local   # opcional: ver "Sincronização"
```

## Telão 2026

Cenas (navegação no topo, tudo clicável/tocável):

- **Visão geral** — mapa hexagonal (modos 2026, 2022, viradas, swing por frente e % apurado), corrida pela maioria e projeção de cadeiras por frente com saldo vs 2022.
- **Parlamento** — hemiciclo 2026 (confirmadas × projeção), simulador de coalizão e câmara de 2022.
- **Estados** — mapa do estado, voto proporcional 2026 × 2022, bancada distrital + proporcional.
- **Distrito** — candidatos, status (manteve / ganhou / liderando), variação de cada frente vs 2022, margem, comparecimento, swing.
- **Viradas** — matriz "de quem para quem", saldo por frente, viradas confirmadas e em andamento.
- **2022 × 2026** — dispersão distrito a distrito (votação da frente, comparecimento, margem) e maiores avanços/quedas.

Extras: tarja inferior com hora e feed, plantão de **última hora** automático (cadeira que vira, maioria atingida) e rotação automática de cenas.

Atalhos discretos: **C** (ou segurar o logo por 1 s) abre o controle; **F** tela cheia; **Esc** fecha. O botão de dois pontinhos no canto inferior direito alterna Smartv ⇄ SmartvNews.

### Como os dados de 2026 são gerados

Tudo em JavaScript, no navegador (`lib/haagar2026/model.ts`):

1. A base é o **resultado final de 2022** lido da planilha (`/api/baseline/2022`, aba 100%). Sem acesso à planilha, usa uma estimativa a partir de `lib/previousElectionData.ts`.
2. A partir de uma **semente**, sorteia swings nacional, estadual e local por frente e o resultado final de cada distrito. Candidatos de 2022 podem concorrer de novo (o deputado eleito aparece como tal).
3. Cada distrito apura num ritmo próprio e os primeiros votos têm um viés que some até o fim — há viradas durante a noite.
4. As regras são as de 2022: distrital por maioria simples; proporcional por estado com mínimo de votos, barreira de 5% e D'Hondt.

A mesma semente + o mesmo % global = o mesmo resultado em qualquer tela.

### Controle da apuração

Iniciar/pausar, ritmo (pontos % por minuto, com presets), saltos (+1/+5/+10, 100%), barra de progresso, **segurar um estado** num ponto enquanto o país avança, mandar uma cena para o telão, rotação automática, marca e cenário (semente).

### Sincronização

- Padrão: estado guardado no servidor (`/api/2026/control`) — telão e controle podem estar em **computadores diferentes**. Ideal com `npm start` numa máquina.
- Hospedagem serverless (ex.: Vercel) não compartilha memória entre instâncias: defina `NEXT_PUBLIC_CONTROL_MODE=local` e use o controle no **mesmo computador** do telão (outra janela/aba ou a gaveta da tecla C).

## Marcas (cores, fonte e logo)

Tudo em **`lib/brand.ts`**: cada marca define logo, cores, caixa dos títulos e grafismo de fundo. Os componentes do telão só usam as variáveis `tv-*` (Tailwind) geradas a partir dali.

Fonte: **Posterama** (comercial). Coloque os `.woff2` em `public/fonts/posterama/` (nomes em `app/globals.css` e no `LEIA-ME.txt` da pasta). Sem eles, o telão usa a Outfit.
