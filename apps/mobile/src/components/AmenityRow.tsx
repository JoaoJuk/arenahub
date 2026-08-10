import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Car, ShowerHead, Beer, Wifi } from 'lucide-react-native';
import { Theme, type Colors } from '../theme';
import { useColors, useStyles } from '../theme-context';
import { MOCK_AMENITIES, type AmenityKey } from '../mocks/placeholders';

const ICONS: Record<AmenityKey, any> = {
  parking: Car,
  lockers: ShowerHead,
  bar: Beer,
  wifi: Wifi,
};

/**
 * Linha de comodidades da arena. A lista vem de `mocks/placeholders` — é vitrine
 * até o backend ter o campo. Ver o cabeçalho daquele arquivo.
 */
export const AmenityRow: React.FC = () => {
  const c = useColors();
  const s = useStyles(styles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
      accessibilityLabel="Comodidades da arena"
    >
      {MOCK_AMENITIES.map((a) => {
        const Icon = ICONS[a.key];
        return (
          <View key={a.key} style={s.item}>
            <View style={s.circle}>
              <Icon color={c.text} size={20} />
            </View>
            <Text style={s.label} numberOfLines={1}>{a.label}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  row: { gap: Theme.spacing.md, paddingVertical: Theme.spacing.xs },
  item: { alignItems: 'center', gap: Theme.spacing.sm, minWidth: 68 },
  circle: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceGray,
  },
  label: { ...Theme.typography.small, color: c.textMuted },
});
