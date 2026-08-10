import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Theme, type Colors } from '../theme';
import { useColors, useStyles } from '../theme-context';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};

/**
 * Duas pílulas lado a lado (Ativas / Histórico). A selecionada inverte para o
 * oposto do fundo: preta no tema claro, branca no escuro.
 */
export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  const c = useColors();
  const s = useStyles(styles);

  return (
    <View style={s.row} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            activeOpacity={0.85}
            style={[s.tab, active ? s.tabActive : s.tabIdle]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[s.label, { color: active ? c.onInverse : c.textMuted }]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = (c: Colors) => StyleSheet.create({
  row: { flexDirection: 'row', gap: Theme.spacing.stack },
  tab: { flex: 1, height: 48, borderRadius: Theme.radius.full, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: c.inverse },
  tabIdle: { backgroundColor: c.surfaceGray },
  label: { ...Theme.typography.label },
});
