import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/api';
import { C, brl } from '@/theme';

const SPORTS = ['futebol', 'beach tennis', 'vôlei', 'basquete', 'futsal', 'futevôlei'];

export default function OwnerCourts() {
  const [arenas, setArenas] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  // formulário de quadra
  const [name, setName] = useState('');
  const [sport, setSport] = useState('futebol');
  const [price, setPrice] = useState('160');
  const [photo, setPhoto] = useState('');
  const [openHour, setOpenHour] = useState('8');
  const [closeHour, setCloseHour] = useState('23');
  // formulário de arena (primeiro acesso)
  const [aName, setAName] = useState('');
  const [aCity, setACity] = useState('');
  const [aAddr, setAAddr] = useState('');

  const load = useCallback(async () => {
    try { setArenas(await api.ownerArenas()); } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function addArena() {
    if (!aName || !aCity || !aAddr) { Alert.alert('Ops', 'Preencha nome, cidade e endereço.'); return; }
    setBusy(true);
    try {
      await api.createArena({ name: aName, city: aCity, address: aAddr, sports: [sport] });
      setAName(''); setACity(''); setAAddr('');
      await load();
    } catch (e: any) { Alert.alert('Ops', e.message); } finally { setBusy(false); }
  }

  async function addCourt() {
    const arena = arenas[0];
    if (!arena) return;
    if (!name || !price) { Alert.alert('Ops', 'Preencha o nome e o preço.'); return; }
    if (!photo.trim().startsWith('http')) {
      Alert.alert('Foto obrigatória', 'Cole o link de uma foto da quadra — é ela que o jogador vê na hora de escolher. Dica: suba a foto no imgur.com e copie o link.');
      return;
    }
    setBusy(true);
    try {
      await api.createCourt(arena.id, {
        name, sport,
        pricePerHour: Math.round(parseFloat(price.replace(',', '.')) * 100),
        openHour: parseInt(openHour, 10) || 8,
        closeHour: parseInt(closeHour, 10) || 23,
        photoUrl: photo.trim(),
      });
      setName(''); setPhoto('');
      await load();
      Alert.alert('Pronto', 'Quadra cadastrada! Já aparece na busca dos jogadores.');
    } catch (e: any) { Alert.alert('Ops', e.message); } finally { setBusy(false); }
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {arenas.length === 0 ? (
        <>
          <Text style={s.sec}>Cadastre sua arena</Text>
          <Text style={s.mut}>Primeiro passo: os dados do seu estabelecimento.</Text>
          <TextInput style={s.input} placeholder="Nome da arena" placeholderTextColor={C.mut} value={aName} onChangeText={setAName} />
          <TextInput style={s.input} placeholder="Cidade" placeholderTextColor={C.mut} value={aCity} onChangeText={setACity} />
          <TextInput style={s.input} placeholder="Endereço" placeholderTextColor={C.mut} value={aAddr} onChangeText={setAAddr} />
          <TouchableOpacity style={s.cta} onPress={addArena} disabled={busy}>
            <Text style={s.ctaTxt}>{busy ? 'Salvando…' : 'Criar arena'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {arenas.map((a) => (
            <View key={a.id} style={s.card}>
              <Text style={s.title}>{a.name}</Text>
              <Text style={s.mut}>{a.address} — {a.city}</Text>
              {a.courts.map((c: any) => (
                <View key={c.id} style={s.courtRow}>
                  <Text style={{ color: C.txt, fontSize: 13.5 }}>{c.name} · {c.sport}</Text>
                  <Text style={{ color: C.green, fontWeight: '700', fontSize: 13 }}>{brl(c.pricePerHour)}/h</Text>
                </View>
              ))}
              {a.courts.length === 0 && <Text style={[s.mut, { marginTop: 8 }]}>Nenhuma quadra ainda.</Text>}
            </View>
          ))}

          <Text style={s.sec}>Nova quadra</Text>
          <TextInput style={s.input} placeholder="Nome (ex.: Quadra 3 — Society)" placeholderTextColor={C.mut} value={name} onChangeText={setName} />
          <Text style={s.lbl}>ESPORTE</Text>
          <View style={s.chips}>
            {SPORTS.map((sp) => (
              <TouchableOpacity key={sp} style={[s.chip, sport === sp && s.chipOn]} onPress={() => setSport(sp)}>
                <Text style={{ color: sport === sp ? '#04170b' : C.mut, fontSize: 12.5, fontWeight: '600' }}>{sp}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.lbl}>PREÇO/HORA (R$)</Text>
              <TextInput style={s.input} keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.lbl}>ABRE (h)</Text>
              <TextInput style={s.input} keyboardType="number-pad" value={openHour} onChangeText={setOpenHour} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.lbl}>FECHA (h)</Text>
              <TextInput style={s.input} keyboardType="number-pad" value={closeHour} onChangeText={setCloseHour} />
            </View>
          </View>
          <Text style={s.lbl}>FOTO DA QUADRA (OBRIGATÓRIA — LINK DA IMAGEM)</Text>
          <TextInput style={s.input} placeholder="https://…" placeholderTextColor={C.mut}
            autoCapitalize="none" value={photo} onChangeText={setPhoto} />
          <Text style={[s.mut, { marginTop: 6 }]}>É a foto que o jogador vê no app. Upload direto do celular entra na fase 2.</Text>
          <TouchableOpacity style={s.cta} onPress={addCourt} disabled={busy}>
            <Text style={s.ctaTxt}>{busy ? 'Salvando…' : 'Cadastrar quadra'}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, marginBottom: 12 },
  title: { color: C.txt, fontSize: 16, fontWeight: '800' },
  mut: { color: C.mut, fontSize: 12.5, marginTop: 3 },
  courtRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, marginTop: 4 },
  sec: { color: C.txt, fontSize: 16, fontWeight: '800', marginTop: 14, marginBottom: 8 },
  lbl: { color: C.mut, fontSize: 10.5, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 12, color: C.txt, padding: 13, fontSize: 15, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  chipOn: { backgroundColor: C.green, borderColor: C.green },
  cta: { backgroundColor: C.green, borderRadius: 12, padding: 15, marginTop: 18 },
  ctaTxt: { color: '#04170b', fontWeight: '800', textAlign: 'center', fontSize: 15 },
});
