import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/api';
import { C, brl } from '@/theme';

const ZINC = '#d4d4d8';
const GOLD = '#e8c968';
const NOW_GREEN = '#4ade80';

function nextDays(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      dayNum: String(d.getDate()).padStart(2, '0'),
      weekday: i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
    };
  });
}

const payBadge = (booking: any): [string, string, string] => {
  if (booking.paymentMode === 'split') return [`DIVISÃO ${booking.paidShares}/${booking.splitCount}`, '#2e2713', GOLD];
  if (booking.paymentMode === 'on_site') return ['NO LOCAL', '#13232e', '#60a5fa'];
  if (booking.status === 'confirmed') return ['PAGO VIA PIX', '#132e1d', C.green];
  return ['AGUARDANDO', '#232323', C.mut];
};

export default function OwnerAgenda() {
  const [arenas, setArenas] = useState<any[]>([]);
  const [court, setCourt] = useState<any>(null);
  const [date, setDate] = useState(nextDays()[0].iso);
  const [slots, setSlots] = useState<any[]>([]);
  const days = nextDays();
  const today = days[0].iso;

  const loadArenas = useCallback(async () => {
    try {
      const a = await api.ownerArenas();
      setArenas(a);
      if (!court && a[0]?.courts?.[0]) setCourt(a[0].courts[0]);
    } catch {}
  }, [court]);
  useFocusEffect(useCallback(() => { loadArenas(); }, [loadArenas]));

  const loadAgenda = useCallback(async () => {
    if (!court) return;
    try { setSlots((await api.ownerAgenda(court.id, date)).slots); } catch { setSlots([]); }
  }, [court, date]);
  useEffect(() => { loadAgenda(); }, [loadAgenda]);

  function onFreePress(slot: any) {
    Alert.alert(`${slot.startTime}–${slot.endTime}`, 'O que você quer fazer com este horário?', [
      { text: 'Voltar' },
      { text: 'Reserva manual (em breve)' },
      {
        text: 'Bloquear horário', style: 'destructive',
        onPress: () => api.ownerBlock({ courtId: court.id, date, startTime: slot.startTime, endTime: slot.endTime })
          .then(loadAgenda).catch((e) => Alert.alert('Ops', e.message)),
      },
    ]);
  }

  const unblock = (slot: any) =>
    api.ownerUnblock(slot.booking.id).then(loadAgenda).catch((e) => Alert.alert('Ops', e.message));

  const courts = arenas.flatMap((a) => a.courts);
  const now = new Date();
  const isToday = date === today;
  const counts = {
    free: slots.filter((x) => x.state === 'free').length,
    booked: slots.filter((x) => x.state === 'booked').length,
    blocked: slots.filter((x) => x.state === 'blocked').length,
  };
  const noRealBookings = counts.booked === 0;

  const Badge = ({ label, bg, fg }: { label: string; bg: string; fg: string }) => (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Quadra */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {courts.map((c: any) => {
          const sel = court?.id === c.id;
          return (
            <TouchableOpacity key={c.id} style={[s.pill, sel && s.pillOn]} onPress={() => setCourt(c)}>
              <Text style={{ color: sel ? '#04170b' : C.txt, fontWeight: '700', fontSize: 12.5 }}>{c.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Dia */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
        {days.map((d) => {
          const sel = date === d.iso;
          return (
            <TouchableOpacity key={d.iso} style={[s.day, sel && s.dayOn]} onPress={() => setDate(d.iso)}>
              <Text style={{ color: sel ? '#04170b' : C.txt, fontSize: 15, fontWeight: '800' }}>{d.dayNum}</Text>
              <Text style={{ color: sel ? '#04170b' : ZINC, fontSize: 10, textTransform: 'capitalize' }}>{d.weekday}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Resumo do dia */}
      <View style={[s.rowGap, { marginTop: 16 }]}>
        <Text style={s.count}><Text style={{ color: C.green }}>●</Text> {counts.booked} reservados</Text>
        <Text style={s.count}><Text style={{ color: C.mut }}>●</Text> {counts.free} livres</Text>
        {counts.blocked > 0 && <Text style={s.count}><Text style={{ color: C.danger }}>●</Text> {counts.blocked} bloqueados</Text>}
      </View>

      {/* Linha do tempo */}
      <View style={{ marginTop: 12 }}>
        {slots.length === 0 && <Text style={{ color: C.mut, fontSize: 13 }}>Selecione uma quadra.</Text>}
        {slots.map((sl) => {
          const slotHour = Number(sl.startTime.slice(0, 2));
          const showNowLine = isToday && now.getHours() === slotHour;
          const nowFrac = now.getMinutes() / 60;
          return (
            <View key={sl.startTime} style={{ position: 'relative' }}>
              {/* Indicador de agora (estilo Google Calendar) */}
              {showNowLine && (
                <View style={[s.nowLine, { top: `${Math.round(nowFrac * 100)}%` }]} pointerEvents="none">
                  <View style={s.nowDot} />
                  <View style={s.nowBar} />
                </View>
              )}

              {sl.state === 'free' && (
                <TouchableOpacity style={s.freeCard} onPress={() => onFreePress(sl)} activeOpacity={0.6}>
                  <Text style={s.hourInline}>{sl.startTime}</Text>
                  <Text style={{ color: C.mut, fontSize: 13, flex: 1 }}>Livre</Text>
                  <Text style={{ color: C.green, fontSize: 18, fontWeight: '600' }}>＋</Text>
                </TouchableOpacity>
              )}

              {sl.state === 'booked' && (() => {
                const [label, bg, fg] = payBadge(sl.booking);
                return (
                  <View style={s.bookedCard}>
                    <Text style={s.hourInline}>{sl.startTime}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.txt, fontWeight: '800', fontSize: 13.5 }}>{sl.booking.player}</Text>
                      <Text style={{ color: C.mut, fontSize: 11.5, marginTop: 2 }}>
                        {sl.booking.splitCount ? `${sl.booking.splitCount} pessoas · ` : ''}{brl(sl.booking.totalAmount)}
                      </Text>
                    </View>
                    <Badge label={label} bg={bg} fg={fg} />
                  </View>
                );
              })()}

              {sl.state === 'blocked' && (
                <View style={[s.bookedCard, { borderLeftColor: C.danger }]}>
                  <Text style={s.hourInline}>{sl.startTime}</Text>
                  <Text style={{ color: ZINC, fontWeight: '700', fontSize: 13, flex: 1 }}>🔒 Bloqueado</Text>
                  <TouchableOpacity onPress={() => unblock(sl)}>
                    <Text style={{ color: C.green, fontSize: 12, fontWeight: '700' }}>Liberar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Prévia (só aparece enquanto o dia não tem reservas reais) */}
      {slots.length > 0 && noRealBookings && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: C.mut, fontSize: 11.5, marginBottom: 8 }}>
            PRÉVIA — assim aparecem os horários reservados:
          </Text>
          <View style={s.bookedCard}>
            <Text style={s.hourInline}>19:00</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.txt, fontWeight: '800', fontSize: 13.5 }}>João Souza</Text>
              <Text style={{ color: C.mut, fontSize: 11.5, marginTop: 2 }}>4 pessoas · R$ 160,00</Text>
            </View>
            <Badge label="PAGO VIA PIX" bg="#132e1d" fg={C.green} />
          </View>
          <View style={[s.bookedCard, { marginTop: 8 }]}>
            <Text style={s.hourInline}>20:00</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.txt, fontWeight: '800', fontSize: 13.5 }}>Marcos Lima</Text>
              <Text style={{ color: C.mut, fontSize: 11.5, marginTop: 2 }}>2 pessoas · R$ 90,00</Text>
            </View>
            <Badge label="NO LOCAL" bg="#13232e" fg="#60a5fa" />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  pill: { backgroundColor: '#1a2820', borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  pillOn: { backgroundColor: C.green, borderColor: C.green },
  day: { backgroundColor: '#1a2820', borderWidth: 1, borderColor: C.line, borderRadius: 13, width: 54, paddingVertical: 9, alignItems: 'center' },
  dayOn: { backgroundColor: C.green, borderColor: C.green },
  rowGap: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  count: { color: ZINC, fontSize: 12 },
  hourInline: { color: C.mut, fontSize: 11.5, fontWeight: '700', width: 44 },
  // Livre: fundo sutil, sem borda tracejada, compacto
  freeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(22,36,28,0.45)', borderRadius: 12,
    paddingVertical: 11, paddingHorizontal: 14, marginBottom: 6,
  },
  // Ocupado: fundo sólido + barra lateral
  bookedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.card, borderLeftWidth: 4, borderLeftColor: C.green,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 6,
  },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  // Indicador do horário atual
  nowLine: { position: 'absolute', left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center' },
  nowDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: NOW_GREEN },
  nowBar: { flex: 1, height: 2, backgroundColor: NOW_GREEN, opacity: 0.9 },
});
