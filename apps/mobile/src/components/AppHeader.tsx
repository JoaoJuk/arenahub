import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Bell } from 'lucide-react-native';
import { Theme, type Colors } from '../theme';
import { useColors, useStyles } from '../theme-context';

const logoImg = require('../../assets/logo.png');

type Props = {
  /** Ponto vermelho no sino. */
  hasNotifications?: boolean;
  onPressBell?: () => void;
};

/**
 * Barra superior das abas: logo do app à esquerda, wordmark "Liggo" e sino.
 * O verde da wordmark é `primary` — #106E00 no claro (texto sobre fundo claro) e
 * o próprio neon no escuro, exatamente como nas telas do Stitch.
 */
export const AppHeader: React.FC<Props> = ({ hasNotifications, onPressBell }) => {
  const c = useColors();
  const s = useStyles(styles);
  // Área segura aplicada aqui, e não em cada tela: este cabeçalho é o primeiro
  // elemento da Início e das Reservas, e sem isto ele fica embaixo do relógio,
  // do wi-fi e da bateria (e do notch, em aparelho com recorte).
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.row, { paddingTop: insets.top + Theme.spacing.sm }]}>
      <View style={s.left}>
        <View style={s.logoWrap}>
          <Image source={logoImg} style={s.logo} contentFit="contain" />
        </View>
        <Text style={s.wordmark} accessibilityRole="header">Liggo</Text>
      </View>

      <TouchableOpacity
        style={s.bell}
        onPress={onPressBell}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Notificações"
      >
        <Bell color={c.text} size={24} />
        {hasNotifications && <View style={s.badge} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.margin,
    // paddingTop vem da área segura, aplicado no componente.
    paddingBottom: Theme.spacing.sm,
    backgroundColor: c.surface,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.stack },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: c.surfaceGray,
    borderWidth: 1,
    borderColor: c.border,
  },
  logo: { width: 30, height: 30 },
  wordmark: {
    ...Theme.typography.h2,
    fontFamily: Theme.fonts.display,
    color: c.primary,
    fontSize: 26,
  },
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: Theme.radius.full,
    backgroundColor: c.danger,
    borderWidth: 2,
    borderColor: c.surface,
  },
});
