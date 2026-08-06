# Liggo — DESIGN.md

> Direção: **Premium / Fintech**. Referências de atmosfera (não de cor): Stripe, Revolut, Nubank. Liggo lida com reserva de quadra E dinheiro (split de pagamento) — o app precisa parecer tão confiável quanto um app de banco, sem perder a identidade esportiva que já existe (o verde).
>
> Escopo: telas do jogador (tabs, login/cadastro, arena, reserva/split) e a página web de split. Telas de `admin/*` e `owner/*` estão fora de escopo — serão removidas do produto.

---

## 1. Atmosfera visual

Liggo é sério sobre duas coisas: o jogo e o dinheiro dos seus usuários. A tela não deve parecer um app de delivery com banners piscando — deve parecer um extrato bancário bem desenhado que também é divertido de usar.

Isso significa: base quase monocromática (branco, preto suave, cinzas neutros — **não** cinza-azulado tipo Tailwind Slate, que compete visualmente com o verde de marca), com o verde aparecendo só onde importa: ação primária, preço, confirmação. Nada de gradiente decorativo em banner, nada de emoji como "arte". Espaço em branco generoso, sombras quase imperceptíveis em vez de bordas grossas, números sempre alinhados e fáceis de comparar (tabular).

**Características-chave:**
- Neutros verdadeiros (zinc), não azulados — o verde de marca fica sozinho como cor, sem disputar com um cinza puxado pro azul.
- Um verde só, usado com disciplina: 1 ação primária e 1 destaque de preço por tela, no máximo.
- Radius consistente e um pouco mais contido que hoje (nada de 24px em card pequeno).
- Sombra "de verdade" (elevação sutil), não borda de 1px fingindo profundidade.
- Números de preço em fonte com números tabulares — dois valores lado a lado sempre alinham.
- Zero emoji como decoração/ícone nas telas do jogador. Ícones vêm de `lucide-react-native` (já em uso).

---

## 2. Paleta de cores & papéis

### Modo claro (ativo hoje)

| Token | Valor | Papel |
|---|---|---|
| `background` | `#FAFAFA` | Fundo de tela |
| `surface` | `#FFFFFF` | Cards, inputs |
| `surfaceHighlight` | `#F4F4F5` | Estado hover/pressed, fundo de badge neutro |
| `border` | `#E4E4E7` | Divisórias, contorno de card |
| `text` | `#18181B` | Texto principal (quase preto, neutro — não `#0F172A` azulado) |
| `textMuted` | `#71717A` | Texto secundário |
| `textDim` | `#A1A1AA` | Texto terciário, placeholder |
| `primary` | `#00B341` | Verde de marca (refinado do `#00C853` atual — menos "Material Design genérico", mais próprio) |
| `primaryHover` | `#009938` | Estado pressed do primary |
| `primaryDim` | `rgba(0,179,65,0.12)` | Fundo de badge/chip sobre o verde |
| `danger` | `#E5484D` | Erros, exclusão |
| `dangerDim` | `rgba(229,72,77,0.12)` | Fundo de badge de erro |
| `warning` | `#F5A623` | Avisos (mais âmbar, menos "amarelo de trânsito" que o `#FFCC00` atual) |
| `success` | `#00B341` (= `primary`) | Confirmação — reaproveita o verde, não introduz uma 2ª cor de "sucesso" |

### Modo escuro (arquitetura pronta, **não ativado** nesta reforma)

| Token | Valor |
|---|---|
| `background` | `#0B0F0D` |
| `surface` | `#17181A` |
| `surfaceHighlight` | `#212224` |
| `border` | `#2A2C2E` |
| `text` | `#FAFAFA` |
| `textMuted` | `#A1A1AA` |
| `textDim` | `#71717A` |
| `primary` | `#00D64F` (levemente mais claro/saturado — precisa de mais contraste sobre fundo escuro) |
| `primaryHover` | `#00E858` |
| `primaryDim` | `rgba(0,214,79,0.16)` |
| `danger` | `#FF6369` |
| `warning` | `#FFB84D` |

`theme.ts` deve estruturar isso como `Theme.light` / `Theme.dark`, mas o app só consome `Theme.light` por enquanto (sem toggle, sem `useColorScheme`).

---

## 3. Tipografia

Par de fontes (via `@expo-google-fonts/*`, carregadas com `useFonts` em `app/_layout.tsx`):
- **Display/títulos**: `Manrope` (700/800) — geométrica, confiante, dá personalidade de marca sem parecer "fonte de sistema".
- **Corpo/dados**: `Inter` (400/500/600) — altíssima legibilidade em tamanho pequeno, números tabulares nativos (essencial pra preço em BRL).

| Papel | Fonte | Tamanho | Peso | Tracking |
|---|---|---|---|---|
| `h1` | Manrope | 32 | 800 | -0.5px |
| `h2` | Manrope | 24 | 700 | -0.3px |
| `h3` | Manrope | 20 | 600 | -0.2px |
| `body` | Inter | 16 | 400 | normal |
| `bodySemibold` | Inter | 16 | 600 | normal |
| `caption` | Inter | 14 | 400 | normal |
| `captionSemibold` | Inter | 14 | 600 | normal |
| `small` | Inter | 12 | 500 | normal |
| `price` (novo) | Inter, `fontVariant: ['tabular-nums']` | 18–32 conforme contexto | 700 | normal |

