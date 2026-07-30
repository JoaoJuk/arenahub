import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '@/api';
import { C, brl } from '@/theme';

const STATUS: Record<string, [string, string]> = {
  pending: ['Aguardando pagamento', C.mut],
  confirmed: ['Confirmada ✔', C.green],
  cancelled: ['Cancelada', C.danger],
  done: ['Realizada', C.mut],
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.green} />}
        ListEmptyComponent={<Text style={{ color: C.mut, textAlign: 'center', marginTop: 40 }}>Você ainda não tem reservas.</Text>}
        renderItem={({ item }) => {
          const [label, color] = STATUS[item.status] || [item.status, C.mut];
          return (
            <TouchableOpacity style={s.card} onPress={() => router.push(`/booking/${item.id}`)}>
              <Text style={s.title}>{item.court.arena.name}</Text>
              <Text style={s.mut}>{item.court.name} · {item.date.split('-').reverse().join('/')} · {item.startTime}–{item.endTime}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ color, fontWeight: '600' }}>{label}</Text>
                <Text style={{ color: C.txt, fontWeight: '700' }}>{brl(item.totalAmount)}</Text>
              </View>
              {item.paymentMode === 'split' && (
                <Text style={{ color: C.green, marginTop: 4, fontSize: 13 }}>
                  Divisão: {item.paidShares}/{item.splitCount} cotas ok
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 16 },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 16, marginBottom: 12 },
  title: { color: C.txt, fontSize: 16, fontWeight: '700' },
  mut: { color: C.mut, marginTop: 3, fontSize: 13 },
});
