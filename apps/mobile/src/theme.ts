// Tokens de marca — ver DESIGN.md na raiz do repo para a justificativa de cada valor.
// `Theme.light` / `Theme.dark` já existem para o modo escuro futuro, mas só o `light`
// está ativo hoje (Theme.colors === Theme.light.colors) — não há toggle ainda.

import type { TextStyle } from 'react-native';

const lightColors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceHighlight: '#F4F4F5',
  border: '#E4E4E7',

  text: '#18181B',
  textMuted: '#71717A',
  textDim: '#A1A1AA',

  primary: '#00B341',
  primaryHover: '#009938',
  primaryDim: 'rgba(0, 179, 65, 0.12)',

  danger: '#E5484D',
  dangerDim: 'rgba(229, 72, 77, 0.12)',

  warning: '#F5A623',
  warningDim: 'rgba(245, 166, 35, 0.12)',
  success: '#00B341',

  // Texto sobre foto com scrim escuro (hero de arena, banners promocionais).
  // Mesmo valor em claro/escuro de propósito — o scrim já resolve o contraste,
  // não depende do tema do app.
  onPhoto: '#FAFAFA',
  onPhotoMuted: 'rgba(250, 250, 250, 0.72)',

  // Texto/ícone sobre o verde de marca. Escuro nos dois temas: o primary é claro
  // o bastante em ambos para que branco não feche 4.5:1 (ver DESIGN.md).
  onPrimary: '#18181B',
  onPrimaryMuted: 'rgba(24, 24, 27, 0.68)',

  // Véus escuros: `scrim` para controles sobre foto, `scrimStrong` para o fundo
  // de modal. Fora da escala de superfície porque não reagem ao tema.
  scrim: 'rgba(11, 15, 13, 0.55)',
  scrimStrong: 'rgba(11, 15, 13, 0.80)',
} as const;

const darkColors = {
  background: '#0B0F0D',
  surface: '#17181A',
  surfaceHighlight: '#212224',
  border: '#2A2C2E',

  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  textDim: '#71717A',

  primary: '#00D64F',
  primaryHover: '#00E858',
  primaryDim: 'rgba(0, 214, 79, 0.16)',

  danger: '#FF6369',
  dangerDim: 'rgba(255, 99, 105, 0.16)',

  warning: '#FFB84D',
  warningDim: 'rgba(255, 184, 77, 0.16)',
  success: '#00D64F',

  onPhoto: '#FAFAFA',
  onPhotoMuted: 'rgba(250, 250, 250, 0.72)',

  onPrimary: '#18181B',
  onPrimaryMuted: 'rgba(24, 24, 27, 0.68)',

  scrim: 'rgba(11, 15, 13, 0.55)',
  scrimStrong: 'rgba(11, 15, 13, 0.80)',
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
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
  raised: {
    shadowColor: '#18181B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  overlay: {
    shadowColor: '#18181B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  springPress: { damping: 15, stiffness: 300 },
} as const;

// Nomes de arquivo do @expo-google-fonts/* — carregados via useFonts em app/_layout.tsx.
const fonts = {
  display: 'Manrope_800ExtraBold',
  displaySemibold: 'Manrope_700Bold',
  displayMedium: 'Manrope_600SemiBold',
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
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.displaySemibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodySemibold: { fontFamily: fonts.bodySemibold, fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  captionSemibold: { fontFamily: fonts.bodySemibold, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
  // Qualquer valor de brl() usa este estilo — números tabulares mantêm preços alinhados
  // entre si (ex.: lista de cotas do split). Nunca usar h2/body genérico para dinheiro.
  price: { fontFamily: fonts.bodyBold, fontVariant: ['tabular-nums'] },
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
