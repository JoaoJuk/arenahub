import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CircleCheckBig, Clock, X, History } from 'lucide-react-native';
import { Theme, type Colors } from '../theme';
import { useColors, useStyles } from '../theme-context';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'done' | string;

type Meta = { label: string; color: string; Icon: any };

/**
 * Cor de PREENCHIMENTO de cada status (faixa lateral do card, badge sobre foto).
 * Recebe a paleta porque `success`/`danger` mudam entre os temas.
 */
export const statusMeta = (status: BookingStatus, c: Colors): Meta => {
  const map: Record<string, Meta> = {
    confirmed: { label: 'Confirmada', color: c.accent, Icon: CircleCheckBig },
    pending: { label: 'Pendente', color: c.warning, Icon: Clock },
    cancelled: { label: 'Cancelada', color: c.danger, Icon: X },
    done: { label: 'Finalizada', color: c.textDim, Icon: History },
  };
  return map[status] ?? map.pending;
};

/** Cor da faixa vertical à esquerda do card de reserva. */
export const statusBarColor = (status: BookingStatus, c: Colors) => statusMeta(status, c).color;

type Props = {
  status: BookingStatus;
  /** Sobre foto: fundo escuro translúcido. Fora da foto: fundo tonal claro. */
  onPhoto?: boolean;
};

export const StatusBadge: React.FC<Props> = ({ status, onPhoto = false }) => {
  const c = useColors();
  const s = useStyles(styles);
  const { label, color, Icon } = statusMeta(status, c);

  // Fora da foto o preenchimento vira texto, e aí o neon (e o amarelo) precisam
  // do par legível sobre superfície clara. No escuro `primary` já é o neon.
  const textColor = onPhoto
    ? color
    : color === c.accent
      ? c.primary
      : color === c.warning
        ? c.warningText
        : color;

  return (
    <View style={[s.base, onPhoto ? s.onPhoto : s.tonal]}>
      <Icon color={textColor} size={14} />
      <Text style={[s.label, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    height: 26,
    borderRadius: Theme.radius.full,
  },
  onPhoto: { backgroundColor: 'rgba(0, 0, 0, 0.72)' },
  tonal: { backgroundColor: c.surfaceGray },
  label: { ...Theme.typography.small, fontFamily: Theme.fonts.bodyBold },
});
