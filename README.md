# Smartv Eleições · Haagar

Painéis de apuração das eleições legislativas (fictícias) de **Haagar**, cobertura **Smartv / SmartvNews**.

| Rota | O que é |
|---|---|
| `/` | Seleção do pleito |
| `/2022` (+ `/estado/[uf]`, `/distrito/[id]`, `/nacional`, `/nacional/parlamento`, `/ganhos-e-perdas`) | Painel 2022 — dados do Google Sheets ou, sem ele, o resultado oficial embutido (visual original) |
| `/2026` | **Telão interativo 2026** (16:9, pensado para TV/touch) |
| `/2026/controle` | Controle do ritmo da apuração (operador; não é linkado no telão) |
| `/2026/cenario` | **Montar cenário**: ajustar a votação de cada frente ou pedir uma distribuição de cadeiras, ver o resultado final e mandar para o controle |
| `/2026/cg` | **CG** para sobrepor ao vídeo: cadeiras por frente + faixa de distritos (fundo transparente; `?fundo=verde`/`azul`/`preto`/`cena`/`telao`) |
| `/2026/idle` | Vinheta de espera em tela cheia |

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
UPSTASH_REDIS_REST_URL=...       # obrigatório em hospedagem serverless (Vercel): ver "Sincronização"
UPSTASH_REDIS_REST_TOKEN=...     #   (ou KV_REST_API_URL / KV_REST_API_TOKEN do Vercel KV)
NEXT_PUBLIC_CONTROL_MODE=local   # opcional: ver "Sincronização"
GENERATED_PHOTOS_API_KEY=...     # opcional: rostos gerados para candidatos de 2026 sem foto
```

## Telão 2026

Cenas (navegação no topo, tudo clicável/tocável):

- **Visão geral** — mapa hexagonal (modos 2026, 2022, viradas, swing por frente e % apurado; botão **Expandir** deixa só o mapa, com o nome dos distritos), corrida pela maioria (passe o mouse/toque na faixa fina para ver o Parlamento atual, eleito em 2022) e projeção de cadeiras por frente com saldo vs 2022.
- **Parlamento** — hemiciclo 2026 (confirmadas × projeção), simulador de coalizão e parlamento de 2022.
- **Proporcional** — as 93 cadeiras proporcionais: garantidas (cheias) × projetadas (contorno, ainda podem mudar), % por frente vs 2022 e um cartão por estado.
- **Estados** — mapa do estado, voto proporcional 2026 × 2022 com as cadeiras garantidas/projetadas, bancada distrital + proporcional.
- **Distrito** — candidatos (com selos de deputado atual e partido incumbente), status (manteve / ganhou / liderando), deputado atual, histórico 2018 · 2022 · 2026 por frente (com o voto proporcional estimado no distrito), margem e votos válidos.
- **Viradas** — matriz "de quem para quem", saldo por frente, viradas confirmadas e em andamento.
- **2022 × 2026** — dispersão distrito a distrito (votação da frente e margem) e maiores avanços/quedas.

Extras: tarja inferior com hora e feed, plantão de **última hora** automático (cadeira que vira, maioria atingida) e rotação automática de cenas.

Vinheta de espera (idle): Smartv com a grade de pílulas deslizando; SmartvNews com os três cartões e gradientes em movimento lento. Abre pela cena "Vinheta (idle)" no controle, pela tecla **I** ou em `/2026/idle`; tocar na tela volta à visão geral.

### CG

`/2026/cg` segue a marca escolhida no controle. Na seção **"CG · texto livre"** o operador escreve uma manchete (bloco em gradiente com duas linhas, manchete e subtítulo) e coloca/tira do ar; enquanto o texto está no ar, ele ocupa o lugar da tarja de cadeiras. Na seção **"CG · distrito"** o operador busca um distrito e coloca no ar a **tarja de distrito**: estado, % apurado, líder e 2º colocado com foto, frente, % e votos, vantagem e a situação (lidera, muito próximo, mantém, toma do X, pode tomar do X), com as marcas de deputado atual/partido incumbente.

**Urgência (automático, seção "CG · urgência")**: cada distrito que é **definido** entra sozinho no CG por **15 s**; se vários saem juntos, entram em fila, um depois do outro. O plantão de **última hora** (maioria atingida; viradas, quando os resultados automáticos estão desligados) também entra sozinho. A urgência **passa por cima de qualquer outra tarja** (cadeiras, texto livre, distrito). O CG detecta tudo sozinho, sem depender do telão estar aberto. Botões **Pular atual** e **Limpar fila** no controle.

**Tarja de maioria**: quando uma frente atinge a maioria, entra sozinha (como urgência, 15 s) uma tarja na cor da frente: "X forma a maioria", com o nome da frente e as cadeiras. No controle (seção "CG"), o botão **Tarja de maioria** coloca essa tarja no ar quando quiser; antes da maioria confirmada ela mostra "X projeta maioria". Se ninguém chega à maioria, o mesmo botão mostra a tarja **sem maioria**: "X lidera, mas não forma maioria", com a divisão das cadeiras e quantas faltam ao líder — "Eleição indefinida" durante a apuração e "Governo de minoria" com tudo apurado. **Tarja do proporcional** (seção "CG · proporcional"): cadeiras proporcionais projetadas por frente, quantas já estão garantidas (✓) e o % — de Haagar, de um estado ou em **rodízio** (nacional + estados, 8 s cada). Nas caixas de cadeiras, cada frente mostra quantas são distritais e quantas proporcionais.

Pelo controle (seção "CG") o operador liga/desliga as caixas de cadeiras, a faixa de distritos e o selo/logo, e escolhe contar **eleitos** ou **projeção**. Use como fonte de navegador no OBS/vMix (fundo transparente) ou com chroma (`?fundo=verde`). Com `?fundo=telao`, o CG mostra o telão (a cena que está aberta em `/2026` agora) reduzido dentro de uma moldura de TV, acima das tarjas.

Atalhos discretos: **C** (ou segurar o logo por 1 s) abre o controle; **F** tela cheia; **Esc** fecha. A troca de emissora (Smartv ⇄ SmartvNews) fica no painel de controle.

### Como os dados de 2026 são gerados

Tudo em JavaScript, no navegador (`lib/haagar2026/model.ts`):

1. A base é o **resultado final de 2022** (`/api/baseline/2022`): votos de cada candidato por distrito e votos proporcionais por frente em cada estado. Fonte, em ordem: planilha online (aba `_100`), se configurada → resultado oficial embutido em `lib/data/haagar2022.json` (exportado da `BASE_Haagar_Vota_2022.xlsx`, com nomes, fotos e gênero) → estimativa a partir de `lib/previousElectionData.ts`.
2. A partir de uma **semente**, sorteia swings nacional, estadual e local por frente e o resultado final de cada distrito. Candidatos de 2022 podem concorrer de novo (o deputado eleito aparece como tal).
3. Cada distrito apura num ritmo próprio e os primeiros votos têm um viés que some até o fim — há viradas durante a noite.
4. As regras são as de 2022: distrital por maioria simples; proporcional por estado com mínimo de votos, barreira de 5% e D'Hondt.
5. **Cenário do operador** (`/2026/cenario`): por padrão a TDS quase sempre vence (partiu de 106 cadeiras em 2022). Na tela de cenário o operador soma pontos percentuais à votação de cada frente em todo o país — ou digita a meta de cadeiras e o sistema ajusta a votação até chegar nela (em geral exata ou a 1–2 cadeiras) — e vê o resultado final antes de mandar para o controle. O cenário vira um código (`2026:UNI+10.7,TDS-8.3,...`) que pode ser copiado e colado na seção "Cenário" do controle; a semente continua decidindo os detalhes (candidatos, viradas, ritmo).
6. **Comparecimento**: em 2022, a planilha soma ~100% dos eleitores (até 113%); enquanto ela não é corrigida, cada distrito perde de 9 a 12 pontos (`lib/haagar/turnout2022.ts`), ficando entre 88% e 91% — vale para o telão e para o painel 2022, com planilha ou dados embutidos. Se a planilha for corrigida (comparecimento abaixo de 95%), o ajuste se desliga sozinho. Em 2026, cada estado fica entre 85% e 90%, e os distritos variam alguns pontos em volta.
7. O **proporcional anda com o distrital**: o voto proporcional de cada estado é 70% o voto distrital do estado e 30% a tendência do proporcional de 2022; durante a apuração ele acompanha o desvio das urnas já apuradas.
8. **Cadeiras proporcionais garantidas** vão sendo distribuídas durante a apuração: uma cadeira é garantida quando nem o pior cenário (todos os votos que faltam indo para as outras frentes, espalhados ou concentrados numa só) tira a cadeira da frente. Com metade dos votos apurados, cerca de 40% das 93 cadeiras já estão garantidas; o resto aparece como projeção e é rearranjado conforme os votos chegam.

Fotos: quem concorreu em 2022 usa a foto da planilha. Os demais (candidatos novos ou sem foto) recebem um rosto do [generated.photos](https://generated.photos) se `GENERATED_PHOTOS_API_KEY` estiver definida — coerente com o gênero, sem repetir e igual em todas as telas. Sem a chave, aparece um avatar com as iniciais. Atenção à licença do generated.photos para uso em TV.

A mesma semente + o mesmo % global = o mesmo resultado em qualquer tela.

### Controle da apuração

Iniciar/pausar, ritmo (pontos % por minuto, com presets), saltos (+1/+5/+10, 100%), barra de progresso, **segurar um estado** num ponto enquanto o país avança, mandar uma cena para o telão, rotação automática, marca e cenário (semente).

### Sincronização

Telão, CG e controle leem o mesmo estado em `/api/2026/control` — podem estar em **computadores diferentes**. O selo no topo do controle mostra onde ele está guardado:

- **SERVIDOR · REDIS** — recomendado. Crie um banco gratuito no [Upstash](https://upstash.com) (ou Vercel KV / Upstash pelo Marketplace da Vercel) e defina `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`. Funciona em qualquer hospedagem.
- **SERVIDOR · MEMÓRIA** — sem Redis, fica na memória do processo. Ok com `npm start` numa máquina; em hospedagem serverless (Vercel) cada instância tem a sua memória e os comandos podem demorar a aparecer em outras telas.
- **LOCAL** — `NEXT_PUBLIC_CONTROL_MODE=local`: sincroniza só janelas do mesmo computador.

## Marcas (cores, fonte e logo)

Tudo em **`lib/brand.ts`**: cada marca define logo, cores, caixa dos títulos e grafismo de fundo. Os componentes do telão só usam as variáveis `tv-*` (Tailwind) geradas a partir dali.

Fonte: **Posterama Text** (comercial), em `public/fonts/posterama/`: Thin, Regular, Bold e Black (W01/W07, com acentos). Os pesos que faltam usam o arquivo mais próximo (faixas no `@font-face` de `app/globals.css`); o SemiBold "W15" do pacote não tem os acentos do português e não é usado. Detalhes no `LEIA-ME.txt` da pasta. Sem os arquivos, o telão usa a Outfit.

Logos: em `public/brand/` — `smartv-eleicoes-branco.png` / `smartv-eleicoes-cor.png` (selo "◎ ELEIÇÕES" da Smartv) e `smartvnews-branco.png` ("news°"). Os brancos são usados como máscara, então podem ser pintados de qualquer cor; o colorido (com o til) entra em fundo claro. Para trocar, substitua o arquivo e ajuste `aspect` (largura/altura) em `lib/brand.ts`.