Regra: qualquer valor monetário (`brl()`) usa o estilo `price`, nunca `body`/`h2` genérico — garante alinhamento visual entre valores na mesma tela (ex.: lista de cotas do split).

---

## 4. Espaçamento & Radius

Espaçamento (`Theme.spacing`) permanece: `4 / 8 / 16 / 24 / 32 / 48` — já é uma escala razoável, mantida.

Radius (`Theme.radius`) consolidado — substitui a mistura atual de 8/12/16/24 no tema + 12/14/18 soltos hardcoded nas telas:

| Token | Valor | Uso |
|---|---|---|
| `xs` | 6 | Badges pequenos, chips |
| `sm` | 10 | Inputs, botões pequenos |
| `md` | 14 | Cards, botões padrão |
| `lg` | 20 | Cards grandes, folhas/modais |
| `full` | 9999 | Pílulas, avatares |

Nenhum `borderRadius` deve aparecer hardcoded em uma tela — sempre `Theme.radius.*`.

---

## 5. Profundidade & Elevação

Hoje não existe token de sombra formal (Card usa sombra "informal"). Novo `Theme.shadow`:

| Token | shadowColor | shadowOpacity | shadowRadius | offset | elevation (Android) |
|---|---|---|---|---|---|
| `flat` | — | 0 | 0 | `{0,0}` | 0 |
| `raised` | `#18181B` | 0.06 | 12 | `{0,4}` | 2 |
| `overlay` | `#18181B` | 0.12 | 24 | `{0,12}` | 8 |

`raised` é o padrão pra `Card`; `overlay` é pra folhas/modais/dropdowns (ex.: seletor de método de pagamento). Nunca usar `borderWidth` sozinho pra simular elevação — combinar com `raised` quando fizer sentido.

---

## 6. Motion

Formaliza o que `Button`/`Card` já fazem via `react-native-reanimated`:

| Token | Valor | Uso |
|---|---|---|
| `fast` | 120ms | Feedback de toque (scale/opacity) |
| `base` | 200ms | Transições de estado (skeleton→conteúdo, abrir/fechar) |
| `slow` | 320ms | Entradas de tela, folhas modais |
| `springPress` | `{ damping: 15, stiffness: 300 }` | Spring de press-in/out do Button (já em uso — só nomear) |

---

## 7. Emoji & ilustração

**Política**: emoji removido como decoração/ícone em todas as telas do jogador (banners, badges, tab bar, mensagens de estado). Substituir por:
- Ícone `lucide-react-native` (já é o padrão nas tabs do jogador) quando o emoji fazia papel de ícone.
- Texto simples ou foto/ilustração real quando o emoji fazia papel de "arte" (ex.: banner de promoção).

Não se aplica a `admin/*`/`owner/*` (fora de escopo) nem a copy/mensagens de WhatsApp fora do app.

---

## 8. Componentes

- **Button** (`components/Button.tsx`): manter variantes atuais (`primary/secondary/outline/ghost/danger`) e a animação de press — só migrar cores/radius/sombra pros tokens novos. Texto do botão primário usa `text` neutro sobre fundo verde (contraste maior que o `background` claro usado hoje) — verificar contraste ao aplicar.
- **Card** (`components/Card.tsx`): migrar sombra informal → `Theme.shadow.raised`, radius → `Theme.radius.md`/`lg` conforme tamanho.
- **Skeleton** (`components/Skeleton.tsx`): sem mudança estrutural, só tokens de cor.
- Novo token de preço (`Theme.typography.price`) deve ser adotado por qualquer lugar que renderiza `brl(...)`.

---

## 9. Do's and Don'ts

**Faça:**
- Use `Theme.*` sempre — nenhuma cor hex solta em uma tela.
- Um verde, uma ação primária por tela.
- Números de preço alinhados com `price` (tabular).
- Ícone Lucide no lugar de qualquer emoji removido.

**Evite:**
- Gradiente decorativo em banner (era o padrão antigo — a nova direção é flat + foto/ícone).
- Mais de 1 badge colorido "gritando" na mesma tela.
- Radius fora da escala (`6/10/14/20/9999`) — nada de 12, 18 soltos.
- Emoji como ícone de navegação ou estado (tab bar, alertas).

---

## 10. Guia rápido (para quem for implementar)

1. `theme.ts` é a única fonte — `Theme.light` ativo, `Theme.dark` definido mas não usado ainda.
2. Fonte carregada via `useFonts` (`@expo-google-fonts/manrope`, `@expo-google-fonts/inter`) em `app/_layout.tsx`, com tela de loading até carregar (evita flash de texto sem estilo).
3. O export legado `C` (shorthand antigo) é removido — qualquer import quebrado é uma tela pendente de migração.
4. Ordem de aplicação sugerida: `Button`/`Card`/`Skeleton` primeiro (base), depois telas que já usam `Theme` (refino), depois as que usam `C` (migração completa), por último a home/explore (redesenho do banner).
