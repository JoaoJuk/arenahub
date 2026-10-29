# Liggo — DESIGN.md

> Design system: **Liggo Kinetic**
> Categoria: reserva de quadra + split de pagamento (marketplace esportivo)
> Direção: alto contraste moderno — preto profundo, branco amplo, verde neon. Enérgico como
> app de esporte, preciso como app de banco.
>
> Fonte de verdade da implementação: `apps/mobile/src/theme.ts`.
> Origem visual: projeto Stitch **Liggo Premium Sports Redesign** (`3960189824903170909`).
>
> **Escopo**: telas do jogador (tabs, login/cadastro, arena, reserva/split) e a página web de
> split. `admin/*` e `owner/*` estão **fora de escopo** — serão removidas do produto e são as
> únicas consumidoras do alias legado `C` em `theme.ts`.

---

## 1. Atmosfera visual

Liggo é sério sobre duas coisas: o jogo e o dinheiro dos seus usuários. A tela precisa parecer
rápida e "elétrica" como uma partida ao vivo, sem nunca parecer frágil na hora de dividir uma
conta entre oito pessoas.

O sistema vive da tensão entre três coisas: **branco amplo** (a clareza do Airbnb, necessária
porque a tela mostra valores e cotas), **preto profundo** (a âncora tipográfica do Spotify, que
faz o app parecer premium em vez de infantil) e um **verde neon vibrante** que aparece só onde há
ação. É um sistema de "objeto grande": raios generosos, alvos de toque folgados, pensado pra
quem está com a mão suada, no sol, dentro de uma arena.

**Características-chave:**
- Base quase monocromática com neutros verdadeiros — nada de cinza puxado pro azul, que
  competiria com o verde de marca.
- **Dois verdes com papéis distintos** (§2). Essa é a regra mais importante do sistema.
- Raio grande e consistente: 24px em card, 16px em botão/input, pílula em chip.
- Profundidade por sombra difusa (`0 10px 30px rgba(0,0,0,.05)`), nunca por borda grossa.
- Números de preço sempre tabulares — dois valores lado a lado sempre alinham.
- Zero emoji como decoração ou ícone nas telas do jogador. Ícones vêm de `lucide-react-native`.

---

## 2. Paleta de cores & papéis

### Os dois verdes — leia antes de usar verde em qualquer lugar

O neon `#39FF14` tem contraste de ~1.4:1 sobre branco. Como texto sobre fundo claro ele é
ilegível. O sistema resolve isso separando os papéis:

| Papel | Token | Valor | Onde usar |
|---|---|---|---|
| Verde de **texto e ícone** sobre fundo claro | `primary` | `#106E00` | Wordmark "Liggo", "4 vagas", links, ícone de check |
| Verde de **preenchimento** | `accent` | `#39FF14` | CTA primário, pílula da aba ativa, badge, barra de progresso, borda de item selecionado |
| Verde neon como **texto sobre preto** | `accent` | `#39FF14` | Dia/horário selecionado, "Confirmada" sobre scrim, ícone do card "Pro" |
| Texto **sobre** o neon | `onAccent` | `#1A1C1C` | Label do botão primário. Nunca branco. |
| Pressed do neon | `accentPressed` | `#2ED610` | — |

> Regra: **`accent` nunca é cor de texto sobre `background`/`surface`.** Se o fundo é claro e o
> elemento é texto, o verde é `primary`.

### Modo claro (ativo hoje)

