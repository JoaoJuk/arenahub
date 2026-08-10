import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, useWindowDimensions,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MapPin, ChevronRight, Map as MapIcon, Heart } from 'lucide-react-native';
import { api } from '@/api';
import { Theme, type Colors } from '@/theme';
import { useColors, useStyles } from '@/theme-context';
import { useFavorites, toggleFavorite } from '@/favorites';
import { AppHeader } from '@/components/AppHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { ArenaCard } from '@/components/ArenaCard';
import { RachaCard } from '@/components/RachaCard';
import { Skeleton } from '@/components/Skeleton';

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

const BANNER_GAP = Theme.spacing.stack;

const dayLabel = (iso: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return iso === today ? 'Hoje' : iso.split('-').reverse().slice(0, 2).join('/');
};

const firstName = (full?: string | null) => (full || '').trim().split(' ')[0];

export default function Explore() {
  const c = useColors();
  const s = useStyles(styles);
  const [arenas, setArenas] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [joining, setJoining] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; msg: string } | null>(null);
  const favoriteIds = useFavorites();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520) - Theme.spacing.margin * 2;
  // Um pedaço do próximo banner fica visível, sinalizando que o carrossel rola.
  const bannerW = W - 32;
  // Mesma lógica na trilha de favoritos: o card não ocupa a largura toda para
  // que a borda do próximo apareça e o gesto lateral fique óbvio.
  const favW = Math.min(W - 40, 300);

  // A ordem é a em que o usuário favoritou (ver src/favorites.ts), não a da API.
  const favorites = useMemo(() => {
    const byId = new Map(arenas.map((a) => [a.id, a]));
    return favoriteIds.map((fid) => byId.get(fid)).filter(Boolean);
  }, [arenas, favoriteIds]);

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
      const [a, m, u] = await Promise.all([
        api.arenas('', ''),
        api.openMatches().catch(() => []),
        api.me().catch(() => null),
      ]);
      // Guarda a lista inteira: a seção de favoritos precisa achar qualquer
      // arena por id, não só as três que aparecem em "perto de você".
      setArenas(a);
      setMatches(m);
      setMe(u);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Antes o toque no racha abria o navegador na página de split, onde o jogador
  // digitava nome e telefone de novo e a cota nascia solta, sem conta. Agora o
  // pedido fica dentro do app e vai para a aprovação do organizador.
  const requestJoin = useCallback(async (bookingId: string) => {
    setJoining(bookingId);
    setNotice(null);
    try {
      await api.requestToJoin(bookingId);
      setNotice({ kind: 'ok', msg: 'Pedido enviado! Você entra assim que o organizador aceitar.' });
      await load();
    } catch (e: any) {
      setNotice({ kind: 'error', msg: e.message });
    } finally {
      setJoining(null);
    }
  }, [load]);

  return (
    <View style={s.wrap}>
      <AppHeader hasNotifications />

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.primary} />}
      >
        {!!notice && (
          <TouchableOpacity
            style={[s.notice, notice.kind === 'error' ? s.noticeError : s.noticeOk]}
            activeOpacity={0.8}
            onPress={() => setNotice(null)}
            accessibilityRole="alert"
            accessibilityLabel={notice.msg}
          >
            <Text style={[s.noticeTxt, { color: notice.kind === 'error' ? c.danger : c.primary }]}>
              {notice.msg}
            </Text>
          </TouchableOpacity>
        )}

        {/* 1. Saudação e cidade */}
        <View style={s.greeting}>
          <Text style={s.hello}>Olá, {firstName(me?.name) || 'craque'}</Text>
          <View style={s.location}>
            <MapPin color={c.textMuted} size={16} />
            <Text style={s.locationTxt} numberOfLines={1}>
              {arenas[0]?.city || 'Curitiba, PR'}
            </Text>
          </View>
        </View>

        {/* 2. Carrossel de banners promocionais (fotos do próprio app) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={bannerW + BANNER_GAP}
          snapToAlignment="start"
          onMomentumScrollEnd={onBannerScroll}
          contentContainerStyle={{ paddingHorizontal: Theme.spacing.margin, gap: BANNER_GAP }}
        >
          {BANNERS.map((b) => (
            <TouchableOpacity
              key={b.key}
              activeOpacity={0.9}
              style={[s.banner, { width: bannerW, height: bannerW / 1.85 }]}
              onPress={() => b.href && router.push(b.href)}
              accessibilityRole="button"
              accessibilityLabel={`${b.eyebrow}: ${b.prefix} ${b.highlight}`}
            >
              <Image source={b.img} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
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
                  <ChevronRight color={c.onAccent} size={14} />
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

        {/* 3. Favoritos — só aparece depois que o usuário marcar a primeira arena.
            Trilha horizontal (e não lista vertical como "perto de você") porque é
            atalho para o que ele já conhece, não uma lista para explorar. */}
        {favorites.length > 0 && (
          <View style={s.sectionNoPad}>
            <View style={{ paddingHorizontal: Theme.spacing.margin }}>
              <SectionHeader
                title="Seus Favoritos"
                right={
                  <View style={s.favCount}>
                    <Heart color={c.primary} fill={c.primary} size={14} />
                    <Text style={s.favCountTxt}>{favorites.length}</Text>
                  </View>
                }
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={favW + Theme.spacing.stack}
              snapToAlignment="start"
              contentContainerStyle={{ paddingHorizontal: Theme.spacing.margin, gap: Theme.spacing.stack }}
            >
              {favorites.map((a: any) => (
                <ArenaCard
                  key={a.id}
                  arena={a}
                  style={{ width: favW }}
                  favorite
                  onToggleFavorite={() => toggleFavorite(a.id)}
                  onPress={() => router.push(`/arena/${a.id}`)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* 4. Matchmaking */}
        <View style={s.section}>
          <SectionHeader title="Rachas Abertos" />
          {loading ? (
            <View style={{ gap: Theme.spacing.md }}>
              {[1, 2].map((i) => <Skeleton key={i} height={148} borderRadius={Theme.radius.lg} />)}
            </View>
          ) : matches.length === 0 ? (
            <Text style={s.empty}>Nenhum racha aberto agora. Reserve uma quadra e divida por link!</Text>
          ) : (
            <View style={{ gap: Theme.spacing.md }}>
              {matches.map((m) => (
                <RachaCard
                  key={m.id}
                  match={m}
                  dayLabel={dayLabel(m.date)}
                  busy={joining === m.id}
                  onRequestJoin={() => requestJoin(m.id)}
                  // Já estando no racha, o card leva para a reserva.
                  onPress={m.myStatus && m.myStatus !== 'requested'
                    ? () => router.push(`/booking/${m.id}`)
                    : undefined}
                />
              ))}
            </View>
          )}
        </View>

        {/* 5. Arenas perto de você */}
        <View style={s.section}>
          <SectionHeader
            title="Arenas perto de você"
            right={
              // Abrirá o mapa com todas as quadras marcadas. Ainda não há tela de
              // mapa nem coordenada no backend — por ora é só o símbolo.
              // TODO: navegar para o mapa quando a tela existir.
              <View style={s.mapBtn} accessibilityLabel="Ver arenas no mapa (em breve)">
                <MapIcon color={c.text} size={20} />
              </View>
            }
          />
          {loading ? (
            <View style={{ gap: Theme.spacing.lg }}>
              {[1, 2].map((i) => <Skeleton key={i} height={260} borderRadius={Theme.radius.lg} />)}
            </View>
          ) : arenas.length === 0 ? (
            <Text style={s.empty}>Nenhuma arena por aqui ainda.</Text>
          ) : (
            <View style={{ gap: Theme.spacing.lg }}>
              {arenas.slice(0, 3).map((a) => (
                <ArenaCard key={a.id} arena={a} onPress={() => router.push(`/arena/${a.id}`)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (c: Colors) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.background },
  content: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingTop: Theme.spacing.stack,
    paddingBottom: Theme.spacing.section,
  },

  notice: {
    marginHorizontal: Theme.spacing.margin,
    marginBottom: Theme.spacing.stack,
    padding: Theme.spacing.stack,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
  },
  noticeOk: { backgroundColor: c.primaryDim, borderColor: c.primary },
  noticeError: { backgroundColor: c.dangerDim, borderColor: c.danger },
  noticeTxt: { ...Theme.typography.caption },

  greeting: { paddingHorizontal: Theme.spacing.margin, marginBottom: Theme.spacing.lg },
  hello: { ...Theme.typography.h1, color: c.text },
  location: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.xs, marginTop: Theme.spacing.xs },
  locationTxt: { ...Theme.typography.body, color: c.textMuted, flexShrink: 1 },

  banner: {
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: c.surfaceHigh,
    ...Theme.shadow.raised,
  },
  // maxWidth vem de cada banner (BANNERS[].textWidth) — ver comentário lá.
  bannerContent: { flex: 1, justifyContent: 'center', paddingHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.sm },
  bannerEyebrow: { ...Theme.typography.overline, color: c.onPhoto, textTransform: 'uppercase', fontSize: 11 },
  bannerPrefix: { ...Theme.typography.overline, color: c.onPhotoMuted, textTransform: 'uppercase', fontSize: 11, marginTop: 6 },
  bannerHighlight: {
    fontFamily: Theme.fonts.display,
    color: c.onPhoto,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -1.1,
    fontVariant: ['tabular-nums'],
  },
  bannerSub: { ...Theme.typography.small, color: c.onPhotoMuted, lineHeight: 16, marginTop: 3 },
  bannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start',
    marginTop: Theme.spacing.stack, height: 34, paddingHorizontal: Theme.spacing.stack,
    backgroundColor: c.accent, borderRadius: Theme.radius.full,
  },
  bannerCtaTxt: { ...Theme.typography.small, fontFamily: Theme.fonts.bodyBold, color: c.onAccent },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: Theme.spacing.stack },
  dot: { width: 5, height: 5, borderRadius: Theme.radius.full, backgroundColor: c.border },
  dotActive: { width: 16, backgroundColor: c.primary },

  section: { paddingHorizontal: Theme.spacing.margin, marginTop: Theme.spacing.section },
  // A trilha horizontal sangra até a borda da tela; só o cabeçalho tem margem.
  sectionNoPad: { marginTop: Theme.spacing.section },
  empty: { ...Theme.typography.body, color: c.textMuted },

  favCount: {
    flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.xs,
    height: 28, paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.radius.full, backgroundColor: c.primaryDim,
  },
  favCountTxt: { ...Theme.typography.small, fontFamily: Theme.fonts.bodyBold, color: c.primary },

  mapBtn: {
    width: 44, height: 44, borderRadius: Theme.radius.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surfaceGray,
  },
});
