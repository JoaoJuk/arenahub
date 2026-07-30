import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { api, setToken, setRole } from '@/api';
import { C } from '@/theme';

export default function AdminProfile() {
  const [me, setMe] = useState<any>(null);
  const router = useRouter();
  useEffect(() => { api.me().then(setMe).catch(() => {}); }, []);

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <Text style={s.name}>{me?.name ?? '…'}</Text>
        <Text style={s.mut}>{me?.email}</Text>
        <Text style={[s.mut, { color: '#e8c968', fontWeight: '700' }]}>Administrador da plataforma</Text>
      </View>
      <TouchableOpacity
        style={s.out}
        onPress={async () => { await setToken(null); await setRole(null); router.replace('/login'); }}
      >
        <Text style={{ color: C.danger, fontWeight: '700', textAlign: 'center' }}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, padding: 16 },
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 20, marginBottom: 16 },
  name: { color: C.txt, fontSize: 20, fontWeight: '800' },
  mut: { color: C.mut, marginTop: 4 },
  out: { borderWidth: 1, borderColor: C.danger, borderRadius: 12, padding: 14 },
});
