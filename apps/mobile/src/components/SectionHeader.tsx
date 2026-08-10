import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Theme, type Colors } from '../theme';
import { useStyles } from '../theme-context';

type Props = {
  title: string;
  /** Texto da ação à direita ("Ver todos"). Omitido = só o título. */
  actionLabel?: string;
  onPressAction?: () => void;
  /** Elemento à direita no lugar do texto (ex.: botão redondo de mapa). */
  right?: React.ReactNode;
};

export const SectionHeader: React.FC<Props> = ({ title, actionLabel, onPressAction, right }) => {
  const s = useStyles(styles);

  return (
    <View style={s.row}>
      <Text style={s.title} accessibilityRole="header">{title}</Text>
      {right
        ? right
        : actionLabel && (
            <TouchableOpacity
              onPress={onPressAction}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
            >
              <Text style={s.action}>{actionLabel}</Text>
            </TouchableOpacity>
          )}
    </View>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  title: { ...Theme.typography.h2, color: c.text, flexShrink: 1 },
  action: { ...Theme.typography.label, color: c.textMuted },
});
