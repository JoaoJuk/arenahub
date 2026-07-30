import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  RefreshControl, Linking, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, ChevronDown, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/api';
import { Theme, brl } from '@/theme';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';

const logoImg = require('../../assets/logo.png');

const BANNERS = [
  { title: 'Horários de Almoço', sub: '30% OFF até 14h', bg: ['#0A3B20', '#115C33'], badge: '🔥 PROMO', emoji: '🥗' },
  { title: 'Rachas de Verão', sub: 'quadras de areia', bg: ['#E94057', '#F27121'], badge: '🏖️ NOVO', emoji: '🏐' },
  { title: 'Indique um amigo', sub: 'ganhe R$ 10', bg: ['#102A4C', '#2C5364'], badge: '🎁 BÔNUS', emoji: '💸' },
];

const dayLabel = (iso: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return iso === today ? 'Hoje' : iso.split('-').reverse().slice(0, 2).join('/');
};

export default function Explore() {
  const [q, setQ] = useState('');
  const [sport, setSport] = useState('');
  const [arenas, setArenas] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520) - 32;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, m] = await Promise.all([api.arenas(q, sport), api.openMatches().catch(() => [])]);
      setArenas(a);
      setMatches(m);
    } catch {} finally { setLoading(false); }
  }, [q, sport]);

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
            <Image source={logoImg} style={s.headerLogo} resizeMode="contain" />
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

      {/* 2. Carrossel de banners */}
      <ScrollView
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        snapToInterval={W + Theme.spacing.md} decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: Theme.spacing.md, gap: Theme.spacing.md }}
        style={{ marginTop: Theme.spacing.lg }}
      >
        {BANNERS.map((b) => (
          <TouchableOpacity activeOpacity={0.9} key={b.title}>
            <LinearGradient colors={b.bg as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.banner, { width: W }]}>
              <View style={s.bannerGlow} />
              
              {/* Arte Gigante na Direita */}
              <View style={s.bannerArtWrap}>
                <Text style={s.bannerArtEmoji}>{b.emoji}</Text>
              </View>

              {/* Conteúdo na Esquerda */}
              <View style={s.bannerContent}>
                <Text style={s.bannerBadge}>{b.badge}</Text>
                <Text style={s.bannerTitle}>{b.title}</Text>
                <Text style={s.bannerSub}>{b.sub}</Text>
                <View style={s.bannerBtn}>
                  <Text style={s.bannerBtnTxt}>Aproveitar</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 3. Matchmaking */}
      <Text style={s.sectionTitle}>Rachas abertos</Text>
      {loading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {[1, 2].map((i) => <Skeleton key={i} width={200} height={110} borderRadius={Theme.radius.md} />)}
        </ScrollView>
      ) : matches.length === 0 ? (
        <Text style={s.emptyMatches}>Nenhum racha aberto agora. Reserve uma quadra e divida por link!</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
          {matches.map((m) => (
            <TouchableOpacity key={m.id} activeOpacity={0.8} onPress={() => Linking.openURL(m.shareUrl)}>
              <Card padding="md" style={s.matchCard}>
                <Text style={s.matchArena} numberOfLines={1}>{m.arena}</Text>
                <Text style={s.matchInfo}>{m.sport} · {dayLabel(m.date)} às {m.startTime}</Text>
                <Text style={s.matchSpots}>{m.spotsLeft} {m.spotsLeft === 1 ? 'vaga restante' : 'vagas restantes'}</Text>
                
                {/* Prova Social (Avatares Fakes) */}
                <View style={s.avatarRow}>
                  <View style={{ flexDirection: 'row' }}>
                    {[1, 2, 3].map((v, i) => (
                      <View key={i} style={[s.avatarCircle, { marginLeft: i > 0 ? -12 : 0, zIndex: 10 - i }]} />
                    ))}
                  </View>
                  <Text style={{ color: Theme.colors.textMuted, fontSize: 12, marginLeft: 8, fontWeight: '500' }}>jogando</Text>
                </View>

                <View style={s.matchPriceRow}>
                  <Text style={s.matchPrice}>{brl(m.shareAmount)} <Text style={{ color: Theme.colors.textMuted, fontSize: 12, fontWeight: '400' }}>/ pessoa</Text></Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Theme.colors.background },

  location: { flexDirection: 'row', alignItems: 'center' },
  locationTxt: { color: Theme.colors.textMuted, fontSize: 15, flexShrink: 1, marginLeft: 4 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Theme.spacing.md, paddingTop: Theme.spacing.xl, paddingBottom: Theme.spacing.sm },
  headerLogoWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border },
  headerLogo: { width: 32, height: 32 },
  
  bellBtn: { padding: 8, position: 'relative' },
  bellBadge: { position: 'absolute', top: 6, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: Theme.colors.danger, borderWidth: 2, borderColor: Theme.colors.background },

  banner: { borderRadius: Theme.radius.xl, padding: 24, height: 180, justifyContent: 'center', overflow: 'hidden' },
  bannerGlow: { position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)' },
  bannerContent: { width: '65%', zIndex: 2 },
  bannerArtWrap: { position: 'absolute', right: -15, bottom: -20, zIndex: 1, transform: [{ rotate: '-15deg' }] },
  bannerArtEmoji: { fontSize: 130 },
  bannerBadge: { color: '#fff', fontSize: 12, fontWeight: '800', opacity: 0.9, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' },
  bannerTitle: { color: '#fff', fontSize: 26, fontWeight: '900', lineHeight: 30 },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 4, fontWeight: '500' },
  bannerBtn: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: Theme.radius.full },
  bannerBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  sectionTitle: { color: Theme.colors.text, fontSize: 20, fontWeight: '900', paddingHorizontal: Theme.spacing.md, marginTop: Theme.spacing.xxl, marginBottom: Theme.spacing.md },
  emptyMatches: { color: Theme.colors.textMuted, fontSize: 15, paddingHorizontal: Theme.spacing.md },

  matchCard: { width: 260 },
  matchArena: { color: Theme.colors.text, fontWeight: '800', fontSize: 16 },
  matchInfo: { color: Theme.colors.textMuted, fontSize: 13, marginTop: 4, textTransform: 'capitalize', fontWeight: '500' },
  matchSpots: { color: Theme.colors.danger, fontWeight: '800', fontSize: 14, marginTop: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: Theme.colors.border, borderWidth: 2, borderColor: Theme.colors.surface },
  matchPriceRow: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  matchPrice: { color: Theme.colors.text, fontWeight: '900', fontSize: 18 },
});
