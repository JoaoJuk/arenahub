import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, useWindowDimensions, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Link as LinkIcon, CreditCard, Users, Star, CalendarX2, CheckSquare, Square, X, Trophy, Check } from 'lucide-react-native';
import { api } from '@/api';
import { Theme, brl } from '@/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';

// Alvo mínimo de toque: 44pt no HIG, 48dp no Material 3. Usamos 48 para
// satisfazer as duas plataformas com um número só.
const HIT = 48;
// Teto de escala de fonte: deixa o Dynamic Type / font scaling funcionar sem
// estourar chips de largura fixa (dia, horário).
const MAX_SCALE = 1.6;

function nextDays(n = 10) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      dayNum: String(d.getDate()).padStart(2, '0'),
      weekday: i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      long: d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
    };
  });
}

const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function ArenaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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
  // O rodapé é medido em vez de ter altura fixa: ele cresce e encolhe conforme o
  // horário é escolhido (linha de termos) e o modo de pagamento (linha do total).
  const [footerH, setFooterH] = useState(0);

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

  // Só os horários livres entram na grade — o que está ocupado simplesmente não
  // aparece, em vez de ocupar espaço desabilitado.
  const hours = useMemo(() => {
    if (!court) return [] as string[];
    return Array.from({ length: court.closeHour - court.openHour }, (_, i) => hourLabel(court.openHour + i))
      .filter((label) => freeSlots.has(label));
  }, [court, freeSlots]);

  // A galeria abre na foto da quadra selecionada e segue com as fotos gerais da
  // arena. O dedupe cobre o caso de a mesma foto estar nos dois lugares.
  const photos: string[] = useMemo(() => {
    if (!arena) return [];
    const arenaPhotos: string[] = arena.photos?.length ? arena.photos : [arena.photoUrl].filter(Boolean);
    if (!court?.photoUrl) return arenaPhotos;
    return [court.photoUrl, ...arenaPhotos.filter((p) => p !== court.photoUrl)];
  }, [arena, court]);

  // Trocar de quadra rebobina a galeria — sem isso o carrossel ficaria parado num
  // índice que já não existe na nova lista.
  const galleryRef = useRef<ScrollView>(null);
  useEffect(() => {
    setPhotoIdx(0);
    galleryRef.current?.scrollTo({ x: 0, animated: false });
  }, [court?.id]);

  const showingCourtPhoto = !!court?.photoUrl && photoIdx === 0;

  const dayIdx = days.findIndex((d) => d.iso === date);
  const goNextDay = () => { if (dayIdx < days.length - 1) setDate(days[dayIdx + 1].iso); };

  const price = court?.pricePerHour ?? 0;
  const ctaPrice = mode === 'split' ? Math.ceil(price / splitCount) : price;

  // 4 colunas, largura calculada — '23%' + gap estourava a linha em telas estreitas.
  const hourW = (Math.min(width, 520) - Theme.spacing.md * 2 - Theme.spacing.sm * 3) / 4;

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

  return (
    <View style={s.wrap}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{
          maxWidth: 520, width: '100%', alignSelf: 'center',
          // Acompanha a altura real do rodapé — com valor fixo o fim da tela
          // ficava escondido atrás dele quando a linha de termos aparecia.
          paddingBottom: (footerH || 130) + Theme.spacing.md,
        }}
      >
        {/* 1. Galeria hero imersiva */}
        <View>
          <ScrollView
            ref={galleryRef}
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onScroll={(e) => setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
            scrollEventThrottle={16}
          >
            {photos.map((p, i) => (
              <Image
                key={p}
                source={{ uri: p }}
                style={{ width: W, height: 280, backgroundColor: Theme.colors.border }}
                contentFit="cover"
                transition={220}
                cachePolicy="memory-disk"
                accessibilityLabel={
                  i === 0 && court?.photoUrl
                    ? `Foto da ${court.name}`
                    : `Foto ${i + 1} de ${photos.length} da ${arena.name}`
                }
              />
            ))}
          </ScrollView>
          {/* Scrim de legibilidade — LinearGradient real no lugar de 4 Views de
              opacidade fixa, que criavam degraus visíveis sobre a foto. */}
          <LinearGradient
            colors={['rgba(11,15,13,0)', 'rgba(11,15,13,0.55)', 'rgba(11,15,13,0.92)']}
            locations={[0, 0.45, 1]}
            style={s.scrim}
            pointerEvents="none"
          />
          <View style={s.heroTxt} pointerEvents="none">
            <Text style={s.heroName} maxFontSizeMultiplier={MAX_SCALE}>{arena.name}</Text>
            <View style={s.heroMeta}>
              <Star color={Theme.colors.warning} fill={Theme.colors.warning} size={14} />
              <Text style={s.heroRating}>{arena.rating} · avaliações</Text>
            </View>
            <View style={s.heroMeta}>
              <MapPin color={Theme.colors.onPhotoMuted} size={14} />
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
          <TouchableOpacity
            style={[s.back, { top: insets.top + Theme.spacing.sm }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <ArrowLeft color={Theme.colors.onPhoto} size={24} />
          </TouchableOpacity>

          {/* Sem este selo a troca de foto ao escolher a quadra fica ambígua —
              o usuário vê a imagem mudar mas não sabe que é a quadra dele. */}
          {showingCourtPhoto && (
            <View style={[s.courtBadge, { top: insets.top + Theme.spacing.sm }]} pointerEvents="none">
              <Text style={s.courtBadgeTxt} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{court.name}</Text>
            </View>
          )}
        </View>

        {/* 2. Seleção de quadras */}
        <Text style={s.section}>Quadras</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Theme.spacing.md, gap: Theme.spacing.sm }}
          accessibilityRole="radiogroup"
        >
          {arena.courts.map((c: any) => {
            const sel = court?.id === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[s.pill, sel && s.pillSel]}
                onPress={() => setCourt(c)}
                accessibilityRole="radio"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`${c.name}, ${brl(c.pricePerHour)} por hora`}
              >
                <View style={s.pillTop}>
                  {/* Ícone além da cor — seleção não pode depender só de cor (HIG 4.3 / Material R6.8). */}
                  {sel && <Check color={Theme.colors.onPrimary} size={14} strokeWidth={3} />}
                  <Text style={[s.pillName, sel && s.onPrimaryTxt]}>{c.name}</Text>
                </View>
                <Text style={[s.pillPrice, sel && s.pillPriceSel]}>{brl(c.pricePerHour)}/h</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Eventos da Arena */}
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Eventos da Arena. Copa de Inverno Society, inscrições abertas. Toque para ver as regras."
        >
          <Card padding="md" style={s.eventBanner}>
            <View style={s.eventIconWrap}>
              <Trophy color={Theme.colors.primary} size={20} strokeWidth={1.7} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle}>Eventos da Arena</Text>
              <Text style={s.eventSub}>Copa de Inverno Society — Inscrições abertas! Toque para ver as regras.</Text>
            </View>
          </Card>
        </TouchableOpacity>

        {/* 3. Calendário deslizante */}
        <Text style={s.section}>Data</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Theme.spacing.md, gap: Theme.spacing.sm }}
          accessibilityRole="radiogroup"
        >
          {days.map((d) => {
            const sel = date === d.iso;
            return (
              <TouchableOpacity
                key={d.iso}
                style={[s.day, sel && s.daySel]}
                onPress={() => setDate(d.iso)}
                accessibilityRole="radio"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={d.long}
              >
                <Text style={[s.dayNum, sel && s.onPrimaryTxt]} maxFontSizeMultiplier={MAX_SCALE}>{d.dayNum}</Text>
                <Text style={[s.dayName, sel && s.dayNameSel]} maxFontSizeMultiplier={MAX_SCALE}>{d.weekday}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 4. Grade de horários */}
        <Text style={s.section}>Horários</Text>
        {loadingSlots ? (
          <View style={s.grid}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} width={hourW} height={52} borderRadius={Theme.radius.md} />)}
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
                  style={[s.hour, { width: hourW }, sel && s.hourSel]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={`Horário ${label}`}
                >
                  <Text style={[s.hourTxt, sel && s.hourTxtSel]} maxFontSizeMultiplier={MAX_SCALE}>
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
          <View accessibilityRole="radiogroup">
            {([
              ['split', LinkIcon, 'Dividir por link com os amigos'],
              ['full', CreditCard, 'Pagar tudo agora (Pix/cartão)'],
              ['on_site', Users, 'Pagar presencialmente na arena'],
            ] as const).map(([m, Ico, label], i) => {
              const sel = mode === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[s.payOpt, i > 0 && s.payDivider]}
                  onPress={() => setMode(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={label}
                >
                  <Ico color={sel ? Theme.colors.text : Theme.colors.textMuted} size={20} />
                  <Text style={[s.payTxt, sel && s.payTxtSel]}>{label}</Text>
                  <View style={[s.radio, sel && s.radioSel]}>{sel && <View style={s.radioDot} />}</View>
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === 'split' && (
            <View>
              <View style={s.stepperRow}>
                <Text style={s.stepperLabel}>Dividir entre</Text>
                <View style={s.stepper}>
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() => setSplitCount(Math.max(2, splitCount - 1))}
                    disabled={splitCount <= 2}
                    accessibilityRole="button"
                    accessibilityLabel="Diminuir número de pessoas"
                    accessibilityState={{ disabled: splitCount <= 2 }}
                  >
                    <Text style={[s.stepTxt, splitCount <= 2 && s.stepTxtOff]}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.stepNum} accessibilityLabel={`${splitCount} pessoas`}>{splitCount}</Text>
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() => setSplitCount(Math.min(30, splitCount + 1))}
                    disabled={splitCount >= 30}
                    accessibilityRole="button"
                    accessibilityLabel="Aumentar número de pessoas"
                    accessibilityState={{ disabled: splitCount >= 30 }}
                  >
                    <Text style={[s.stepTxt, splitCount >= 30 && s.stepTxtOff]}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.stepperLabel}>pessoas</Text>
              </View>

              <TouchableOpacity
                style={s.publicToggle}
                onPress={() => setIsPublic(!isPublic)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isPublic }}
                accessibilityLabel="Partida aberta, completar time"
                accessibilityHint="Permite que jogadores avulsos entrem e paguem a cota para jogar"
              >
                {isPublic ? (
                  <CheckSquare color={Theme.colors.primary} size={22} />
                ) : (
                  <Square color={Theme.colors.textMuted} size={22} />
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.publicTitle}>Partida Aberta (Completar Time)</Text>
                  <Text style={s.publicSub}>Permitir que jogadores avulsos entrem e paguem a cota para jogar.</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {!!error && <Text style={s.err} accessibilityRole="alert">{error}</Text>}
      </ScrollView>

      {/* Botão gigante fixo no rodapé */}
      <View
        style={[s.footer, { paddingBottom: Math.max(insets.bottom, Theme.spacing.sm) }]}
        onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
      >
        {!!slot && (
          <View style={s.termsRow}>
            <TouchableOpacity
              onPress={() => termsAccepted ? setTermsAccepted(false) : setShowRulesModal(true)}
              style={s.checkbox}
              // O ícone ocupa 22px na tela, mas o hitSlop leva a área tocável a 46px
              // sem custar altura de rodapé — a alternativa (caixa de 48) empurrava
              // a linha inteira para baixo.
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
              accessibilityLabel="Li e aceito as regras da arena"
            >
              {termsAccepted ? <CheckSquare color={Theme.colors.primary} size={22} /> : <Square color={Theme.colors.textMuted} size={22} />}
            </TouchableOpacity>
            <Text style={s.termsText}>
              Eu li e aceito as{' '}
              <Text
                style={s.termsLink}
                onPress={() => setShowRulesModal(true)}
                accessibilityRole="link"
              >
                Regras da Arena
              </Text>.
            </Text>
          </View>
        )}

        <Button
          fullWidth
          size="md"
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
      <Modal
        visible={showRulesModal}
        transparent
        animationType="fade"
        // Sem isto o botão físico de voltar do Android não fecha o modal.
        onRequestClose={() => setShowRulesModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard} accessibilityViewIsModal>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle} accessibilityRole="header">Termos e Regras</Text>
              <TouchableOpacity
                onPress={() => setShowRulesModal(false)}
                style={s.modalClose}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
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
              title={hasScrolledToBottom ? 'Li e Aceito as Regras' : 'Role até o final para aceitar'}
              disabled={!hasScrolledToBottom}
              onPress={() => {
                setTermsAccepted(true);
                setShowRulesModal(false);
              }}
              style={{ marginTop: Theme.spacing.lg }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Theme.colors.background },

  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 180 },
  heroTxt: { position: 'absolute', left: Theme.spacing.md, right: Theme.spacing.md, bottom: Theme.spacing.xl },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dots: { position: 'absolute', bottom: Theme.spacing.md, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: Theme.radius.full, backgroundColor: Theme.colors.onPhotoMuted, opacity: 0.5 },
  dotActive: { backgroundColor: Theme.colors.onPhoto, width: 18 },
  heroName: { ...Theme.typography.h1, color: Theme.colors.onPhoto },
  heroRating: { ...Theme.typography.captionSemibold, color: Theme.colors.warning },
  heroAddr: { ...Theme.typography.small, color: Theme.colors.onPhotoMuted, fontSize: 13 },
  back: {
    position: 'absolute', left: Theme.spacing.md,
    width: HIT, height: HIT, borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.scrim,
    alignItems: 'center', justifyContent: 'center',
  },

  courtBadge: {
    position: 'absolute', right: Theme.spacing.md,
    maxWidth: '55%', height: 32, justifyContent: 'center',
    paddingHorizontal: 12, borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.scrim,
  },
  courtBadgeTxt: { ...Theme.typography.small, color: Theme.colors.onPhoto, fontSize: 12 },

  section: { ...Theme.typography.h3, fontFamily: Theme.fonts.display, color: Theme.colors.text, paddingHorizontal: Theme.spacing.md, marginTop: Theme.spacing.xl, marginBottom: Theme.spacing.sm },

  // Texto sobre o verde de marca (chip/dia selecionado). Necessário porque
  // `text` inverte no tema escuro e deixaria branco sobre verde.
  onPrimaryTxt: { color: Theme.colors.onPrimary },

  pill: { backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.radius.full, paddingHorizontal: 20, paddingVertical: 12, minHeight: HIT, justifyContent: 'center' },
  pillSel: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  pillTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillName: { ...Theme.typography.captionSemibold, color: Theme.colors.text },
  pillPrice: { ...Theme.typography.price, fontSize: 12, color: Theme.colors.textMuted, marginTop: 4 },
  pillPriceSel: { color: Theme.colors.onPrimaryMuted },

  eventBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: Theme.spacing.md, marginTop: Theme.spacing.lg,
  },
  eventIconWrap: { width: 40, height: 40, borderRadius: Theme.radius.sm, backgroundColor: Theme.colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { ...Theme.typography.captionSemibold, fontFamily: Theme.fonts.display, color: Theme.colors.text, letterSpacing: 0.2 },
  eventSub: { ...Theme.typography.small, color: Theme.colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },

  day: {
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.radius.lg,
    width: 64, minHeight: HIT + 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  daySel: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primary },
  dayNum: { ...Theme.typography.price, fontSize: 18, color: Theme.colors.text },
  dayName: { ...Theme.typography.small, color: Theme.colors.textMuted, textTransform: 'capitalize', marginTop: 2 },
  dayNameSel: { color: Theme.colors.onPrimaryMuted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.sm, paddingHorizontal: Theme.spacing.md },
  hour: {
    minHeight: 52, paddingVertical: 14, borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  // Selecionado ganha borda grossa além da cor de fundo, para o estado sobreviver
  // sem enxergar cor (HIG 4.3 / Material R6.8).
  hourSel: { backgroundColor: Theme.colors.primary, borderColor: Theme.colors.primaryHover, borderWidth: 2 },
  hourTxt: { ...Theme.typography.price, fontSize: 15, color: Theme.colors.text },
  hourTxtSel: { color: Theme.colors.onPrimary },

  emptyState: { alignItems: 'center', gap: 12, marginHorizontal: Theme.spacing.md, paddingVertical: Theme.spacing.xxl },
  emptyTitle: { ...Theme.typography.captionSemibold, fontFamily: Theme.fonts.body, color: Theme.colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: '80%' },

  payCard: { marginHorizontal: Theme.spacing.md },
  payOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, paddingHorizontal: 16, minHeight: HIT },
  payDivider: { borderTopWidth: 1, borderTopColor: Theme.colors.border },
  payTxt: { ...Theme.typography.caption, color: Theme.colors.textMuted, fontSize: 15, flex: 1 },
  payTxtSel: { fontFamily: Theme.fonts.bodySemibold, color: Theme.colors.text },
  radio: { width: 22, height: 22, borderRadius: Theme.radius.full, borderWidth: 2, borderColor: Theme.colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: Theme.colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: Theme.radius.full, backgroundColor: Theme.colors.primary },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16,
    paddingVertical: 16, borderTopWidth: 1, borderTopColor: Theme.colors.border,
  },
  stepperLabel: { ...Theme.typography.caption, color: Theme.colors.textMuted, fontSize: 15 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.background, borderRadius: Theme.radius.md, borderWidth: 1, borderColor: Theme.colors.border },
  stepBtn: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontFamily: Theme.fonts.display, color: Theme.colors.primaryHover, fontSize: 24 },
  stepTxtOff: { color: Theme.colors.textDim },
  stepNum: { ...Theme.typography.price, fontSize: 18, color: Theme.colors.text, minWidth: 32, textAlign: 'center' },

  publicToggle: {
    flexDirection: 'row', alignItems: 'center', padding: 16, minHeight: HIT,
    borderTopWidth: 1, borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.primaryDim,
  },
  publicTitle: { ...Theme.typography.captionSemibold, color: Theme.colors.text, fontSize: 15 },
  publicSub: { ...Theme.typography.small, color: Theme.colors.textMuted, fontSize: 13, marginTop: 2 },

  err: { ...Theme.typography.caption, color: Theme.colors.danger, textAlign: 'center', marginTop: Theme.spacing.md, paddingHorizontal: Theme.spacing.md },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderTopColor: Theme.colors.border,
    paddingHorizontal: Theme.spacing.md, paddingTop: Theme.spacing.sm + 2,
    alignItems: 'center',
  },
  ctaSub: { ...Theme.typography.price, color: Theme.colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 6 },

  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm, width: '100%' },
  checkbox: { alignItems: 'center', justifyContent: 'center' },
  termsText: { ...Theme.typography.small, color: Theme.colors.textMuted, fontSize: 12.5, lineHeight: 17, flex: 1, marginLeft: 10 },
  termsLink: { fontFamily: Theme.fonts.bodySemibold, color: Theme.colors.primaryHover, textDecorationLine: 'underline' },

  modalOverlay: { flex: 1, backgroundColor: Theme.colors.scrimStrong, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: Theme.colors.surface, width: '100%', maxWidth: 400, borderRadius: Theme.radius.lg, padding: Theme.spacing.lg, ...Theme.shadow.overlay },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...Theme.typography.h3, fontFamily: Theme.fonts.display, color: Theme.colors.text },
  // -12 de margem compensa o alvo de 48 para o X não parecer deslocado do canto.
  modalClose: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  modalText: { ...Theme.typography.caption, color: Theme.colors.textMuted, lineHeight: 22 },
});
