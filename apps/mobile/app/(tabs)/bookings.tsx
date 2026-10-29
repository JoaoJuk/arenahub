import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { CalendarDays, UserPlus } from 'lucide-react-native';
import { api } from '@/api';
import { Theme, brl, type Colors } from '@/theme';
import { useColors, useStyles } from '@/theme-context';
import { AppHeader } from '@/components/AppHeader';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StatusBadge, statusBarColor } from '@/components/StatusBadge';
import { SplitProgress } from '@/components/SplitProgress';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';

type Filter = 'active' | 'history';

const ACTIVE_STATUS = ['pending', 'confirmed'];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** "12 de Out, Sáb" — construído em horário local para não pular um dia por fuso. */
function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${d} de ${MONTHS[m - 1]}, ${WEEKDAYS[dt.getDay()]}`;
}

export default function Bookings() {
  const c = useColors();
  const s = useStyles(styles);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.myBookings()); } catch {} finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(
    () => items.filter((b) => (filter === 'active' ? ACTIVE_STATUS.includes(b.status) : !ACTIVE_STATUS.includes(b.status))),
    [items, filter],
  );

  return (
    <View style={s.wrap}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + Theme.spacing.section }]}
        refreshControl={<RefreshControl refreshing={loading && items.length > 0} onRefresh={load} tintColor={c.primary} />}
      >
        <Text style={s.title} accessibilityRole="header">Minhas Reservas</Text>

        <SegmentedTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: 'Ativas' },
            { value: 'history', label: 'Histórico' },
          ]}
        />

        <View style={s.list}>
          {loading && items.length === 0 ? (
            [1, 2].map((i) => <Skeleton key={i} height={230} borderRadius={Theme.radius.lg} />)
          ) : shown.length === 0 ? (
            <View style={s.emptyBox}>
              <CalendarDays color={c.textDim} size={40} />
              <Text style={s.emptyTitle}>
                {filter === 'active' ? 'Nenhuma reserva ativa' : 'Nada no histórico ainda'}
              </Text>
              <Text style={s.emptySub}>
                {filter === 'active'
                  ? 'Reserve uma quadra e ela aparece aqui com o status do pagamento.'
                  : 'Reservas realizadas e canceladas ficam guardadas nesta aba.'}
              </Text>
            </View>
          ) : (
            shown.map((b) => {
              const past = !ACTIVE_STATUS.includes(b.status);
              const photo = b.court?.photoUrl || b.court?.arena?.photoUrl;
              const isSplit = b.paymentMode === 'split' && !!b.splitCount;

              return (
                <PressableScale
                  key={b.id}
                  onPress={() => router.push(`/booking/${b.id}`)}
                  style={[s.card, past && s.cardPast]}
                  accessibilityLabel={`Reserva em ${b.court.arena.name}, ${longDate(b.date)}`}
                >
                  {/* Faixa de status: cor + posição, não só cor (DESIGN.md §8) */}
                  <View style={[s.statusBar, { backgroundColor: statusBarColor(b.status, c) }]} />

                  <View style={s.photoWrap}>
                    <Image
                      source={{ uri: photo || undefined }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(11,15,13,0.85)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={s.photoRow}>
                      <Text style={s.arena} numberOfLines={1}>{b.court.arena.name}</Text>
                      <StatusBadge status={b.status} onPhoto />
                    </View>
                  </View>

                  {/* Não existe notificação no app: é aqui que o organizador
                      descobre que tem gente esperando resposta. */}
                  {b.pendingRequests > 0 && (
                    <View style={s.requests}>
                      <UserPlus color={c.onAccent} size={16} />
                      <Text style={s.requestsTxt}>
                        {b.pendingRequests === 1
                          ? '1 pedido para entrar'
                          : `${b.pendingRequests} pedidos para entrar`}
                      </Text>
                    </View>
                  )}

                  <View style={s.body}>
                    <View style={s.bodyRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.date, past && s.datePast]}>{longDate(b.date)}</Text>
                        <Text style={s.meta} numberOfLines={1}>
                          {b.startTime} - {b.endTime} • {b.court.name}
                        </Text>
                        {b.myRole === 'participant' && (
                          <Text style={s.role}>Você entrou nesta partida</Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.total}>{brl(b.totalAmount)}</Text>
                        {/* Piso, igual ao shareAt do servidor. Arredondar para cima
                            mostrava 1 centavo a mais do que é de fato cobrado. */}
                        {isSplit && (
                          <Text style={s.perPerson}>{brl(Math.floor(b.totalAmount / b.splitCount))}/pessoa</Text>
                        )}
                      </View>
                    </View>

                    {isSplit && (
                      <View style={s.splitBox}>
                        <SplitProgress
                          paid={b.paidShares ?? 0}
                          total={b.splitCount}
                          label={`${b.paidShares ?? 0}/${b.splitCount} Pagos`}
                        />
                      </View>
                    )}
                  </View>
                </PressableScale>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (c: Colors) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.background },
  content: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Theme.spacing.margin,
    paddingTop: Theme.spacing.lg,
  },
  title: { ...Theme.typography.h1, color: c.text, marginBottom: Theme.spacing.lg },

  list: { gap: Theme.spacing.lg, marginTop: Theme.spacing.section },

  card: {
    backgroundColor: c.surfaceGray,
    borderRadius: Theme.radius.lg,
    overflow: 'hidden',
    ...Theme.shadow.raised,
  },
  cardPast: { opacity: 0.7 },
  statusBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, zIndex: 2 },

  photoWrap: { height: 120, width: '100%', backgroundColor: c.surfaceHigh },
  photoRow: {
    position: 'absolute',
    left: Theme.spacing.md,
    right: Theme.spacing.stack,
    bottom: Theme.spacing.stack,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Theme.spacing.sm,
  },
  arena: { ...Theme.typography.label, color: c.onPhoto, flexShrink: 1 },

  body: { padding: Theme.spacing.md, paddingLeft: Theme.spacing.md + 4, gap: Theme.spacing.stack },
  bodyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Theme.spacing.sm },
  date: { ...Theme.typography.bodySemibold, color: c.text },
  datePast: { textDecorationLine: 'line-through', color: c.textMuted },
  meta: { ...Theme.typography.small, color: c.textMuted, marginTop: 2 },
  role: { ...Theme.typography.small, color: c.primary, marginTop: 2 },
  requests: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    marginLeft: 4,
    backgroundColor: c.accent,
  },
  requestsTxt: { ...Theme.typography.label, color: c.onAccent },
  total: { ...Theme.typography.price, color: c.text, fontSize: 20 },
  perPerson: { ...Theme.typography.small, color: c.textMuted, marginTop: 2 },

  splitBox: {
    padding: Theme.spacing.stack,
    borderRadius: Theme.radius.sm,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },

  emptyBox: { alignItems: 'center', gap: Theme.spacing.sm, paddingVertical: Theme.spacing.section },
  emptyTitle: { ...Theme.typography.h3, color: c.text, marginTop: Theme.spacing.sm },
  emptySub: { ...Theme.typography.caption, color: c.textMuted, textAlign: 'center' },
});
