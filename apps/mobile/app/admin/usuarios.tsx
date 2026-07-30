import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/api';
import { C } from '@/theme';

const BADGE: Record<string, [string, string, string]> = {
  player: ['JOGADOR', '#13232e', '#60a5fa'],
  owner: ['DONO', '#132e1d', C.green],
  admin: ['ADMIN', '#2e2713', '#e8c968'],
};

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await api.adminUsers()); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function toggleRole(u: any) {
    const next = u.role === 'player' ? 'owner' : 'player';
    Alert.alert(
      'Alterar papel',
      `${u.name}: ${u.role === 'player' ? 'tornar DONO DE ARENA' : 'voltar a JOGADOR'}?`,
      [
        { text: 'Voltar' },
        { text: 'Confirmar', onPress: () => api.adminSetRole(u.id, next).then(load).catch((e) => Alert.alert('Ops', e.message)) },
      ],
    );
  }

  return (
    <View style={s.wrap}>
      <FlatList
        data={users} keyExtractor={(u) => u.id} contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.green} />}
        renderItem={({ item: u }) => {
          const [label, bg, fg] = BADGE[u.role] || BADGE.player;
          const initials = u.name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
          return (
            <View style={s.card}>
              <View style={s.avatar}><Text style={{ color: C.green, fontWeight: '800', fontSize: 12 }}>{initials}</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.name}>{u.name}</Text>
                <Text style={s.mut}>{u.email}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={[s.badge, { backgroundColor: bg }]}><Text style={{ color: fg, fontSize: 10, fontWeight: '800' }}>{label}</Text></View>
                {u.role !== 'admin' && (
                  <TouchableOpacity onPress={() => toggleRole(u)}>
                    <Text style={{ color: C.green, fontSize: 11.5, fontWeight: '600' }}>
                      {u.role === 'player' ? 'tornar dono' : 'tornar jogador'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1c2b22', borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  name: { color: C.txt, fontWeight: '700', fontSize: 14 },
  mut: { color: C.mut, fontSize: 11.5, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
