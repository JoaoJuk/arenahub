import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '@/api';
import { Theme, brl } from '@/theme';

const STATUS: Record<string, [string, string]> = {
  pending: ['Aguardando pagamento', Theme.colors.textMuted],
  confirmed: ['Confirmada', Theme.colors.primary],
  cancelled: ['Cancelada', Theme.colors.danger],
  done: ['Realizada', Theme.colors.textMuted],
};

export default function Bookings() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.myBookings()); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.wrap}>
      <FlatList
        data={items} keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Theme.colors.primary} />}
        ListEmptyComponent={<Text style={s.empty}>Você ainda não tem reservas.</Text>}
        renderItem={({ item }) => {
          const [label, color] = STATUS[item.status] || [item.status, Theme.colors.textMuted];
          return (
            <TouchableOpacity style={s.card} onPress={() => router.push(`/booking/${item.id}`)}>
              <Text style={s.title}>{item.court.arena.name}</Text>
              <Text style={s.mut}>{item.court.name} · {item.date.split('-').reverse().join('/')} · {item.startTime}–{item.endTime}</Text>
              <View style={s.row}>
                <Text style={[s.status, { color }]}>{label}</Text>
                <Text style={s.amount}>{brl(item.totalAmount)}</Text>
              </View>
              {item.paymentMode === 'split' && (
                <Text style={s.split}>Divisão: {item.paidShares}/{item.splitCount} cotas ok</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Theme.colors.background, padding: Theme.spacing.md },
  empty: { color: Theme.colors.textMuted, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: Theme.colors.surface, borderRadius: Theme.radius.md, borderWidth: 1, borderColor: Theme.colors.border, padding: Theme.spacing.md, marginBottom: Theme.spacing.sm },
  title: { ...Theme.typography.bodySemibold, color: Theme.colors.text },
  mut: { ...Theme.typography.caption, color: Theme.colors.textMuted, marginTop: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: Theme.spacing.sm },
  status: { ...Theme.typography.captionSemibold },
  amount: { ...Theme.typography.price, color: Theme.colors.text, fontSize: 16 },
  split: { ...Theme.typography.caption, color: Theme.colors.primary, marginTop: 4 },
});
