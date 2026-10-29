import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Heart } from 'lucide-react-native';
import { Theme, brl, type Colors } from '../theme';
import { useColors, useStyles } from '../theme-context';
import { PressableScale } from './PressableScale';
import { Chip } from './Chip';
import { SportIcon } from './sportIcon';
import { mockDistanceLabel } from '../mocks/placeholders';

export type ArenaLike = {
  id: string;
  name: string;
  city: string;
  photoUrl?: string | null;
  sports: string[];
  rating: number;
  priceFrom?: number;
};

type Props = {
  arena: ArenaLike;
  onPress?: () => void;
  /** Quando informado, o coração aparece no topo e a nota desce para o rodapé da foto. */
  favorite?: boolean;
  onToggleFavorite?: () => void;
  /** Usado pela trilha horizontal de favoritos, que precisa de largura fixa. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Card de arena do Liggo Kinetic: foto 16:9 com scrim, nome sobre a foto, nota em
 * "vidro" e rodapé com os esportes e o preço a partir de.
 */
export const ArenaCard: React.FC<Props> = ({ arena, onPress, favorite, onToggleFavorite, style }) => {
  const c = useColors();
  const s = useStyles(styles);
  const hasPrice = typeof arena.priceFrom === 'number' && Number.isFinite(arena.priceFrom);
  const showHeart = !!onToggleFavorite;

  const rating = (
    <View style={s.ratingBadge}>
      <Star color="#1A1C1C" fill="#1A1C1C" size={12} />
      <Text style={s.ratingTxt}>{arena.rating?.toFixed?.(1) ?? arena.rating}</Text>
    </View>
  );

  return (
    // O coração fica FORA do PressableScale de propósito: aninhar um controle
    // dentro do outro vira <button> dentro de <button> no react-native-web
    // (HTML inválido) e, no nativo, confunde o leitor de tela. Ele é irmão
    // posicionado por cima, então o toque continua caindo nele primeiro.
    <View style={[s.wrapper, style]}>
      {/* Só o nome: quase toda arena do seed já começa com "Arena", e prefixar
          fazia o leitor de tela anunciar "Arena Arena Beira-Mar". */}
      <PressableScale onPress={onPress} accessibilityLabel={arena.name} style={s.card}>
        <View style={s.photoWrap}>
          <Image
            source={{ uri: arena.photoUrl || undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <LinearGradient
            colors={['transparent', 'rgba(11,15,13,0.20)', 'rgba(11,15,13,0.85)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          {!showHeart && <View style={s.ratingTop}>{rating}</View>}

          <View style={s.overlay}>
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{arena.name}</Text>
              <Text style={s.sub} numberOfLines={1}>
                {arena.city} • {mockDistanceLabel(arena.id)}
              </Text>
            </View>
            {showHeart && rating}
          </View>
        </View>

        <View style={s.footer}>
          <View style={s.chips}>
            {arena.sports.slice(0, 2).map((sp) => (
              <Chip
                key={sp}
                label={sp}
                variant="outline"
                icon={<SportIcon sport={sp} color={c.text} />}
              />
            ))}
          </View>
          {hasPrice && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.priceLabel}>A partir de</Text>
              <Text style={s.price}>
                {brl(arena.priceFrom as number)}
                <Text style={s.priceUnit}>/h</Text>
              </Text>
            </View>
          )}
        </View>
      </PressableScale>

      {showHeart && (
        <TouchableOpacity
          style={s.heart}
          onPress={onToggleFavorite}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
        >
          <Heart
            color={favorite ? c.danger : c.onPhoto}
            fill={favorite ? c.danger : 'transparent'}
            size={18}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  wrapper: { position: 'relative' },
  card: {
    backgroundColor: c.surface,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    ...Theme.shadow.raised,
  },
  photoWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: c.surfaceHigh },
  ratingTop: { position: 'absolute', top: Theme.spacing.stack, right: Theme.spacing.stack },
  // A pastilha da nota fica sempre branca com texto escuro: ela vive sobre a
  // foto, que não muda com o tema.
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    height: 26,
    borderRadius: Theme.radius.xs,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  ratingTxt: { ...Theme.typography.small, fontFamily: Theme.fonts.bodyBold, color: '#1A1C1C' },
  heart: {
    position: 'absolute',
    top: Theme.spacing.stack,
    right: Theme.spacing.stack,
    zIndex: 2,
    width: 36,
    height: 36,
    borderRadius: Theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 15, 13, 0.55)',
  },
  overlay: {
    position: 'absolute',
    left: Theme.spacing.md,
    right: Theme.spacing.md,
    bottom: Theme.spacing.stack,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Theme.spacing.sm,
  },
  name: { ...Theme.typography.h2, color: c.onPhoto },
  sub: { ...Theme.typography.caption, color: c.onPhotoMuted, marginTop: 2, textTransform: 'capitalize' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Theme.spacing.sm,
    padding: Theme.spacing.md,
  },
  chips: { flexDirection: 'row', gap: Theme.spacing.sm, flexShrink: 1, flexWrap: 'nowrap', overflow: 'hidden' },
  priceLabel: { ...Theme.typography.small, color: c.textMuted },
  price: { ...Theme.typography.price, color: c.text, fontSize: 16 },
  priceUnit: { ...Theme.typography.caption, color: c.textMuted, fontFamily: Theme.fonts.body },
});
