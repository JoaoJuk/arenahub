import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Search, Star, Heart, SlidersHorizontal } from 'lucide-react-native';
import { api } from '@/api';
import { Theme, brl } from '@/theme';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';

const SPORTS = [
  { label: 'Todos', value: '' },
  { label: 'Futebol', value: 'futebol' },
  { label: 'Futsal', value: 'futsal' },
  { label: 'Beach tennis', value: 'beach tennis' },
  { label: 'Vôlei', value: 'vôlei' },
  { label: 'Basquete', value: 'basquete' },
];

export default function SearchTab() {
  const [q, setQ] = useState('');
  const [sport, setSport] = useState('');
  const [arenas, setArenas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const a = await api.arenas(q, sport);
      setArenas(a);
    } catch {} finally { setLoading(false); }
  }, [q, sport]);

  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={{ maxWidth: 520, width: '100%', alignSelf: 'center', paddingBottom: Theme.spacing.xxl }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={Theme.colors.primary} />}
    >
      <View style={{ paddingHorizontal: Theme.spacing.md, marginTop: Theme.spacing.lg }}>
        <View style={s.searchContainer}>
          <Search color={Theme.colors.textMuted} size={20} style={s.searchIcon} />
          <TextInput
            style={s.search}
            placeholder="Buscar arenas, esportes..."
            placeholderTextColor={Theme.colors.textMuted}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={load}
            returnKeyType="search"
          />
          <TouchableOpacity style={s.filterBtn} activeOpacity={0.7}>
            <SlidersHorizontal color={Theme.colors.text} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {SPORTS.map((sp) => {
          const sel = sport === sp.value;
          return (
            <TouchableOpacity key={sp.value || 'all'} style={[s.chip, sel && s.chipSel]} activeOpacity={0.7} onPress={() => setSport(sp.value)}>
              <Text style={[s.chipTxt, sel && s.chipTxtSel]}>{sp.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={s.sectionTitle}>Arenas na região</Text>
      <View style={{ paddingHorizontal: Theme.spacing.md, gap: Theme.spacing.md }}>
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} height={200} borderRadius={Theme.radius.md} />)
        ) : arenas.length === 0 ? (
          <Text style={{ color: Theme.colors.textMuted, textAlign: 'center', marginTop: 12 }}>Nenhuma arena encontrada.</Text>
        ) : (
          arenas.map((a) => (
            <TouchableOpacity key={a.id} activeOpacity={0.8} onPress={() => router.push(`/arena/${a.id}`)}>
              <Card padding="none" style={s.arenaCardNew}>
                <View>
                  <Image source={{ uri: a.photoUrl }} style={s.arenaPhotoNew} contentFit="cover" transition={200} cachePolicy="memory-disk" />
                  <TouchableOpacity style={s.heartBtn} activeOpacity={0.7}>
                    <Heart color="#FFF" size={20} />
                  </TouchableOpacity>
                </View>
                <View style={s.arenaContentNew}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.arenaName} numberOfLines={1}>{a.name}</Text>
                    <View style={s.ratingBadge}>
                      <Star color={Theme.colors.warning} fill={Theme.colors.warning} size={12} />
                      <Text style={s.arenaRating}>{a.rating}</Text>
                    </View>
                  </View>
                  <View style={s.tagRow}>
                    {a.sports.slice(0, 3).map((sp: string) => (
                      <View key={sp} style={s.tag}><Text style={s.tagTxt}>{sp}</Text></View>
                    ))}
                  </View>
                  <View style={s.arenaBottomRow}>
                    <Text style={s.arenaPrice}>A partir de <Text style={s.arenaPriceNum}>{brl(a.priceFrom)}</Text>/h</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Theme.colors.background },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, borderRadius: Theme.radius.lg, borderWidth: 1, borderColor: Theme.colors.border },
  searchIcon: { marginLeft: 16, marginRight: 8 },
  search: { flex: 1, color: Theme.colors.text, paddingVertical: 14, fontSize: 16 },
  filterBtn: { padding: 12, borderLeftWidth: 1, borderLeftColor: Theme.colors.border, paddingHorizontal: 16 },

  chipRow: { paddingHorizontal: Theme.spacing.md, gap: 8, paddingTop: Theme.spacing.lg, paddingBottom: Theme.spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Theme.radius.full, backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border },
  chipSel: { backgroundColor: Theme.colors.text, borderColor: Theme.colors.text },
  chipTxt: { ...Theme.typography.captionSemibold, color: Theme.colors.textMuted },
  chipTxtSel: { color: Theme.colors.background },

  sectionTitle: { ...Theme.typography.h3, color: Theme.colors.text, paddingHorizontal: Theme.spacing.md, marginTop: Theme.spacing.xxl, marginBottom: Theme.spacing.md },

  arenaCardNew: { marginBottom: 12, ...Theme.shadow.raised },
  arenaPhotoNew: { width: '100%', height: 200, backgroundColor: Theme.colors.border },
  heartBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  arenaContentNew: { padding: 16 },
  arenaName: { ...Theme.typography.h3, color: Theme.colors.text, flexShrink: 1, marginRight: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surfaceHighlight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Theme.radius.xs, gap: 4 },
  arenaRating: { ...Theme.typography.small, color: Theme.colors.text },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tag: { backgroundColor: Theme.colors.surfaceHighlight, borderRadius: Theme.radius.xs, paddingHorizontal: 8, paddingVertical: 4 },
  tagTxt: { color: Theme.colors.textDim, fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
  arenaBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  arenaPrice: { color: Theme.colors.textMuted, fontSize: 14 },
  arenaPriceNum: { ...Theme.typography.price, color: Theme.colors.text, fontSize: 16 },
});