| Token | Valor | Papel |
|---|---|---|
| `background` | `#F9F9F9` | Fundo de tela |
| `surface` | `#FFFFFF` | Card, folha, header |
| `surfaceGray` | `#F4F4F4` | Input, chip neutro, card secundário |
| `surfaceHigh` | `#E8E8E8` | Tile de ícone, avatar vazio, trilho de progresso |
| `border` | `#E5E5E5` | Divisória, contorno sutil |
| `inverse` | `#1A1C1C` | Superfície preta: chip/dia/horário selecionado, card "Jogador Pro" |
| `text` | `#1A1C1C` | Texto principal |
| `textMuted` | `#5E5E5E` | Texto secundário |
| `textDim` | `#A0A0A0` | Terciário, placeholder |
| `onInverse` | `#FFFFFF` | Texto sobre superfície preta |
| `onPhoto` / `onPhotoMuted` | `#FAFAFA` / 72% | Texto sobre foto com scrim |
| `danger` | `#FF3B30` | Erro, cancelamento |
| `warning` | `#FFCC00` | Pendente **como preenchimento** (badge, faixa de status) |
| `warningText` | `#8A6D00` | Pendente **como texto** sobre fundo claro (o amarelo puro some) |
| `success` | `#106E00` | Confirmação **como texto** |
| `successFill` | `#39FF14` | Confirmação **como preenchimento** (= `accent`) |
| `scrim` / `scrimStrong` | 55% / 80% | Véu sobre foto / fundo de modal |
| `glass` | branco 22% | Botão sobre foto (voltar, favoritar) |

### Modo escuro (ativo)

Os dois temas são completos e trocáveis em Perfil → Configurações → Aparência. Por padrão o
app segue o tema do aparelho até o usuário escolher um à mão; a escolha fica gravada no
dispositivo. Valores lidos das telas "Dark Kinetic (v2)" do Stitch:

| Token | Valor | Nota |
|---|---|---|
| `background` | `#000000` | Preto puro, como nas telas do Stitch |
| `surface` | `#18181B` | zinc-900 — card, folha, header |
| `surfaceGray` | `#27272A` | zinc-800 — input, chip, card secundário |
| `surfaceHigh` | `#3F3F46` | zinc-700 |
| `border` | `#27272A` | zinc-800 |
| `inverse` | `#FFFFFF` | o oposto do fundo vira branco de verdade |
| `text` / `textMuted` / `textDim` | `#FFFFFF` / `#A1A1AA` / `#71717A` | zinc-400 / zinc-500 |
| `primary` | `#39FF14` | os dois verdes colapsam: sobre preto o neon lê a 13:1 |
| `selected` / `onSelected` | `#39FF14` / `#000000` | invertido em relação ao claro |
| `contrast` | `#27272A` | sobe um degrau em vez de virar branco |
| `danger` | `#FF6B60` | `#FF3B30` fica pesado sobre preto |

**Três papéis parecidos que não se misturam** (o erro fácil deste sistema):

| Papel | Onde | Claro | Escuro |
|---|---|---|---|
| `inverse` | aba/chip selecionado, botão de filtro | preto | **branco** |
| `selected` | data / horário / quadra escolhidos | preto c/ texto neon | **neon c/ texto preto** |
| `contrast` | card "Jogador Pro", botão escuro | preto | **zinc-800** |

### Como a troca funciona (para quem for mexer)

`StyleSheet.create` no escopo do módulo congela as cores no primeiro import e a troca de tema
não teria efeito nenhum. Por isso **toda folha de estilo do app é uma factory**:

```ts
const styles = (c: Colors) => StyleSheet.create({ wrap: { backgroundColor: c.background } });
// dentro do componente:
const c = useColors();
const s = useStyles(styles);
```

Nada importa uma paleta direto — sempre `useColors()`. `Theme.colors` continua existindo, mas
só serve ao alias legado `C` e às telas de `admin/*` e `owner/*`, que estão fora de escopo e
seguem sempre claras.

### Orçamento de cor por tela

Neutros 70–90% dos pixels · `accent` 5–10% · semânticas 0–5%.
**No máximo 2 usos visíveis do `accent` por tela** (tipicamente: 1 aba ativa + 1 CTA).

---

## 3. Tipografia

