// Tokens de marca — design system "Liggo Kinetic".
// Ver DESIGN.md na raiz do repo para a justificativa de cada valor.
//
// Os dois temas são completos e intercambiáveis. Nenhuma tela importa uma paleta
// direto: elas pedem a ativa com `useColors()` (src/theme-context.tsx), que é o
// que faz a troca claro↔escuro valer em tempo de execução.
//
// `Theme.colors` continua apontando para o claro só por causa do alias legado `C`
// e das telas de admin/owner, que estão fora de escopo e seguem sempre claras.

import type { TextStyle } from 'react-native';

const lightColors = {
  // ── Superfícies ────────────────────────────────────────────────────────────
  background: '#F9F9F9',
  surface: '#FFFFFF',
  surfaceGray: '#F4F4F4', // fundo de input, chip neutro, card secundário
  surfaceHigh: '#E8E8E8', // tile de ícone, avatar vazio, trilho de progresso
  border: '#E5E5E5',
  // "O oposto do fundo" — aba/chip selecionado, botão de filtro. No escuro isto
  // vira branco de verdade (é o que a tela Minhas Reservas do Stitch mostra).
  inverse: '#1A1C1C',

  // ── Texto ──────────────────────────────────────────────────────────────────
  text: '#1A1C1C',
  textMuted: '#5E5E5E',
  textDim: '#A0A0A0',
  onInverse: '#FFFFFF',
  onInverseMuted: 'rgba(255, 255, 255, 0.70)',

  // Texto sobre foto com scrim escuro (hero de arena, banners promocionais).
  // Mesmo valor em claro/escuro de propósito — o scrim já resolve o contraste,
  // não depende do tema do app.
  onPhoto: '#FAFAFA',
  onPhotoMuted: 'rgba(250, 250, 250, 0.72)',

  // ── Marca: DOIS verdes ─────────────────────────────────────────────────────
  // O Liggo Kinetic separa o verde de TEXTO do verde de PREENCHIMENTO. O neon
  // (#39FF14) tem contraste ~1.4:1 sobre branco — ilegível como texto. Por isso
  // ele só aparece como fundo (com texto preto em cima) ou como texto sobre preto.
  // Verde de texto/ícone sobre fundo claro: wordmark, "4 vagas", links.
  primary: '#106E00',
  primaryPressed: '#0A4A00',
  primaryDim: 'rgba(16, 110, 0, 0.10)',
  // Verde de preenchimento (CTA, pílula da aba ativa, badge, barra de progresso)
  // e de texto quando o fundo é preto (dia/horário selecionado, "Confirmada").
  accent: '#39FF14',
  accentPressed: '#2ED610',
  accentDim: 'rgba(57, 255, 20, 0.18)',
  onAccent: '#1A1C1C',

  // Item escolhido numa grade (data, horário, quadra). É papel próprio, não é
  // `inverse`: no claro é bloco preto com texto neon; no escuro o Stitch inverte
  // para bloco neon com texto preto. A borda é neon nos dois.
  selected: '#1A1C1C',
  onSelected: '#39FF14',

  // Bloco de alto contraste que não é seleção: card "Jogador Pro", botão escuro.
  // No escuro ele não pode virar branco — sobe um degrau de superfície.
  contrast: '#1A1C1C',
  onContrast: '#FFFFFF',

  // ── Semânticas ─────────────────────────────────────────────────────────────
  danger: '#FF3B30',
  dangerDim: 'rgba(255, 59, 48, 0.12)',
  warning: '#FFCC00', // como preenchimento (badge, faixa de status)
  // Âmbar escurecido para quando "pendente" precisa virar TEXTO sobre fundo
  // claro — o #FFCC00 puro fica em ~1.5:1 e some.
  warningText: '#8A6D00',
  warningDim: 'rgba(255, 204, 0, 0.16)',
  success: '#106E00', // como texto
  successFill: '#39FF14', // como preenchimento (= accent)

  // Véus escuros: `scrim` para controles sobre foto, `scrimStrong` para o fundo
  // de modal. Fora da escala de superfície porque não reagem ao tema.
  scrim: 'rgba(11, 15, 13, 0.55)',
  scrimStrong: 'rgba(11, 15, 13, 0.80)',
  glass: 'rgba(255, 255, 255, 0.22)', // botão sobre foto (voltar/favoritar)

  // ── Aliases de compatibilidade ─────────────────────────────────────────────
  // Mantidos porque telas fora de escopo (admin/owner) ainda os consomem.
  surfaceHighlight: '#F4F4F4',
  primaryHover: '#0A4A00',
  onPrimary: '#1A1C1C',
  onPrimaryMuted: 'rgba(26, 28, 28, 0.68)',
} as const;

