import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';
import { Theme, brl, type Colors } from '../theme';
import { useColors, useStyles } from '../theme-context';
import { PressableScale } from './PressableScale';
import { SportIcon } from './sportIcon';
import { AvatarStack } from './Avatar';
import { Button } from './Button';

export type OpenMatch = {
  id: string;
  arena: string;
  sport: string;
  date: string;
  startTime: string;
  spotsLeft: number;
  confirmed?: number;
  shareAmount: number;
  shareUrl?: string | null;
  /** Minha cota neste racha, se eu tiver uma. `requested` = esperando resposta. */
  myStatus?: 'requested' | 'pending' | 'committed' | 'paid' | null;
  isOrganizer?: boolean;
};

type Props = {
  match: OpenMatch;
  /** "Hoje" / "12/10" — a formatação de data mora na tela, não no card. */
  dayLabel: string;
  onPress?: () => void;
  /** Pedir para entrar. Omitido = card sem ação (ex.: visitante). */
  onRequestJoin?: () => void;
  busy?: boolean;
};

/** Card de racha aberto: quem organiza, quanto custa por pessoa e quantas vagas sobraram. */
export const RachaCard: React.FC<Props> = ({ match, dayLabel, onPress, onRequestJoin, busy }) => {
  const c = useColors();
  const s = useStyles(styles);
  const confirmed = match.confirmed ?? 0;

  // O botão conta a história toda: já pedi, já estou dentro, é meu, ou dá para pedir.
  const acao = (() => {
    if (match.isOrganizer) return { titulo: 'Seu racha', ativo: false };
    if (match.myStatus === 'requested') return { titulo: 'Pedido enviado', ativo: false };
    if (match.myStatus) return { titulo: 'Você está no racha', ativo: false };
    if (match.spotsLeft <= 0) return { titulo: 'Sem vagas', ativo: false };
    return { titulo: 'Pedir para entrar', ativo: true };
  })();

  return (
    <PressableScale
      onPress={onPress}
      style={s.card}
      accessibilityLabel={`Racha em ${match.arena}, ${match.spotsLeft} vagas, ${brl(match.shareAmount)} por pessoa`}
    >
      <View style={s.top}>
        <View style={s.iconTile}>
          <SportIcon sport={match.sport} color={c.text} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.arena} numberOfLines={1}>{match.arena}</Text>
          <Text style={s.info} numberOfLines={1}>
            {match.sport} • {dayLabel} às {match.startTime}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.price}>{brl(match.shareAmount)}</Text>
          <Text style={s.priceUnit}>/pessoa</Text>
        </View>
      </View>

      <View style={s.strip}>
        <View style={s.stripLeft}>
          {confirmed > 0 && (
            <AvatarStack names={Array(confirmed).fill(null)} size={28} max={3} ringColor={c.background} />
          )}
          <Text style={s.confirmed}>
            {confirmed} {confirmed === 1 ? 'confirmado' : 'confirmados'}
          </Text>
        </View>
        <View style={s.spots}>
          <User color={c.primary} size={16} />
          <Text style={s.spotsTxt}>
            {match.spotsLeft} {match.spotsLeft === 1 ? 'vaga' : 'vagas'}
          </Text>
        </View>
      </View>

      {!!onRequestJoin && (
        <Button
          title={busy ? 'Enviando…' : acao.titulo}
          variant={acao.ativo ? 'primary' : 'secondary'}
          size="md"
          fullWidth
          loading={busy}
          disabled={!acao.ativo || busy}
          onPress={onRequestJoin}
        />
      )}
    </PressableScale>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
    ...Theme.shadow.raised,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.stack },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceHigh,
  },
  arena: { ...Theme.typography.bodySemibold, color: c.text },
  info: { ...Theme.typography.caption, color: c.textMuted, marginTop: 2, textTransform: 'capitalize' },
  price: { ...Theme.typography.price, color: c.text, fontSize: 18 },
  priceUnit: { ...Theme.typography.small, color: c.textMuted },

  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Theme.spacing.sm,
    padding: Theme.spacing.stack,
    borderRadius: Theme.radius.sm,
    backgroundColor: c.background,
    borderWidth: 1,
    borderColor: c.border,
  },
  stripLeft: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm, flexShrink: 1 },
  confirmed: { ...Theme.typography.small, color: c.text },
  spots: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.xs },
  spotsTxt: { ...Theme.typography.label, color: c.primary },
});
