import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/api';
import { C, brl } from '@/theme';

const ZINC = '#d4d4d8';
const GOLD = '#e8c968';

type Metric = 'bookings' | 'views' | 'revenue';
const METRICS: [Metric, string][] = [['bookings', 'Reservas'], ['views', 'Visualizações'], ['revenue', 'Receita']];

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <Text style={{ color: up ? C.green : C.danger, fontSize: 11.5, fontWeight: '800' }}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{value}%
    </Text>
  );
}

export default function Performance() {
  const [days, setDays] = useState(7);
  const [p, setP] = useState<any>(null);
  const [rev, setRev] = useState<any>(null);
  const [metric, setMetric] = useState<Metric>('bookings');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [perf, reviews] = await Promise.all([api.ownerPerformance(days), api.ownerReviews().catch(() => null)]);
      setP(perf);
      setRev(reviews);
    } catch {} finally { setLoading(false); }
  }, [days]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const series = p?.series ?? [];
  const maxV = Math.max(1, ...series.map((d: any) => d[metric]));
  const fmt = (v: number) => (metric === 'revenue' ? brl(v) : String(v));

  return (
    <ScrollView
      style={s.wrap} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.green} />}
    >
      <Text style={s.h1}>Desempenho</Text>
      <Text style={{ color: C.mut, fontSize: 12.5, marginTop: 3 }}>
        Comparado com os {p?.days ?? days} dias anteriores
      </Text>

      {/* Período */}
      <View style={[s.row, { marginTop: 14, gap: 8 }]}>
        {[7, 30].map((d) => (
          <TouchableOpacity key={d} style={[s.period, days === d && s.periodOn]} onPress={() => setDays(d)}>
            <Text style={{ color: days === d ? '#04170b' : ZINC, fontWeight: '700', fontSize: 12.5 }}>Últ. {d} dias</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPIs */}
      <View style={s.grid}>
        <View style={s.stat}>
          <Text style={s.statLbl}>VISUALIZAÇÕES DA ARENA</Text>
          <Text style={s.statVal}>{p?.current.views ?? '—'}</Text>
          {p && <Delta value={p.deltas.views} />}
        </View>
        <View style={s.stat}>
          <Text style={s.statLbl}>RESERVAS REALIZADAS</Text>
          <Text style={s.statVal}>{p?.current.bookings ?? '—'}</Text>
          {p && <Delta value={p.deltas.bookings} />}
        </View>
        <View style={s.stat}>
          <Text style={s.statLbl}>VALOR TOTAL</Text>
          <Text style={s.statVal}>{p ? brl(p.current.revenue) : '—'}</Text>
          {p && <Delta value={p.deltas.revenue} />}
        </View>
        <View style={s.stat}>
          <Text style={s.statLbl}>TICKET MÉDIO</Text>
          <Text style={s.statVal}>{p ? brl(p.current.ticket) : '—'}</Text>
          {p && <Delta value={p.deltas.ticket} />}
        </View>
        <View style={[s.stat, { width: '100%' }]}>
          <Text style={s.statLbl}>NOVOS CLIENTES</Text>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={s.statVal}>{p?.current.newClients ?? '—'}</Text>
            {p && <Delta value={p.deltas.newClients} />}
          </View>
        </View>
      </View>

      {/* Gráfico com seletor de métrica */}
      <View style={s.chartCard}>
        <View style={[s.row, { gap: 8, marginBottom: 14 }]}>
          {METRICS.map(([m, label]) => (
            <TouchableOpacity key={m} style={[s.mChip, metric === m && s.mChipOn]} onPress={() => setMetric(m)}>
              <Text style={{ color: metric === m ? '#04170b' : ZINC, fontSize: 11.5, fontWeight: '700' }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.bars}>
          {series.map((d: any, i: number) => {
            const show = days === 7 || i % 5 === 0 || i === series.length - 1;
            return (
              <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                {days === 7 && d[metric] > 0 && (
                  <Text style={{ color: C.txt, fontSize: 8.5, fontWeight: '700' }} numberOfLines={1}>
                    {metric === 'revenue' ? Math.round(d.revenue / 100) : d[metric]}
                  </Text>
                )}
                <View style={[s.bar, {
                  height: 6 + (d[metric] / maxV) * 74,
                  backgroundColor: i === series.length - 1 ? C.green : '#14532d',
                }]} />
                <Text style={{ color: C.mut, fontSize: 8.5 }}>{show ? d.label : ''}</Text>
              </View>
            );
          })}
        </View>
        <Text style={{ color: C.mut, fontSize: 11, marginTop: 10 }}>
          Total no período: <Text style={{ color: C.green, fontWeight: '800' }}>{p ? fmt(p.current[metric]) : '—'}</Text>
        </Text>
      </View>

      {/* Avaliações */}
      <Text style={s.sec}>Avaliações</Text>
      <View style={s.chartCard}>
        <View style={[s.row, { gap: 10 }]}>
          <Text style={{ color: GOLD, fontSize: 30, fontWeight: '800' }}>{rev?.average ?? '—'}</Text>
          <View>
            <Text style={{ color: GOLD, fontSize: 13 }}>
              {'★'.repeat(Math.round(rev?.average || 0))}{'☆'.repeat(5 - Math.round(rev?.average || 0))}
            </Text>
            <Text style={{ color: C.mut, fontSize: 11.5 }}>{rev?.total ?? 0} avaliação(ões)</Text>
          </View>
        </View>
        {rev?.reviews?.slice(0, 5).map((r: any) => (
          <View key={r.id} style={s.review}>
            <View style={[s.row, { justifyContent: 'space-between' }]}>
              <Text style={{ color: C.txt, fontWeight: '700', fontSize: 13 }}>{r.user}</Text>
              <Text style={{ color: GOLD, fontSize: 12 }}>{'★'.repeat(r.rating)}</Text>
            </View>
            {!!r.comment && <Text style={{ color: ZINC, fontSize: 12.5, marginTop: 3, lineHeight: 18 }}>{r.comment}</Text>}
          </View>
        ))}
        {(rev?.reviews?.length ?? 0) === 0 && (
          <Text style={{ color: C.mut, fontSize: 12.5, marginTop: 10 }}>Nenhuma avaliação ainda.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  h1: { color: C.txt, fontSize: 22, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center' },
  period: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  periodOn: { backgroundColor: C.green, borderColor: C.green },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  stat: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, width: '47.5%', gap: 3 },
  statLbl: { color: C.mut, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.3 },
  statVal: { color: C.txt, fontSize: 19, fontWeight: '800' },
  chartCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, marginTop: 14 },
  mChip: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  mChipOn: { backgroundColor: C.green, borderColor: C.green },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 120 },
  bar: { width: '72%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minWidth: 4 },
  sec: { color: C.txt, fontSize: 16, fontWeight: '800', marginTop: 22 },
  review: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: 10, marginTop: 12 },
});
