import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { api } from '@/api';
import { Theme, inputText, type Colors } from '@/theme';
import { useColors, useStyles } from '@/theme-context';
import { useFavorites, toggleFavorite } from '@/favorites';
import { Chip } from '@/components/Chip';
import { ArenaCard } from '@/components/ArenaCard';
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
  const c = useColors();
  const s = useStyles(styles);
  const [q, setQ] = useState('');
  const [sport, setSport] = useState('');
  const [arenas, setArenas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const favorites = useFavorites();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
      contentContainerStyle={[s.content, { paddingTop: insets.top + Theme.spacing.stack }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.primary} />}
    >
      <View style={s.searchRow}>
        <View style={s.field}>
          <Search color={c.textMuted} size={20} />
          <TextInput
            style={s.input}
            placeholder="Buscar arenas, esportes..."
            placeholderTextColor={c.textDim}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={load}
            returnKeyType="search"
            accessibilityLabel="Buscar arenas"
          />
        </View>
        <TouchableOpacity
          style={s.filterBtn}
          activeOpacity={0.85}
          onPress={load}
          accessibilityRole="button"
          accessibilityLabel="Filtros"
        >
          <SlidersHorizontal color={c.onInverse} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {SPORTS.map((sp) => (
          <Chip
            key={sp.value || 'all'}
            label={sp.label}
            selected={sport === sp.value}
            onPress={() => setSport(sp.value)}
          />
        ))}
      </ScrollView>

      <View style={s.list}>
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} height={260} borderRadius={Theme.radius.lg} />)
        ) : arenas.length === 0 ? (
          <View style={s.emptyBox}>
            <Search color={c.textDim} size={40} />
            <Text style={s.emptyTitle}>Nenhuma arena encontrada</Text>
            <Text style={s.emptySub}>Tente outro nome, outra cidade ou remova o filtro de esporte.</Text>
          </View>
        ) : (
          arenas.map((a) => (
            <ArenaCard
              key={a.id}
              arena={a}
              favorite={favorites.includes(a.id)}
              onToggleFavorite={() => toggleFavorite(a.id)}
              onPress={() => router.push(`/arena/${a.id}`)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = (c: Colors) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.background },
  content: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: Theme.spacing.section,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.stack,
    paddingHorizontal: Theme.spacing.margin,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    height: 48,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.full,
    backgroundColor: c.surfaceGray,
  },
  input: { flex: 1, ...inputText(Theme.typography.body), color: c.text, paddingVertical: 0 },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.inverse,
  },

  chipRow: {
    paddingHorizontal: Theme.spacing.margin,
    gap: Theme.spacing.sm,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.sm,
  },

  list: { paddingHorizontal: Theme.spacing.margin, gap: Theme.spacing.lg, marginTop: Theme.spacing.md },

  emptyBox: { alignItems: 'center', gap: Theme.spacing.sm, paddingVertical: Theme.spacing.section },
  emptyTitle: { ...Theme.typography.h3, color: c.text, marginTop: Theme.spacing.sm },
  emptySub: { ...Theme.typography.caption, color: c.textMuted, textAlign: 'center' },
});
