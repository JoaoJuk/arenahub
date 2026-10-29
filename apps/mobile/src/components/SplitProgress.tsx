import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme, type Colors } from '../theme';
import { useStyles } from '../theme-context';
import { AvatarStack } from './Avatar';

type Props = {
  paid: number;
  total: number;
  /** Nomes de quem já pagou, quando a tela tiver essa informação. */
  names?: (string | null | undefined)[];
  /** Cor do anel entre avatares — precisa ser a do fundo onde a barra está. */
  ringColor?: string;
  /** Substitui o "N/M Pagos" do rodapé esquerdo. */
  label?: string;
  /** Esconde o rodapé, para quem já mostra a contagem por fora. */
  hideFooter?: boolean;
};

/**
 * Barra contínua de cotas com a contagem embaixo: pagos à esquerda, pendentes à
 * direita. Contínua (e não segmentada) porque com 10 ou 12 cotas os segmentos
 * ficam finos demais para significar alguma coisa — quem dá o número exato é o
 * rodapé.
 */
export const SplitProgress: React.FC<Props> = ({ paid, total, names, ringColor, label, hideFooter }) => {
  const s = useStyles(styles);
  const safeTotal = Math.max(1, total);
  const done = Math.min(paid, safeTotal);
  const pending = Math.max(0, safeTotal - done);
  const pct = Math.round((done / safeTotal) * 100);

  return (
    <View style={s.wrap}>
      <View
        style={s.track}
        accessibilityRole="progressbar"
        accessibilityLabel={`${done} de ${safeTotal} cotas pagas`}
        accessibilityValue={{ min: 0, max: safeTotal, now: done }}
      >
        <View style={[s.fill, { width: `${pct}%` }]} />
      </View>

      {!hideFooter && (
        <View style={s.footer}>
          <Text style={s.paid}>{label ?? `${done}/${safeTotal} Pagos`}</Text>
          <View style={s.right}>
            {!!names?.length && <AvatarStack names={names} size={22} max={3} ringColor={ringColor} />}
            {pending > 0 && (
              <Text style={s.pending}>
                {pending} {pending === 1 ? 'Pendente' : 'Pendentes'}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  wrap: { gap: Theme.spacing.sm },
  track: {
    height: 10,
    borderRadius: Theme.radius.full,
    backgroundColor: c.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Theme.radius.full, backgroundColor: c.accent },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Theme.spacing.sm },
  paid: { ...Theme.typography.small, fontFamily: Theme.fonts.bodyBold, color: c.text },
  right: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm },
  pending: { ...Theme.typography.small, color: c.textMuted },
});