**Inter exclusivamente** — título, corpo e label. Carregada via `@expo-google-fonts/inter` com
`useFonts` em `app/_layout.tsx`, nos pesos 400 / 500 / 600 / 700 / 800.

| Papel | Peso | Tamanho / linha | Tracking |
|---|---|---|---|
| `display` | 800 | 48 / 56 | −0.04em |
| `h1` | 700 | 28 / 34 | −0.02em |
| `h2` | 700 | 24 / 30 | −0.01em |
| `h3` | 700 | 20 / 26 | −0.01em |
| `bodyLg` | 400 | 18 / 28 | 0 |
| `body` | 400 | 16 / 24 | 0 |
| `bodySemibold` | 600 | 16 / 24 | 0 |
| `caption` | 400 | 14 / 20 | 0 |
| `captionSemibold` | 600 | 14 / 20 | 0 |
| `label` | 700 | 14 / 20 | 0 |
| `small` | 500 | 12 / 16 | 0 |
| `overline` | 700 | 12 / 16 | **+0.075em** (obrigatório em caixa alta) |
| `price` | 700 | conforme contexto | `fontVariant: ['tabular-nums']` |

Regras:
- `letterSpacing` no React Native é em **px**, não em `em`. Os tokens já trazem o valor
  convertido (−0.04em × 48 = −1.9).
- Caixa alta **sempre** com `overline` (ou tracking ≥ 0.06em). Sem exceção.
- Qualquer valor monetário (`brl()`) usa `price`, nunca `h2`/`body` genérico.
- Corpo nunca abaixo de 14. Sub-texto de linha de lista: 13 é o piso absoluto.

---

## 4. Espaçamento & Radius

`Theme.spacing`: `xs 4 · sm 8 · stack 12 · md/gutter 16 · margin 20 · lg 24 · xl 32 · section 40 · xxl 48`

- `margin` (20) é a margem horizontal padrão de tela.
- `section` (40) separa blocos distintos da mesma tela ("Rachas Abertos" ↔ "Arenas perto").
- `lg` (24) separa itens relacionados dentro de um bloco.

`Theme.radius`:

| Token | Valor | Uso |
|---|---|---|
| `xs` | 8 | Badge, tag sobre foto |
| `sm` | 12 | Chip, faixa interna de card |
| `md` | 16 | Botão, input, slot de horário, card de data |
| `lg` | 24 | Card (arena, racha, reserva, promo) |
| `xl` | 32 | Folha sobre a foto da arena, modal |
| `full` | 9999 | Pílula, avatar, CTA primário |

Nenhum `borderRadius` numérico deve aparecer em uma tela — sempre `Theme.radius.*`.

---

## 5. Profundidade & Elevação

| Token | Sombra | Uso |
|---|---|---|
| `flat` | — | Header, elementos colados no fundo |
| `raised` | `0 10px 30px rgba(0,0,0,.05)` | **Padrão de card.** É a "kinetic shadow" |
| `up` | `0 −10px 30px rgba(0,0,0,.05)` | Barra de abas, rodapé fixo |
| `overlay` | `0 12px 24px rgba(0,0,0,.12)` | Modal, folha |
| `glow` | `0 0 16px #39FF14 @55%` | **Só no estado pressionado** |

O `glow` é feedback de toque e não deve ficar permanente. **Única exceção**: a pílula da aba
ativa na barra inferior, onde o Stitch usa o brilho fixo como marcador de posição. No Android a
sombra colorida depende da API 28+; abaixo disso sobra o `scale` do press, que já basta.

Nunca usar `borderWidth` sozinho pra simular elevação.

---

## 6. Motion

| Token | Valor | Uso |
|---|---|---|
| `fast` | 120ms | Feedback de toque (scale/opacity/glow) |
| `base` | 200ms | Transição de estado, skeleton → conteúdo |
| `slow` | 320ms | Entrada de tela, folha modal |
| `springPress` | `{ damping: 15, stiffness: 300 }` | Press-in/out de `Button` |