/**
 * Toda paleta tem exatamente as mesmas chaves — é isso que deixa a troca trivial.
 * Record<..., string> em vez de `typeof lightColors` porque o claro é `as const`
 * e os literais dele não aceitariam os valores do escuro.
 */
export type Colors = Record<keyof typeof lightColors, string>;

// Valores lidos das telas "Dark Kinetic (v2)" do Stitch: fundo preto puro, cards
// em zinc-900 e o mesmo neutro verdadeiro (zinc) que o tema claro já usava.
const darkColors: Colors = {
  background: '#000000',
  surface: '#18181B', // zinc-900 — card, folha, header
  surfaceGray: '#27272A', // zinc-800 — input, chip neutro, card secundário
  surfaceHigh: '#3F3F46', // zinc-700 — tile de ícone, avatar vazio
  border: '#27272A', // zinc-800
  // No escuro o oposto do fundo é branco de verdade (aba "Ativas" das Reservas).
  inverse: '#FFFFFF',

  text: '#FFFFFF',
  textMuted: '#A1A1AA', // zinc-400
  textDim: '#71717A', // zinc-500
  onInverse: '#18181B',
  onInverseMuted: 'rgba(24, 24, 27, 0.70)',

  onPhoto: '#FAFAFA',
  onPhotoMuted: 'rgba(250, 250, 250, 0.72)',

  // Aqui os dois verdes colapsam num só: sobre preto o neon é perfeitamente
  // legível como texto (13:1), então não existe motivo para um verde escuro.
  primary: '#39FF14',
  primaryPressed: '#2ED610',
  primaryDim: 'rgba(57, 255, 20, 0.14)',
  accent: '#39FF14',
  accentPressed: '#2ED610',
  accentDim: 'rgba(57, 255, 20, 0.20)',
  onAccent: '#000000',

  // Invertido em relação ao claro: o item escolhido é o bloco neon.
  selected: '#39FF14',
  onSelected: '#000000',

  contrast: '#27272A',
  onContrast: '#FFFFFF',

  // #FF3B30 fica pesado sobre preto; clareado para manter a leitura sem gritar.
  danger: '#FF6B60',
  dangerDim: 'rgba(255, 107, 96, 0.16)',
  warning: '#FFCC00',
  warningText: '#FFCC00', // no escuro o âmbar puro já tem contraste de sobra
  warningDim: 'rgba(255, 204, 0, 0.18)',
  success: '#39FF14',
  successFill: '#39FF14',

  scrim: 'rgba(0, 0, 0, 0.55)',
  scrimStrong: 'rgba(0, 0, 0, 0.82)',
  glass: 'rgba(255, 255, 255, 0.16)',

  surfaceHighlight: '#27272A',
  primaryHover: '#2ED610',
  onPrimary: '#000000',
  onPrimaryMuted: 'rgba(0, 0, 0, 0.68)',
};

export const palettes = { light: lightColors, dark: darkColors };
export type ThemeMode = keyof typeof palettes;

// Escala do Liggo Kinetic. `stack`/`gutter`/`margin`/`section` são os nomes que o
// design system usa; `xs…xxl` continuam existindo com o mesmo valor de antes para
// não deslocar silenciosamente as telas de admin/owner (fora de escopo).
const spacing = {
  xs: 4,
  sm: 8,
  stack: 12,
  md: 16,
  gutter: 16,
  margin: 20, // margem horizontal padrão da tela
  lg: 24,
  xl: 32,
  section: 40, // respiro entre seções da mesma tela
  xxl: 48,
} as const;

