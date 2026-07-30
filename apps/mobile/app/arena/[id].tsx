import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  Linking, useWindowDimensions, Platform, Modal
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Link as LinkIcon, CreditCard, Users, Star, CalendarX2, CheckSquare, Square, X } from 'lucide-react-native';
import { api } from '@/api';
import { Theme, brl } from '@/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';

function nextDays(n = 10) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      dayNum: String(d.getDate()).padStart(2, '0'),
      weekday: i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
    };
  });
}

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function ArenaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520);

  const [arena, setArena] = useState<any>(null);
  const [court, setCourt] = useState<any>(null);
  const [date, setDate] = useState(nextDays()[0].iso);
  const [freeSlots, setFreeSlots] = useState<Set<string>>(new Set());
  const [slot, setSlot] = useState<string | null>(null);
  const [mode, setMode] = useState<'full' | 'split' | 'on_site'>('split');
  const [splitCount, setSplitCount] = useState(4);
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  // Zera o scroll status sempre que abrir o modal
  useEffect(() => {
    if (showRulesModal) setHasScrolledToBottom(false);
  }, [showRulesModal]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
    // Se o texto for pequeno o suficiente para não precisar rolar (telas muito altas)
    if (contentHeight < 350) {
      setHasScrolledToBottom(true);
    }
  };

  const rulesText = `1. Pagamento Antecipado: Para garantir a quadra, metade do valor (50%) deve ser pago até 3 horas antes da partida. O não pagamento pode acarretar em perda da reserva.

2. Cuidado com Material: O organizador da reserva é responsável por zelar pela bola e pelos coletes emprestados. Em caso de perda ou danos propositais, o valor de reposição poderá ser cobrado.

3. Horário: O tempo de quadra começa a contar exatamente no horário reservado. Atrasos não estendem o tempo da partida. Chegue 15 minutos antes!

4. Equipamento: Proibido o uso de chuteiras de trava (cravo) alta em quadras society.

5. Consumo: Não é permitida a entrada de bebidas compradas fora do estabelecimento.`;

  const days = useMemo(() => nextDays(), []);

  useEffect(() => {
    api.arena(id!).then((a) => { setArena(a); setCourt(a.courts[0]); }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!court) return;
    setSlot(null);
    setLoadingSlots(true);
    api.availability(court.id, date)
      .then((d) => setFreeSlots(new Set(d.slots.map((sl: any) => sl.startTime))))
      .catch(() => setFreeSlots(new Set()))
      .finally(() => setLoadingSlots(false));
  }, [court, date]);

  const hours = useMemo(() => {
    if (!court) return [];
    return Array.from({ length: court.closeHour - court.openHour }, (_, i) => hourLabel(court.openHour + i))
      .filter((label) => freeSlots.has(label));
  }, [court, freeSlots]);

  const dayIdx = days.findIndex((d) => d.iso === date);
  const goNextDay = () => { if (dayIdx < days.length - 1) setDate(days[dayIdx + 1].iso); };

  const price = court?.pricePerHour ?? 0;
  const ctaPrice = mode === 'split' ? Math.ceil(price / splitCount) : price;

  async function reserve() {
    if (!slot || !court) return;
    setBusy(true);
    setError('');
    try {
      const endTime = hourLabel(Number(slot.slice(0, 2)) + 1);
      const r = await api.createBooking({
        courtId: court.id, date, startTime: slot, endTime,
        paymentMode: mode, ...(mode === 'split' ? { splitCount, isPublic, spotsNeeded: splitCount } : {}),
      });
      if (r.checkoutUrl) Linking.openURL(r.checkoutUrl);
      router.replace(`/booking/${r.booking.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  if (!arena) return (
    <View style={s.wrap}>
      <Stack.Screen options={{ headerShown: false }} />
      <Skeleton width="100%" height={260} borderRadius={0} />
      <View style={{ padding: Theme.spacing.md, gap: Theme.spacing.md }}>
        <Skeleton width="60%" height={32} />
        <Skeleton width="40%" height={20} />
        <Skeleton width="100%" height={100} />
      </View>
    </View>
  );

  const photos: string[] = arena.photos?.length ? arena.photos : [arena.photoUrl].filter(Boolean);

  return (
    <View style={s.wrap}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={{ maxWidth: 520, width: '100%', alignSelf: 'center', paddingBottom: 130 }}>
        {/* 1. Galeria hero imersiva */}
        <View>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onScroll={(e) => setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
            scrollEventThrottle={16}
          >
            {photos.map((p) => (
              <Image key={p} source={{ uri: p }} style={{ width: W, height: 280, backgroundColor: Theme.colors.border }} />
            ))}
          </ScrollView>
          <View style={[s.grad, { height: 160, backgroundColor: 'transparent' }]} pointerEvents="none">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.0)' }} />
            <View style={{ flex: 1, backgroundColor: 'rgba(11,13,16,0.3)' }} />
            <View style={{ flex: 1, backgroundColor: 'rgba(11,13,16,0.7)' }} />
            <View style={{ flex: 1, backgroundColor: 'rgba(11,13,16,1)' }} />
          </View>
          <View style={s.heroTxt} pointerEvents="none">
            <Text style={s.heroName}>{arena.name}</Text>
            <View style={s.heroMeta}>
              <Star color={Theme.colors.warning} fill={Theme.colors.warning} size={14} />
              <Text style={s.heroRating}>{arena.rating} · avaliações</Text>
            </View>
            <View style={s.heroMeta}>
              <MapPin color={Theme.colors.textMuted} size={14} />
              <Text style={s.heroAddr} numberOfLines={1}>{arena.address} — {arena.city}</Text>
            </View>
          </View>
          {photos.length > 1 && (
            <View style={s.dots} pointerEvents="none">
              {photos.map((_, i) => (
                <View key={i} style={[s.dot, i === photoIdx && s.dotActive]} />
              ))}
            </View>
          )}
          <TouchableOpacity style={s.back} onPress={() => router.back()}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        {/* 2. Seleção de quadras */}
        <Text style={s.section}>Quadras</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Theme.spacing.md, gap: Theme.spacing.sm }}>
          {arena.courts.map((c: any) => {
            const sel = court?.id === c.id;
            return (
              <TouchableOpacity key={c.id} style={[s.pill, sel && s.pillSel]} onPress={() => setCourt(c)}>
                <Text style={{ color: sel ? Theme.colors.background : Theme.colors.text, fontWeight: '700', fontSize: 14 }}>{c.name}</Text>
                <Text style={{ color: sel ? 'rgba(0,0,0,0.6)' : Theme.colors.textMuted, fontSize: 12, marginTop: 4 }}>{brl(c.pricePerHour)}/h</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Eventos da Arena */}
        <TouchableOpacity activeOpacity={0.85}>
          <Card padding="md" style={s.eventBanner}>
            <Text style={{ fontSize: 24 }}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle}>Eventos da Arena</Text>
              <Text style={s.eventSub}>Copa de Inverno Society — Inscrições abertas! Toque para ver as regras.</Text>
            </View>
          </Card>
        </TouchableOpacity>

        {/* 3. Calendário deslizante */}
        <Text style={s.section}>Data</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Theme.spacing.md, gap: Theme.spacing.sm }}>
          {days.map((d) => {
            const sel = date === d.iso;
            return (
              <TouchableOpacity key={d.iso} style={[s.day, sel && s.daySel]} onPress={() => setDate(d.iso)}>
                <Text style={{ color: sel ? Theme.colors.background : Theme.colors.text, fontSize: 18, fontWeight: '800' }}>{d.dayNum}</Text>
                <Text style={{ color: sel ? 'rgba(0,0,0,0.6)' : Theme.colors.textMuted, fontSize: 12, textTransform: 'capitalize', marginTop: 2 }}>{d.weekday}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. Grade de horários */}
        <Text style={s.section}>Horários</Text>
        {loadingSlots ? (
          <View style={s.grid}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} style={s.hour} />)}
          </View>
        ) : hours.length === 0 ? (
          <Card padding="lg" style={s.emptyState}>
            <CalendarX2 color={Theme.colors.textMuted} size={40} />
            <Text style={s.emptyTitle}>Todos os horários estão esgotados para este dia</Text>
            {dayIdx < days.length - 1 && (
              <Button title="Ver horários de amanhã" variant="outline" onPress={goNextDay} style={{ marginTop: Theme.spacing.sm }} />
            )}
          </Card>
        ) : (
          <View style={s.grid}>
            {hours.map((label) => {
              const sel = slot === label;
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => setSlot(sel ? null : label)}
                  style={[s.hour, sel && s.hourSel]}
                >
                  <Text style={{ color: sel ? Theme.colors.background : Theme.colors.text, fontWeight: sel ? '800' : '600', fontSize: 15 }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 5. Pagamento e divisão */}
        <Text style={s.section}>Pagamento</Text>
        <Card padding="none" style={s.payCard}>
          {([
            ['split', <LinkIcon color={mode === 'split' ? Theme.colors.text : Theme.colors.textMuted} size={20} />, 'Dividir por link com os amigos'],
            ['full', <CreditCard color={mode === 'full' ? Theme.colors.text : Theme.colors.textMuted} size={20} />, 'Pagar tudo agora (Pix/cartão)'],
            ['on_site', <Users color={mode === 'on_site' ? Theme.colors.text : Theme.colors.textMuted} size={20} />, 'Pagar presencialmente na arena'],
          ] as const).map(([m, ico, label], i) => {
            const sel = mode === m;
            return (
              <TouchableOpacity key={m} style={[s.payOpt, i > 0 && s.payDivider]} onPress={() => setMode(m)}>
                {ico}
                <Text style={{ color: sel ? Theme.colors.text : Theme.colors.textMuted, fontWeight: sel ? '700' : '500', flex: 1, fontSize: 15 }}>{label}</Text>
                <View style={[s.radio, sel && s.radioSel]}>{sel && <View style={s.radioDot} />}</View>
              </TouchableOpacity>
            );
          })}

          {mode === 'split' && (
            <View>
              <View style={s.stepperRow}>
                <Text style={{ color: Theme.colors.textMuted, fontSize: 15, fontWeight: '500' }}>Dividir entre</Text>
                <View style={s.stepper}>
                  <TouchableOpacity style={s.stepBtn} onPress={() => setSplitCount(Math.max(2, splitCount - 1))}>
                    <Text style={s.stepTxt}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.stepNum}>{splitCount}</Text>
                  <TouchableOpacity style={s.stepBtn} onPress={() => setSplitCount(Math.min(30, splitCount + 1))}>
                    <Text style={s.stepTxt}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ color: Theme.colors.textMuted, fontSize: 15, fontWeight: '500' }}>pessoas</Text>
              </View>

              <TouchableOpacity style={s.publicToggle} onPress={() => setIsPublic(!isPublic)} activeOpacity={0.7}>
                {isPublic ? (
                  <CheckSquare color={Theme.colors.primary} size={22} />
                ) : (
                  <Square color={Theme.colors.textMuted} size={22} />
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: Theme.colors.text, fontSize: 15, fontWeight: '600' }}>Partida Aberta (Completar Time)</Text>
                  <Text style={{ color: Theme.colors.textMuted, fontSize: 13, marginTop: 2 }}>Permitir que jogadores avulsos entrem e paguem a cota para jogar.</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {!!error && <Text style={s.err}>{error}</Text>}
      </ScrollView>

      {/* Botão gigante fixo no rodapé */}
      <View style={s.footer}>
        {!!slot && (
          <View style={s.termsRow}>
            <TouchableOpacity onPress={() => termsAccepted ? setTermsAccepted(false) : setShowRulesModal(true)} style={s.checkbox}>
              {termsAccepted ? <CheckSquare color={Theme.colors.primary} size={24} /> : <Square color={Theme.colors.textMuted} size={24} />}
            </TouchableOpacity>
            <Text style={s.termsText}>
              Eu li e aceito as <Text style={s.termsLink} onPress={() => setShowRulesModal(true)}>Regras da Arena</Text>.
            </Text>
          </View>
        )}

        <Button
          fullWidth
          size="lg"
          disabled={!slot || busy || !termsAccepted}
          loading={busy}
          onPress={reserve}
          title={!slot ? 'Escolha um horário' : !termsAccepted ? 'Aceite os Termos' : mode === 'split' ? `Reservar por ${brl(ctaPrice)}/pessoa` : `Reservar por ${brl(ctaPrice)}`}
        />
        {!!slot && mode === 'split' && (
          <Text style={s.ctaSub}>Total {brl(price)} · {slot} · {splitCount} pessoas</Text>
        )}
      </View>

      {/* Modal de Regras */}
      <Modal visible={showRulesModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Termos e Regras</Text>
              <TouchableOpacity onPress={() => setShowRulesModal(false)} style={s.modalClose}>
                <X color={Theme.colors.text} size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={{ maxHeight: 350 }} 
              showsVerticalScrollIndicator={true}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onContentSizeChange={handleContentSizeChange}
            >
              <Text style={s.modalText}>{rulesText}</Text>
            </ScrollView>
            <Button 
              title={hasScrolledToBottom ? "Li e Aceito as Regras" : "Role até o final para aceitar"} 
              disabled={!hasScrolledToBottom}
              onPress={() => {
                setTermsAccepted(true);
                setShowRulesModal(false);
              }} 
              style={{ marginTop: 24 }} 
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Theme.colors.background },

  grad: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'column' },
  heroTxt: { position: 'absolute', left: Theme.spacing.md, right: Theme.spacing.md, bottom: Theme.spacing.xl },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dots: { position: 'absolute', bottom: Theme.spacing.md, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
  heroName: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heroRating: { color: Theme.colors.warning, fontSize: 14, fontWeight: '700' },
  heroAddr: { color: Theme.colors.textMuted, fontSize: 13 },
  back: {
    position: 'absolute', top: Platform.OS === 'web' ? 24 : 56, left: 16,
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },

  section: { color: Theme.colors.text, fontSize: 18, fontWeight: '800', paddingHorizontal: Theme.spacing.md, marginTop: Theme.spacing.xl, marginBottom: Theme.spacing.sm },

  pill: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.radius.xl, paddingHorizontal: 20, paddingVertical: 12 },
  pillSel: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },

  eventBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    marginHorizontal: Theme.spacing.md, marginTop: Theme.spacing.lg,
  },
  eventTitle: { color: '#e8c968', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  eventSub: { color: Theme.colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },

  day: {
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.radius.lg,
    width: 64, paddingVertical: 12, alignItems: 'center',
  },
  daySel: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm, paddingHorizontal: Theme.spacing.md },
  hour: {
    width: '23%', minWidth: 72, paddingVertical: 14, borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center',
  },
  hourSel: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  
  emptyState: { alignItems: 'center', gap: 12, marginHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.xxl },
  emptyTitle: { color: Theme.colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: '80%' },

  payCard: { marginHorizontal: Theme.spacing.md },
  payOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, paddingHorizontal: 16 },
  payDivider: { borderTopWidth: 1, borderTopColor: Theme.colors.border },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Theme.colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: Theme.colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Theme.colors.primary },
  
  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16,
    paddingVertical: 16, borderTopWidth: 1, borderTopColor: Theme.colors.border,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.background, borderRadius: Theme.radius.md, borderWidth: 1, borderColor: Theme.colors.border },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { color: Theme.colors.primary, fontSize: 24, fontWeight: '800' },
  stepNum: { color: Theme.colors.text, fontSize: 18, fontWeight: '800', minWidth: 32, textAlign: 'center' },

  publicToggle: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderTopWidth: 1, borderTopColor: Theme.colors.border,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },

  err: { color: Theme.colors.danger, textAlign: 'center', marginTop: Theme.spacing.md, paddingHorizontal: Theme.spacing.md },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11,13,16,0.95)', borderTopWidth: 1, borderTopColor: Theme.colors.border,
    padding: Theme.spacing.md, paddingBottom: Platform.OS === 'ios' ? 32 : Theme.spacing.md,
    alignItems: 'center',
  },
  ctaSub: { color: Theme.colors.textMuted, fontSize: 13, marginTop: 8, fontWeight: '500' },

  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, width: '100%', paddingHorizontal: 4 },
  checkbox: { marginRight: 10 },
  termsText: { color: Theme.colors.textMuted, fontSize: 13, flex: 1 },
  termsLink: { color: Theme.colors.primary, fontWeight: '600', textDecorationLine: 'underline' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: Theme.colors.surface, width: '100%', maxWidth: 400, borderRadius: Theme.radius.lg, padding: 24, borderWidth: 1, borderColor: Theme.colors.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: Theme.colors.text, fontSize: 18, fontWeight: '800' },
  modalClose: { padding: 4 },
  modalText: { color: Theme.colors.textMuted, fontSize: 14, lineHeight: 22 },
});