Press padrão: `scale(0.96)` em botão, `scale(0.98)` em card, + `shadow.glow`.

---

## 7. Componentes

- **Button** — variantes `primary` (neon, pílula, 56px, texto `onAccent`), `dark` (fundo
  `inverse`, texto branco), `secondary`, `outline`, `ghost`, `glass` (sobre foto), `danger`.
  Tamanhos `sm/md/lg`. Ícone opcional à esquerda ou à direita.
- **Card** — `radius.lg` + `shadow.raised` por padrão; variantes `outline` e `flat`.
- **Chip** — pílula; selecionado = fundo `inverse` + texto branco.
- **StatusBadge** — Confirmada (`accent` sobre preto), Pendente (`warning`), Cancelada
  (`danger`), Finalizada (cinza).
- **ArenaCard** — foto 16:9 + scrim + nome sobre a foto + badge de nota em vidro no topo +
  rodapé com chips de esporte e preço "A partir de".
- **SplitProgress** — barra contínua (pago = `accent`, trilho = `border`) com a contagem
  embaixo: "N/M Pagos" à esquerda, "K Pendentes" à direita. Era segmentada, mas com 10+ cotas
  os segmentos ficavam finos demais para significar algo — quem dá o número é o rodapé.
- **Skeleton** — pulso 800ms sobre `surfaceGray`.

Estados obrigatórios em toda tela que carrega dados: **carregando, vazio, erro, preenchido,
extremo** (título de 200 caracteres, lista de 1 item, lista de 50).

---

## 8. Acessibilidade & toque

- Alvo de toque mínimo **48px**. Quando o elemento visual é menor, usar `hitSlop` — nunca
  aumentar o elemento e quebrar o layout.
- Texto sobre `accent` é sempre `#1A1C1C` (contraste ~13:1). Branco sobre neon **reprova**.
- Seleção nunca é comunicada só por cor: dia/horário/quadra selecionados mudam **fundo** (claro →
  preto), não apenas a borda.
- `maxFontSizeMultiplier` limitado a 1.6 nas telas com layout apertado (já aplicado em
  `arena/[id].tsx`).

---

## 9. Guia rápido (para quem for implementar)

1. `theme.ts` é a única fonte. Nenhum hex solto, nenhum `borderRadius` numérico numa tela.
2. Precisa de verde? Pergunte: **é texto sobre fundo claro?** → `primary` (`#106E00`).
   **É preenchimento, ou texto sobre preto?** → `accent` (`#39FF14`).
3. Um CTA primário por tela. Se aparecer um segundo botão neon, um dos dois vira `dark`.
4. Card = `radius.lg` + `shadow.raised`. Botão = `radius.full`. Input/slot = `radius.md`.
5. Preço = `Theme.typography.price`. Caixa alta = `Theme.typography.overline`.
6. Emoji não entra. Ícone é `lucide-react-native`.
7. Foto vem do app (`assets/banners/*`, `photoUrl` do seed, `assets/logo.png`) — não de
   gerador de imagem.
8. Dados que ainda não existem no backend (distância, comodidades) vivem **só** em
   `src/mocks/placeholders.ts`, marcados com `TODO`.

### Prompts de exemplo

> "Card de arena: foto 16:9 no topo com scrim de baixo pra cima (`from-black/80`), nome em `h2`
> branco e bairro em `caption` sobre a foto no canto inferior esquerdo, badge de nota
> `surface/90` com blur no canto superior direito, rodapé branco com chips de esporte à esquerda
> e 'A partir de R$ X/h' à direita. Raio 24, sombra `raised`, press `scale(0.98)` + `glow`."

> "Rodapé fixo de reserva: `surface`, raio 32 no topo, `shadow.up`, altura 90. À esquerda 'Total'
> em `small` `textMuted` sobre o valor em `price` 24. À direita botão `primary` pílula 56px
> com seta."
