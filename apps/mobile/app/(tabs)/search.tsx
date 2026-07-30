import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Image, StyleSheet,
  RefreshControl, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'react-native-safe-area-context';
import { useRouter as useExpoRouter } from 'expo-router';
import { Search, MapPin, ChevronDown, Star, Heart, SlidersHorizontal } from 'lucide-react-native';
import { api } from '@/api';
import { Theme, brl } from '@/theme';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';

const CATEGORIES = [
  { emoji: '⚽', label: 'Futebol', value: 'futebol', color: '#4CAF50' },
  { emoji: '🎾', label: 'Beach', value: 'beach tennis', color: '#E91E63' },
  { emoji: '🏐', label: 'Vôlei', value: 'vôlei', color: '#2196F3' },
  { emoji: '🏀', label: 'Basquete', value: 'basquete', color: '#FF9800' },
];

export default function SearchTab() {
  const [q, setQ] = useState('');
  const [sport, setSport] = useState('');
  const [arenas, setArenas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useExpoRouter();

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

      <View style={s.catRow}>
        {CATEGORIES.map((c) => {
          const sel = sport === c.value;
          return (
            <TouchableOpacity key={c.value} style={s.catItem} activeOpacity={0.6} onPress={() => setSport(sel ? '' : c.value)}>
              <Text style={[s.catEmoji, sel && { transform: [{ scale: 1.15 }] }]}>{c.emoji}</Text>
              <Text style={[s.catLabel, sel && { color: Theme.colors.text, fontWeight: '800' }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
                  <Image source={{ uri: a.photoUrl }} style={s.arenaPhotoNew} />
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
                    <Text style={s.arenaPrice}>
                      A partir de <Text style={{ fontWeight: '800' }}>{brl(a.priceFrom)}</Text>/h
                    </Text>
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

  catRow: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: Theme.spacing.sm, paddingTop: Theme.spacing.lg, paddingBottom: Theme.spacing.sm },
  catItem: { alignItems: 'center', width: 72 },
  catEmoji: { fontSize: 44, marginBottom: 4 },
  catLabel: { color: Theme.colors.textMuted, fontSize: 12, marginTop: 4, fontWeight: '600' },

  sectionTitle: { color: Theme.colors.text, fontSize: 20, fontWeight: '900', paddingHorizontal: Theme.spacing.md, marginTop: Theme.spacing.xxl, marginBottom: Theme.spacing.md },

  arenaCardNew: { marginBottom: 12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, shadowOpacity: 0.05, elevation: 3 },
  arenaPhotoNew: { width: '100%', height: 200, backgroundColor: Theme.colors.border },
  heartBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  arenaContentNew: { padding: 16 },
  arenaName: { color: Theme.colors.text, fontSize: 18, fontWeight: '800', flexShrink: 1, marginRight: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surfaceHighlight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  arenaRating: { color: Theme.colors.warning, fontSize: 13, fontWeight: '800' },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tag: { backgroundColor: Theme.colors.surfaceHighlight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  tagTxt: { color: Theme.colors.textDim, fontSize: 12, textTransform: 'uppercase', fontWeight: '800' },
  arenaBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  arenaPrice: { color: Theme.colors.primary, fontSize: 16 },
});
