import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/api';
import { C, brl } from '@/theme';

const ZINC = '#d4d4d8';
const GOLD = '#e8c968';

const PAY_BADGE: Record<string, [string, string]> = {
  full: ['💳 pago no app', C.green],
  split: ['🔗 divisão', GOLD],
  on_site: ['🏟️ no local', '#60a5fa'],
};

export default function OwnerHome() {
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setS(await api.ownerSummary()); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const maxCount = Math.max(1, ...(s?.series?.map((d: any) => d.count) ?? [1]));

  return (
    <ScrollView
      style={st.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.green} />}
    >
      {/* Cabeçalho da loja */}
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Text style={st.arenaName}>{s?.arenaName ?? '…'}</Text>
          <View style={st.row}>
            <View style={[st.dot, { backgroundColor: s?.openNow ? C.green : C.mut }]} />
            <Text style={{ color: s?.openNow ? C.green : C.mut, fontSize: 12.5, fontWeight: '700' }}>
              {s == null ? '' : s.openNow ? 'Aberta agora' : 'Fechada'}
            </Text>
            {s?.rating != null && <Text style={{ color: ZINC, fontSize: 12.5 }}>  ·  ⭐ {s.rating}</Text>}
            {s?.courtCount != null && <Text style={{ color: ZINC, fontSize: 12.5 }}>  ·  {s.courtCount} quadras</Text>}
          </View>
        </View>
      </View>

      {/* Ações pendentes */}
      {(s?.pending?.splitsIncomplete > 0 || s?.pending?.onSiteToday > 0) && (
        <View style={st.pendingCard}>
          <Text style={{ color: GOLD, fontWeight: '800', fontSize: 13, marginBottom: 6 }}>⚠️ PRECISA DA SUA ATENÇÃO</Text>
          {s.pending.splitsIncomplete > 0 && (
            <Text style={st.pendingItem}>• {s.pending.splitsIncomplete} reserva(s) com divisão de pagamento incompleta</Text>
          )}
          {s.pending.onSiteToday > 0 && (
            <Text style={st.pendingItem}>• {s.pending.onSiteToday} pagamento(s) para receber no local hoje</Text>
          )}
        </View>
      )}

      {/* Métricas hoje vs semana */}
      <View style={st.grid}>
        <View style={st.stat}><Text style={st.statLbl}>RESERVAS HOJE</Text><Text style={st.statVal}>{s?.today?.bookings ?? '—'}</Text></View>
        <View style={st.stat}><Text style={st.statLbl}>OCUPAÇÃO HOJE</Text><Text style={[st.statVal, { color: C.green }]}>{s ? `${s.today.occupation}%` : '—'}</Text></View>
        <View style={st.stat}><Text style={st.statLbl}>RECEITA HOJE</Text><Text style={st.statVal}>{s ? brl(s.today.revenue) : '—'}</Text></View>
        <View style={st.stat}><Text style={st.statLbl}>RECEITA 7 DIAS</Text><Text style={[st.statVal, { color: C.green }]}>{s ? brl(s.week.revenue) : '—'}</Text></View>
      </View>

      {/* Gráfico da semana */}
      <View style={st.chartCard}>
        <Text style={st.sec2}>Reservas — últimos 7 dias {s ? `(${s.week.bookings})` : ''}</Text>
        <View style={st.bars}>
          {(s?.series ?? Array.from({ length: 7 }, () => ({ count: 0, label: '' }))).map((d: any, i: number) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={{ color: d.count ? C.txt : C.mut, fontSize: 10, fontWeight: '700' }}>{d.count || ''}</Text>
              <View style={[st.bar, {
                height: 8 + (d.count / maxCount) * 62,
                backgroundColor: i === 6 ? C.green : '#14532d',
              }]} />
              <Text style={{ color: i === 6 ? C.green : C.mut, fontSize: 10, textTransform: 'capitalize' }}>
                {i === 6 ? 'hoje' : d.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Próximas reservas */}
      <Text style={st.sec}>Próximas reservas</Text>
      {s?.upcoming?.length === 0 && (
        <Text style={{ color: C.mut, fontSize: 13 }}>Nenhuma reserva futura ainda — divulgue sua arena!</Text>
      )}
      {s?.upcoming?.map((b: any) => {
        const [payLabel, payColor] = PAY_BADGE[b.paymentMode] || ['', C.mut];
        return (
          <View key={b.id} style={st.card}>
            <View style={st.rowSb}>
              <Text style={st.cardTime}>{b.date.split('-').reverse().slice(0, 2).join('/')} · {b.startTime}–{b.endTime}</Text>
              <Text style={{ color: b.status === 'confirmed' ? C.green : C.mut, fontWeight: '700', fontSize: 12 }}>
                {b.status === 'confirmed' ? 'confirmada ✔' : 'aguardando'}
              </Text>
            </View>
            <Text style={{ color: ZINC, fontSize: 13, marginTop: 3 }}>{b.court} · {b.player}</Text>
            <View style={[st.rowSb, { marginTop: 8 }]}>
              <Text style={{ color: payColor, fontSize: 12, fontWeight: '700' }}>
                {payLabel}{b.paymentMode === 'split' ? ` ${b.paidShares}/${b.splitCount}` : ''}
              </Text>
              <Text style={{ color: C.txt, fontWeight: '800', fontSize: 14 }}>{brl(b.totalAmount)}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  arenaName: { color: C.txt, fontSize: 22, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  rowSb: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  pendingCard: { backgroundColor: '#2e2713', borderWidth: 1, borderColor: 'rgba(212,175,55,.5)', borderRadius: 14, padding: 14, marginBottom: 14 },
  pendingItem: { color: ZINC, fontSize: 12.5, marginTop: 3, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, width: '47.5%' },
  statLbl: { color: C.mut, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  statVal: { color: C.txt, fontSize: 19, fontWeight: '800', marginTop: 4 },
  chartCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, marginTop: 14 },
  sec: { color: C.txt, fontSize: 16, fontWeight: '800', marginTop: 22, marginBottom: 10 },
  sec2: { color: C.txt, fontSize: 14, fontWeight: '800', marginBottom: 10 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 110 },
  bar: { width: '70%', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTime: { color: C.txt, fontWeight: '800', fontSize: 13.5 },
});
