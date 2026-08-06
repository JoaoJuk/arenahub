import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Linking, useWindowDimensions,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MapPin, ChevronDown, Bell, ChevronRight, Star } from 'lucide-react-native';
import { api } from '@/api';
import { Theme, brl } from '@/theme';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';

const logoImg = require('../../assets/logo.png');

// Banners promocionais da home. A arte é só a foto de fundo — todo o texto é
// renderizado em RN por cima, para ficar nítido em qualquer densidade de tela e
// editável sem regerar imagem. O scrim escuro à esquerda existe para contraste
// (não é gradiente decorativo — as fotos foram enquadradas com esse espaço vazio).
// `textWidth` é o quanto da largura o texto pode ocupar antes de esbarrar no
// assunto da foto — varia por arte (os jogadores entram em ~52%, o prato em ~59%).
const BANNERS = [
  {
    key: 'arenas',
    img: require('../../assets/banners/promo-arenas.jpg'),
    eyebrow: 'Arenas em promoção',
    prefix: 'até',
    highlight: '40% OFF',
    sub: 'Em horários selecionados perto de você',
    cta: 'Ver arenas',
    href: '/search',
    textWidth: '64%',
  },
  {
    key: 'indique',
    img: require('../../assets/banners/promo-indique.jpg'),
    eyebrow: 'Indique um amigo',
    prefix: 'ganhe',
    highlight: 'R$ 10',
    sub: 'De crédito para você e para ele',
    cta: 'Convidar',
    href: null,
    textWidth: '50%',
  },
  {
    key: 'almoco',
    img: require('../../assets/banners/promo-almoco.jpg'),
    eyebrow: 'Almoço na arena',
    prefix: 'a partir de',
    highlight: 'R$ 29,90',
    sub: 'Prato do dia no bar da arena, das 11h às 14h',
    cta: 'Ver cardápio',
    href: null,
    textWidth: '56%',
  },
] as const;

const BANNER_GAP = 12;

const dayLabel = (iso: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return iso === today ? 'Hoje' : iso.split('-').reverse().slice(0, 2).join('/');
};

