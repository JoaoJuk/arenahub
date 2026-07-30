import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/api';
import { C, brl } from '@/theme';

const COLOR: Record<string, string> = { confirmed: C.green, pending: C.mut, cancelled: C.danger, done: C.mut };

export default function AdminHome() {
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setS(await api.adminStats()); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function cancel(id: string) {
    Alert.alert('Cancelar reserva?', 'Ação de moderação — não pode ser desfeita.', [
      { text: 'Voltar' },
      { text: 'Cancelar reserva', style: 'destructive', onPress: () => api.adminCancelBooking(id).then(load) },
    ]);
  }

  return (
    <ScrollView
      style={st.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.green} />}
    >
      <Text style={st.hi}>Plataforma</Text>
      <View style={st.grid}>
        <View style={st.stat}><Text style={st.statLbl}>USUÁRIOS</Text><Text style={st.statVal}>{s?.users ?? '—'}</Text></View>
        <View style={st.stat}><Text style={st.statLbl}>ARENAS</Text><Text style={st.statVal}>{s?.arenas ?? '—'}</Text></View>
        <View style={st.stat}><Text style={st.statLbl}>RESERVAS</Text><Text style={st.statVal}>{s?.bookings ?? '—'}</Text></View>
        <View style={st.stat}><Text style={st.statLbl}>GMV CONFIRMADO</Text><Text style={[st.statVal, { color: C.green }]}>{s ? brl(s.gmv) : '—'}</Text></View>
      </View>

      <Text style={st.sec}>Últimas reservas</Text>
      {s?.recent?.map((b: any) => (
        <View key={b.id} style={st.card}>
          <View style={st.row}>
            <Text style={st.title} numberOfLines={1}>{b.arena} · {b.court}</Text>
            <Text style={{ color: COLOR[b.status] || C.mut, fontWeight: '700', fontSize: 12 }}>{b.status}</Text>
          </View>
          <View style={[st.row, { marginTop: 4 }]}>
            <Text style={st.mut}>{b.player} · {b.date.split('-').reverse().slice(0, 2).join('/')} {b.startTime}</Text>
            <Text style={{ color: C.txt, fontWeight: '700', fontSize: 13 }}>{brl(b.totalAmount)}</Text>
          </View>
          {(b.status === 'pending' || b.status === 'confirmed') && (
            <TouchableOpacity onPress={() => cancel(b.id)}>
              <Text style={{ color: C.danger, fontSize: 12, marginTop: 8, fontWeight: '600' }}>Cancelar reserva (moderação)</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  hi: { color: C.txt, fontSize: 20, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  stat: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, width: '47.5%' },
  statLbl: { color: C.mut, fontSize: 10.5, fontWeight: '700' },
  statVal: { color: C.txt, fontSize: 20, fontWeight: '800', marginTop: 4 },
  sec: { color: C.txt, fontSize: 16, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: C.txt, fontWeight: '700', fontSize: 13.5, flexShrink: 1, marginRight: 8 },
  mut: { color: C.mut, fontSize: 12.5 },
});
