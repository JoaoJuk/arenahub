import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme, type Colors } from '../theme';
import { useColors, useStyles } from '../theme-context';

type AvatarProps = {
  /** Nome completo — só a inicial é exibida. O app não tem foto de usuário. */
  name?: string | null;
  size?: number;
  /** Sobre superfície escura, o círculo clareia em vez de escurecer. */
  onDark?: boolean;
};

export const Avatar: React.FC<AvatarProps> = ({ name, size = 40, onDark = false }) => {
  const c = useColors();
  // Sem nome → círculo liso. É o que as telas do Stitch mostram para "quem já
  // confirmou" quando não há identidade a exibir; um "?" grande poluiria.
  const initial = (name || '').trim().charAt(0).toUpperCase();

  return (
    <View
      style={[
        base.center,
        {
          width: size,
          height: size,
          borderRadius: Theme.radius.full,
          backgroundColor: onDark ? 'rgba(255,255,255,0.14)' : c.surfaceHigh,
        },
      ]}
    >
      {!!initial && (
        <Text
          style={[
            base.initial,
            { fontSize: Math.round(size * 0.42), color: onDark ? '#FFFFFF' : c.text },
          ]}
        >
          {initial}
        </Text>
      )}
    </View>
  );
};

type StackProps = {
  names: (string | null | undefined)[];
  /** Máximo de avatares antes de virar "+N". */
  max?: number;
  size?: number;
  /** Cor do anel que separa um avatar do outro (a do fundo onde a pilha está). */
  ringColor?: string;
};

/** Pilha sobreposta de avatares — "quem já confirmou" no card de racha/cota. */
export const AvatarStack: React.FC<StackProps> = ({ names, max = 3, size = 28, ringColor }) => {
  const c = useColors();
  const s = useStyles(styles);
  const ring = ringColor ?? c.surface;
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;

  return (
    <View style={base.stack}>
      {shown.map((n, i) => (
        <View
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -size / 3,
            borderRadius: Theme.radius.full,
            borderWidth: 2,
            borderColor: ring,
          }}
        >
          <Avatar name={n} size={size} />
        </View>
      ))}
      {rest > 0 && (
        <View
          style={[
            s.rest,
            {
              width: size,
              height: size,
              marginLeft: -size / 3,
              borderRadius: Theme.radius.full,
              borderColor: ring,
            },
          ]}
        >
          <Text style={[s.restTxt, { fontSize: Math.round(size * 0.36) }]}>+{rest}</Text>
        </View>
      )}
    </View>
  );
};

// Estilos que não dependem de cor ficam fora da factory — não precisam recriar.
const base = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: Theme.fonts.bodyBold },
  stack: { flexDirection: 'row', alignItems: 'center' },
});

const styles = (c: Colors) => StyleSheet.create({
  rest: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceGray,
    borderWidth: 2,
  },
  restTxt: { fontFamily: Theme.fonts.bodyBold, color: c.textMuted },
});
