import React from 'react';
import { View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { MapPin, ExternalLink } from 'lucide-react-native';
import { Theme, type Colors } from '../theme';
import { useColors, useStyles } from '../theme-context';
import { PressableScale } from './PressableScale';

type Props = {
  name: string;
  address: string;
  city: string;
};

const GRID_LINES = 5;

/**
 * Prévia de localização.
 *
 * Não há lat/lng no backend nem lib de mapa no app, então em vez de uma imagem
 * de mapa falsa isto desenha uma malha neutra com o pino da marca e abre o
 * Google Maps de verdade com o endereço em texto — o toque leva a algo útil.
 * TODO(backend): trocar por um mapa real quando a Arena tiver coordenadas.
 */
export const MapPreview: React.FC<Props> = ({ name, address, city }) => {
  const c = useColors();
  const s = useStyles(styles);
  const query = encodeURIComponent(`${name}, ${address}, ${city}`);

  const open = () => {
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    })!;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <PressableScale onPress={open} style={s.card} accessibilityLabel={`Abrir ${name} no mapa`}>
      <View style={s.grid} pointerEvents="none">
        {Array.from({ length: GRID_LINES }).map((_, i) => (
          <View key={`h${i}`} style={[s.line, { top: `${((i + 1) * 100) / (GRID_LINES + 1)}%`, height: 1, left: 0, right: 0 }]} />
        ))}
        {Array.from({ length: GRID_LINES }).map((_, i) => (
          <View key={`v${i}`} style={[s.line, { left: `${((i + 1) * 100) / (GRID_LINES + 1)}%`, width: 1, top: 0, bottom: 0 }]} />
        ))}
      </View>

      <View style={s.pinWrap}>
        <View style={s.pinHalo} />
        <View style={s.pin}>
          <MapPin color={c.onAccent} size={20} fill={c.onAccent} />
        </View>
      </View>

      <View style={s.footer}>
        <View style={{ flex: 1 }}>
          <Text style={s.address} numberOfLines={1}>{address}</Text>
          <Text style={s.city} numberOfLines={1}>{city}</Text>
        </View>
        <ExternalLink color={c.textMuted} size={18} />
      </View>
    </PressableScale>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  card: {
    height: 200,
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: c.surfaceGray,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'center',
  },
  grid: { ...StyleSheet.absoluteFillObject },
  line: { position: 'absolute', backgroundColor: c.border },
  pinWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: Theme.spacing.xl },
  pinHalo: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: Theme.radius.full,
    backgroundColor: c.accentDim,
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.stack,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  address: { ...Theme.typography.captionSemibold, color: c.text },
  city: { ...Theme.typography.small, color: c.textMuted, marginTop: 2 },
});
