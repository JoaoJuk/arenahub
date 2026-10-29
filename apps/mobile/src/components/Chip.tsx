import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { Theme, type Colors } from '../theme';
import { useColors, useStyles } from '../theme-context';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  /** `outline` = chip informativo (esporte no card), não clicável por padrão. */
  variant?: 'filter' | 'outline';
  style?: StyleProp<ViewStyle>;
};

/**
 * Pílula de filtro/tag. Selecionado inverte para o oposto do fundo (preto no
 * tema claro, branco no escuro) — mudar o fundo, e não só a borda, é o que
 * mantém a seleção legível sem depender de cor (DESIGN.md §8).
 */
export const Chip: React.FC<Props> = ({ label, selected, onPress, icon, variant = 'filter', style }) => {
  const c = useColors();
  const s = useStyles(styles);
  const Wrapper: any = onPress ? TouchableOpacity : View;
  const color = selected ? c.onInverse : c.text;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      style={[
        s.base,
        variant === 'outline' ? s.outline : s.filter,
        selected && s.selected,
        style,
      ]}
    >
      {icon && React.cloneElement(icon as any, { color, size: 14 })}
      <Text style={[s.label, { color }]} numberOfLines={1}>{label}</Text>
    </Wrapper>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    height: 36,
    paddingHorizontal: Theme.spacing.stack,
    borderRadius: Theme.radius.full,
  },
  filter: { backgroundColor: c.surfaceGray },
  outline: {
    height: 28,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  selected: { backgroundColor: c.inverse },
  label: { ...Theme.typography.small },
});
