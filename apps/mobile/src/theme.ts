export const Theme = {
  colors: {
    background: '#F8F9FA', // Cinza muito claro, quase branco
    surface: '#FFFFFF',    // Cards totalmente brancos
    surfaceHighlight: '#F1F5F9', // Hover/Active states
    border: '#E2E8F0',
    
    primary: '#00C853', // Verde vibrante (ajustado para contrastar no claro)
    primaryDim: 'rgba(0, 200, 83, 0.15)', // Fundo para botões secundários/badges
    
    text: '#0F172A',     // Quase preto para máxima legibilidade
    textMuted: '#64748B',// Cinza intermediário
    textDim: '#94A3B8',  // Cinza claro para textos de apoio
    
    danger: '#FF3B30',
    dangerDim: 'rgba(255, 59, 48, 0.15)',
    
    warning: '#FFCC00',
    success: '#34C759',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '800' as const },
    h2: { fontSize: 24, fontWeight: '700' as const },
    h3: { fontSize: 20, fontWeight: '600' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    bodySemibold: { fontSize: 16, fontWeight: '600' as const },
    caption: { fontSize: 14, fontWeight: '400' as const },
    captionSemibold: { fontSize: 14, fontWeight: '600' as const },
    small: { fontSize: 12, fontWeight: '500' as const },
  }
} as const;

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