export default function Explore() {
  const [arenas, setArenas] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerIdx, setBannerIdx] = useState(0);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520) - 32;
  // Um pedaço do próximo banner fica visível, sinalizando que o carrossel rola.
  const bannerW = W - 40;

  const onBannerScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / (bannerW + BANNER_GAP));
      setBannerIdx(Math.max(0, Math.min(BANNERS.length - 1, i)));
    },
    [bannerW],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, m] = await Promise.all([api.arenas('', ''), api.openMatches().catch(() => [])]);
      setArenas(a.slice(0, 3));
      setMatches(m);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={{ maxWidth: 520, width: '100%', alignSelf: 'center', paddingBottom: Theme.spacing.xxl }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={Theme.colors.primary} />}
    >
      {/* 1. Header de localização e notificações */}
      <View style={s.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.headerLogoWrap}>
            <Image source={logoImg} style={s.headerLogo} contentFit="contain" />
          </View>
          <View>
            <Text style={{ color: Theme.colors.textMuted, fontSize: 13, marginBottom: 2 }}>Bom dia, craque</Text>
            <TouchableOpacity style={s.location} activeOpacity={0.7}>
              <MapPin color={Theme.colors.primary} size={14} />
              <Text style={s.locationTxt} numberOfLines={1}>
                <Text style={{ fontWeight: '700', color: Theme.colors.text }}>Curitiba, PR</Text>
              </Text>
              <ChevronDown color={Theme.colors.primary} size={14} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={s.bellBtn} activeOpacity={0.7}>
          <Bell color={Theme.colors.text} size={24} />
          <View style={s.bellBadge} />
        </TouchableOpacity>
      </View>

      {/* 2. Carrossel de banners promocionais */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={bannerW + BANNER_GAP}
        snapToAlignment="start"
        onMomentumScrollEnd={onBannerScroll}
        contentContainerStyle={{ paddingHorizontal: Theme.spacing.md, gap: BANNER_GAP, marginTop: Theme.spacing.lg }}
      >
        {BANNERS.map((b) => (
          <TouchableOpacity
            key={b.key}
            activeOpacity={0.9}
            style={[s.banner, { width: bannerW, height: bannerW / 1.85 }]}
            onPress={() => b.href && router.push(b.href)}
          >
            <Image source={b.img} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            <LinearGradient
              colors={['rgba(11,15,13,0.94)', 'rgba(11,15,13,0.78)', 'rgba(11,15,13,0.10)']}
              locations={[0, 0.48, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[s.bannerContent, { maxWidth: b.textWidth }]}>
              <Text style={s.bannerEyebrow} numberOfLines={1}>{b.eyebrow}</Text>
              <Text style={s.bannerPrefix}>{b.prefix}</Text>
              <Text style={s.bannerHighlight} numberOfLines={1} adjustsFontSizeToFit>{b.highlight}</Text>
              <Text style={s.bannerSub} numberOfLines={2}>{b.sub}</Text>
              <View style={s.bannerCta}>
                <Text style={s.bannerCtaTxt}>{b.cta}</Text>
                <ChevronRight color={Theme.colors.text} size={13} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.dots}>
        {BANNERS.map((b, i) => (
          <View key={b.key} style={[s.dot, i === bannerIdx && s.dotActive]} />
        ))}
      </View>

      {/* 3. Matchmaking */}
      <Text style={s.sectionTitle}>Rachas abertos</Text>
      {loading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {[1, 2].map((i) => <Skeleton key={i} width={220} height={112} borderRadius={Theme.radius.md} />)}
        </ScrollView>
      ) : matches.length === 0 ? (
        <Text style={s.emptyMatches}>Nenhum racha aberto agora. Reserve uma quadra e divida por link!</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {matches.map((m) => (
            <TouchableOpacity key={m.id} activeOpacity={0.8} onPress={() => Linking.openURL(m.shareUrl)}>
              <Card padding="md" style={s.matchCard}>
                <View style={s.matchBar} />
                <View style={{ flex: 1 }}>
                  <Text style={s.matchArena} numberOfLines={1}>{m.arena}</Text>
                  <Text style={s.matchInfo}>{m.sport} · {dayLabel(m.date)} às {m.startTime}</Text>
                  <Text style={s.matchSpots}>{m.spotsLeft} {m.spotsLeft === 1 ? 'vaga restante' : 'vagas restantes'}</Text>
                  <View style={s.matchPriceRow}>
                    <Text style={s.matchPrice}>{brl(m.shareAmount)}<Text style={s.matchPriceUnit}> / pessoa</Text></Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* 4. Arenas perto de você */}
      <Text style={s.sectionTitle}>Arenas perto de você</Text>
      <View style={{ paddingHorizontal: Theme.spacing.md }}>
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} height={68} borderRadius={Theme.radius.md} style={{ marginBottom: 10 }} />)
        ) : (
          arenas.map((a, i) => (
            <TouchableOpacity key={a.id} activeOpacity={0.7} style={[s.arenaRow, i === 0 && { borderTopWidth: 0 }]} onPress={() => router.push(`/arena/${a.id}`)}>
              <Image source={{ uri: a.photoUrl }} style={s.arenaPh} contentFit="cover" transition={200} cachePolicy="memory-disk" />
              <View style={{ flex: 1 }}>
                <Text style={s.arenaName} numberOfLines={1}>{a.name}</Text>
                <Text style={s.arenaSub} numberOfLines={1}>{a.sports.slice(0, 2).join(' · ')} · {a.city}</Text>
              </View>
              <View style={s.arenaRating}>
                <Star color={Theme.colors.warning} fill={Theme.colors.warning} size={12} />
                <Text style={s.arenaRatingTxt}>{a.rating}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Theme.colors.background },

  location: { flexDirection: 'row', alignItems: 'center' },
  locationTxt: { color: Theme.colors.textMuted, fontSize: 15, flexShrink: 1, marginLeft: 4 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Theme.spacing.md, paddingTop: Theme.spacing.xl, paddingBottom: Theme.spacing.sm },
  headerLogoWrap: { width: 44, height: 44, borderRadius: Theme.radius.full, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border },
  headerLogo: { width: 32, height: 32 },

  bellBtn: { padding: 8, position: 'relative' },
  bellBadge: { position: 'absolute', top: 6, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: Theme.colors.danger, borderWidth: 2, borderColor: Theme.colors.background },

  banner: {
    borderRadius: Theme.radius.md,
    overflow: 'hidden',
    backgroundColor: Theme.colors.surfaceHighlight,
    ...Theme.shadow.raised,
  },
  // maxWidth vem de cada banner (BANNERS[].textWidth) — ver comentário lá.
  bannerContent: { flex: 1, justifyContent: 'center', paddingHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.sm },
  bannerEyebrow: {
    ...Theme.typography.small,
    color: Theme.colors.onPhoto,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 10.5,
  },
  bannerPrefix: {
    ...Theme.typography.small,
    color: Theme.colors.onPhotoMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10.5,
    marginTop: 6,
  },
  bannerHighlight: {
    fontFamily: Theme.fonts.display,
    color: Theme.colors.onPhoto,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  bannerSub: { ...Theme.typography.small, color: Theme.colors.onPhotoMuted, fontSize: 11.5, lineHeight: 15, marginTop: 3 },
  bannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start',
    marginTop: Theme.spacing.sm, paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: Theme.colors.primary, borderRadius: Theme.radius.full,
  },
  bannerCtaTxt: { ...Theme.typography.small, color: Theme.colors.text, fontSize: 12, fontFamily: Theme.fonts.bodySemibold },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: Theme.spacing.sm },
  dot: { width: 5, height: 5, borderRadius: Theme.radius.full, backgroundColor: Theme.colors.border },
  dotActive: { width: 14, backgroundColor: Theme.colors.primary },

  sectionTitle: { color: Theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.2, paddingHorizontal: Theme.spacing.md, marginTop: Theme.spacing.xxl, marginBottom: Theme.spacing.md },
  emptyMatches: { color: Theme.colors.textMuted, fontSize: 15, paddingHorizontal: Theme.spacing.md },

  matchCard: { width: 240, flexDirection: 'row', gap: 10 },
  matchBar: { width: 3, borderRadius: 2, backgroundColor: Theme.colors.primary },
  matchArena: { color: Theme.colors.text, fontWeight: '700', fontSize: 15 },
  matchInfo: { color: Theme.colors.textMuted, fontSize: 12.5, marginTop: 3, textTransform: 'capitalize' },
  matchSpots: { color: Theme.colors.primary, fontWeight: '700', fontSize: 12.5, marginTop: 10 },
  matchPriceRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  matchPrice: { ...Theme.typography.price, color: Theme.colors.text, fontSize: 16 },
  matchPriceUnit: { ...Theme.typography.caption, color: Theme.colors.textMuted, fontSize: 12 },

  arenaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  arenaPh: { width: 52, height: 52, borderRadius: Theme.radius.sm, backgroundColor: Theme.colors.surfaceHighlight },
  arenaName: { color: Theme.colors.text, fontWeight: '700', fontSize: 14.5 },
  arenaSub: { color: Theme.colors.textMuted, fontSize: 12.5, marginTop: 2, textTransform: 'capitalize' },
  arenaRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  arenaRatingTxt: { color: Theme.colors.text, fontWeight: '700', fontSize: 12.5 },
});