const radius = {
  xs: 8, // badge, tag
  sm: 12, // chip, faixa interna de card
  md: 16, // botão, input, slot de horário
  lg: 24, // card
  xl: 32, // folha que sobe sobre a foto (arena), modal
  full: 9999,
} as const;

const shadow = {
  flat: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // "Kinetic shadow": 0px 10px 30px rgba(0,0,0,0.05) — o card flutua sem sujar a tela.
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 3,
  },
  // Mesma sombra virada pra cima — barra de abas e rodapé fixo.
  up: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 12,
  },
  overlay: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  // Brilho neon do estado pressionado. No Android a sombra colorida só existe a
  // partir da API 28; abaixo disso sobra o scale do press, que já é suficiente.
  glow: {
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  springPress: { damping: 15, stiffness: 300 },
} as const;

// Nomes de arquivo do @expo-google-fonts/inter — carregados via useFonts em
// app/_layout.tsx. O Liggo Kinetic usa Inter exclusivamente (título, corpo e label).
const fonts = {
  display: 'Inter_800ExtraBold',
  displaySemibold: 'Inter_700Bold',
  displayMedium: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

// Anotado como Record<string, TextStyle> (em vez de `as const`) para que o array
// de `fontVariant` do token `price` seja tipado como FontVariant[] mutável — com
// `as const` ele vira uma tupla readonly e quebra a inferência do StyleSheet.create
// em qualquer arquivo que espalhe este token (todo o objeto de estilos passa a ser
// inferido como União ViewStyle|TextStyle|ImageStyle, não só a chave problemática).
const typography: Record<string, TextStyle> = {
  // letterSpacing em RN é px, não em — os valores abaixo são o em do design
  // system multiplicado pelo fontSize (-0.04em × 48 = -1.9).
  display: { fontFamily: fonts.display, fontSize: 48, lineHeight: 56, letterSpacing: -1.9 },
  h1: { fontFamily: fonts.bodyBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.56 },
  h2: { fontFamily: fonts.bodyBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.24 },
  h3: { fontFamily: fonts.bodyBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  bodyLg: { fontFamily: fonts.body, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodySemibold: { fontFamily: fonts.bodySemibold, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  captionSemibold: { fontFamily: fonts.bodySemibold, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
  // Caixa alta exige tracking ≥0.06em, senão as letras colam (craft/typography.md).
  overline: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.9 },
  // Qualquer valor de brl() usa este estilo — números tabulares mantêm preços alinhados
  // entre si (ex.: lista de cotas do split). Nunca usar h2/body genérico para dinheiro.
  price: { fontFamily: fonts.bodyBold, fontVariant: ['tabular-nums'] },
};

/**
 * Estilo de texto para `TextInput`.
 *
 * `lineHeight` num TextInput corta os descendentes — o rabinho do g, do p e do q
 * some por baixo. É comportamento do próprio RN (o campo não é um Text), então a
 * regra é: **nenhum TextInput recebe lineHeight**. Passe o token por aqui.
 *
 *     style={{ ...inputText(Theme.typography.body), color: c.text }}
 */
export const inputText = (token: TextStyle): TextStyle => {
  const { lineHeight, ...rest } = token;
  return rest;
};

export const Theme = {
  light: { colors: lightColors },
  dark: { colors: darkColors },
  colors: lightColors,
  spacing,
  radius,
  shadow,
  motion,
  fonts,
  typography,
} as const;

// Alias legado — mantido só para telas ainda não migradas (ex.: admin/owner, que
// serão removidas do produto e não valem o esforço de migração). Novo código usa
// `Theme.colors`/`Theme.spacing`/`Theme.radius` diretamente.
export const C = {
  bg: Theme.colors.background,
  card: Theme.colors.surface,
  line: Theme.colors.border,
  green: Theme.colors.primary,
  txt: Theme.colors.text,
  mut: Theme.colors.textMuted,
  danger: Theme.colors.danger,
};

export const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
