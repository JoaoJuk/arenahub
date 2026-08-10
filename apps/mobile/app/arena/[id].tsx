import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft, MapPin, Link as LinkIcon, CreditCard, Users, Star, CalendarX2,
  CheckSquare, Square, X, Trophy, Check, Heart,
} from 'lucide-react-native';
import { api } from '@/api';
import { Theme, brl, type Colors } from '@/theme';
import { useColors, useStyles } from '@/theme-context';
import { useIsFavorite, toggleFavorite } from '@/favorites';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { AmenityRow } from '@/components/AmenityRow';
import { MapPreview } from '@/components/MapPreview';
import { Dialog } from '@/components/Dialog';

// Alvo mínimo de toque: 44pt no HIG, 48dp no Material 3. Usamos 48 para
// satisfazer as duas plataformas com um número só.
const HIT = 48;
// Teto de escala de fonte: deixa o Dynamic Type / font scaling funcionar sem
// estourar chips de largura fixa (dia, horário).
const MAX_SCALE = 1.6;

const HERO_H = 300;
// A folha branca sobe por cima da foto — é o que dá a leitura de "cartão de
// conteúdo" das telas do Stitch.
const SHEET_OVERLAP = 32;

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
  const c = useColors();
  const s = useStyles(styles);
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
  const favorite = useIsFavorite(id!);
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

  const dayIdx = days.findIndex((d) => d.iso === date);
  const goNextDay = () => { if (dayIdx < days.length - 1) setDate(days[dayIdx + 1].iso); };

  const price = court?.pricePerHour ?? 0;
  const ctaPrice = mode === 'split' ? Math.ceil(price / splitCount) : price;

  // 3 colunas, largura calculada — porcentagem + gap estourava a linha em telas estreitas.
  const hourW = (W - Theme.spacing.margin * 2 - Theme.spacing.stack * 2) / 3;

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
      <Skeleton width="100%" height={HERO_H} borderRadius={0} />
      <View style={{ padding: Theme.spacing.margin, gap: Theme.spacing.md }}>
        <Skeleton width="70%" height={34} />
        <Skeleton width="45%" height={20} />
        <Skeleton width="100%" height={120} borderRadius={Theme.radius.lg} />
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
                style={{ width: W, height: HERO_H, backgroundColor: c.surfaceHigh }}
                contentFit="cover"
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
            colors={['rgba(11,15,13,0.45)', 'rgba(11,15,13,0)']}
            style={s.scrimTop}
            pointerEvents="none"
          />

          {photos.length > 1 && (
            <View style={s.dots} pointerEvents="none">
              {photos.map((_, i) => (
                <View key={i} style={[s.dot, i === photoIdx && s.dotActive]} />
              ))}
            </View>
          )}

          <View style={[s.heroBar, { top: insets.top + Theme.spacing.sm }]}>
            <TouchableOpacity
              style={s.glassBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <ArrowLeft color={c.onPhoto} size={22} />
            </TouchableOpacity>

            {/* Sem este selo a troca de foto ao escolher a quadra fica ambígua —
                o usuário vê a imagem mudar mas não sabe que é a quadra dele. */}
            {!!court?.photoUrl && photoIdx === 0 && (
              <View style={s.courtBadge} pointerEvents="none">
                <Text style={s.courtBadgeTxt} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{court.name}</Text>
              </View>
            )}

            <TouchableOpacity
              style={s.glassBtn}
              onPress={() => toggleFavorite(id!)}
              accessibilityRole="button"
              accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
            >
              <Heart
                color={favorite ? c.danger : c.onPhoto}
                fill={favorite ? c.danger : 'transparent'}
                size={22}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Folha de conteúdo sobre a foto */}
        <View style={s.sheet}>
          <View style={s.titleRow}>
            <Text style={s.name} maxFontSizeMultiplier={MAX_SCALE}>{arena.name}</Text>
            <View style={s.ratingPill}>
              <Star color={c.text} fill={c.text} size={14} />
              <Text style={s.ratingTxt}>{arena.rating}</Text>
            </View>
          </View>

          <View style={s.addressRow}>
            <MapPin color={c.textMuted} size={18} />
            <Text style={s.address} numberOfLines={2}>{arena.address} — {arena.city}</Text>
          </View>

          <AmenityRow />
        </View>

        {/* 3. Seleção de quadras */}
        <Text style={s.section}>Selecione a Quadra</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Theme.spacing.margin, gap: Theme.spacing.stack }}
          accessibilityRole="radiogroup"
        >
          {arena.courts.map((c: any) => {
            const sel = court?.id === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[s.courtCard, sel && s.courtCardSel]}
                onPress={() => setCourt(c)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={`${c.name}, ${brl(c.pricePerHour)} por hora`}
              >
                <Image
                  source={{ uri: c.photoUrl || arena.photoUrl || undefined }}
                  style={[StyleSheet.absoluteFill, { opacity: sel ? 0.45 : 0.9 }]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <LinearGradient
                  colors={['rgba(11,15,13,0.15)', 'rgba(11,15,13,0.88)']}
                  style={StyleSheet.absoluteFill}
                />
                {/* Ícone além da cor — seleção não pode depender só de cor (HIG 4.3 / Material R6.8). */}
                {sel && (
                  <View style={s.courtCheck}>
                    <Check color={c.onAccent} size={14} strokeWidth={3} />
                  </View>
                )}
                <View style={s.courtInfo}>
                  <Text style={s.courtName} numberOfLines={1} maxFontSizeMultiplier={MAX_SCALE}>{c.name}</Text>
                  <Text style={s.courtPrice}>{brl(c.pricePerHour)}/h</Text>
                </View>
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
              <Trophy color={c.primary} size={20} strokeWidth={1.7} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle}>Eventos da Arena</Text>
              <Text style={s.eventSub}>Copa de Inverno Society — Inscrições abertas! Toque para ver as regras.</Text>
            </View>
          </Card>
        </TouchableOpacity>

        {/* 4. Calendário deslizante */}
        <Text style={s.section}>Data</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Theme.spacing.margin, gap: Theme.spacing.stack }}
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
                <Text style={[s.dayName, sel && s.dayNameSel]} maxFontSizeMultiplier={MAX_SCALE}>{d.weekday}</Text>
                <Text style={[s.dayNum, sel && s.dayNumSel]} maxFontSizeMultiplier={MAX_SCALE}>{d.dayNum}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 5. Grade de horários */}
        <Text style={s.section}>Horários Disponíveis</Text>
        {loadingSlots ? (
          <View style={s.grid}>
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} width={hourW} height={HIT} borderRadius={Theme.radius.md} />)}
          </View>
        ) : hours.length === 0 ? (
          <Card padding="lg" style={s.emptyState}>
            <CalendarX2 color={c.textMuted} size={40} />
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

        {/* 6. Pagamento e divisão */}
        <Text style={s.section}>Pagamento</Text>
        <Card padding="none" style={s.payCard} variant="filled">
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
                  <Ico color={sel ? c.text : c.textMuted} size={20} />
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
                  <CheckSquare color={c.primary} size={22} />
                ) : (
                  <Square color={c.textMuted} size={22} />
                )}
                <View style={{ flex: 1, marginLeft: Theme.spacing.stack }}>
                  <Text style={s.publicTitle}>Partida Aberta (Completar Time)</Text>
                  <Text style={s.publicSub}>Permitir que jogadores avulsos entrem e paguem a cota para jogar.</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* 7. Localização */}
        <Text style={s.section}>Localização</Text>
        <View style={{ paddingHorizontal: Theme.spacing.margin }}>
          <MapPreview name={arena.name} address={arena.address} city={arena.city} />
        </View>

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
              {termsAccepted ? <CheckSquare color={c.primary} size={22} /> : <Square color={c.textMuted} size={22} />}
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

        {!!slot && (
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>
              {brl(price)}
              {mode === 'split' && <Text style={s.totalHint}>  ·  {splitCount} pessoas · {slot}</Text>}
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
      </View>

      {/* Regras — conteúdo e comportamento idênticos; só o container deixou de ser
          o `Modal` do RN, que na web não entrega toque a nada dentro dele. */}
      <Dialog visible={showRulesModal} onRequestClose={() => setShowRulesModal(false)}>
        <View style={s.modalCard}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle} accessibilityRole="header">Termos e Regras</Text>
            <TouchableOpacity
              onPress={() => setShowRulesModal(false)}
              style={s.modalClose}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <X color={c.text} size={24} />
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
      </Dialog>
    </View>
  );
}

const styles = (c: Colors) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.background },

  scrimTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 140 },
  heroBar: {
    position: 'absolute', left: Theme.spacing.margin, right: Theme.spacing.margin,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Theme.spacing.sm,
  },
  glassBtn: {
    width: HIT, height: HIT, borderRadius: Theme.radius.full,
    backgroundColor: c.scrim,
    alignItems: 'center', justifyContent: 'center',
  },
  courtBadge: {
    flexShrink: 1, maxWidth: '55%', height: 32, justifyContent: 'center',
    paddingHorizontal: Theme.spacing.stack, borderRadius: Theme.radius.full,
    backgroundColor: c.scrim,
  },
  courtBadgeTxt: { ...Theme.typography.small, color: c.onPhoto },

  dots: { position: 'absolute', bottom: SHEET_OVERLAP + Theme.spacing.stack, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: Theme.radius.full, backgroundColor: c.onPhotoMuted, opacity: 0.55 },
  dotActive: { backgroundColor: c.onPhoto, width: 18, opacity: 1 },

  sheet: {
    marginTop: -SHEET_OVERLAP,
    backgroundColor: c.surface,
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    paddingHorizontal: Theme.spacing.margin,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
    gap: Theme.spacing.stack,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Theme.spacing.stack },
  name: { ...Theme.typography.h1, color: c.text, flex: 1 },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.xs,
    height: 32, paddingHorizontal: Theme.spacing.stack,
    borderRadius: Theme.radius.full, backgroundColor: c.surfaceHigh,
  },
  ratingTxt: { ...Theme.typography.label, color: c.text },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Theme.spacing.sm },
  address: { ...Theme.typography.caption, color: c.textMuted, flex: 1 },

  section: {
    ...Theme.typography.h2, color: c.text,
    paddingHorizontal: Theme.spacing.margin,
    marginTop: Theme.spacing.section, marginBottom: Theme.spacing.md,
  },

  courtCard: {
    width: 168, height: 120, borderRadius: Theme.radius.lg, overflow: 'hidden',
    // Fundo escuro fixo: é o que fica atrás da foto da quadra, e o nome em cima
    // usa `onPhoto`. Se seguisse o tema, no escuro viraria branco e lavaria a foto.
    backgroundColor: '#1A1C1C', justifyContent: 'flex-end',
    padding: Theme.spacing.stack,
    borderWidth: 2, borderColor: 'transparent',
  },
  courtCardSel: { borderColor: c.accent },
  courtCheck: {
    position: 'absolute', top: Theme.spacing.sm, right: Theme.spacing.sm,
    width: 24, height: 24, borderRadius: Theme.radius.full,
    backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
  },
  courtInfo: { gap: 2 },
  courtName: { ...Theme.typography.label, color: c.onPhoto },
  courtPrice: { ...Theme.typography.price, fontSize: 12, color: c.onPhotoMuted },

  eventBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.stack,
    marginHorizontal: Theme.spacing.margin, marginTop: Theme.spacing.lg,
  },
  eventIconWrap: { width: 40, height: 40, borderRadius: Theme.radius.sm, backgroundColor: c.primaryDim, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { ...Theme.typography.captionSemibold, color: c.text },
  eventSub: { ...Theme.typography.small, color: c.textMuted, lineHeight: 18, marginTop: 4 },

  day: {
    backgroundColor: c.surfaceGray, borderRadius: Theme.radius.md,
    width: 64, height: 80, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  // `selected`, e não `inverse`: no escuro o item escolhido vira o bloco neon
  // (é o que a tela Detalhes da Arena - Dark Kinetic mostra), não um bloco branco.
  daySel: { backgroundColor: c.selected },
  dayName: { ...Theme.typography.small, color: c.textMuted, textTransform: 'uppercase' },
  dayNameSel: { color: c.onSelected, opacity: 0.7 },
  dayNum: { ...Theme.typography.price, fontSize: 22, color: c.text },
  dayNumSel: { color: c.onSelected },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Theme.spacing.stack, paddingHorizontal: Theme.spacing.margin },
  hour: {
    height: HIT, borderRadius: Theme.radius.md,
    backgroundColor: c.surfaceGray,
    borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  // Selecionado troca o FUNDO (claro → preto) além da cor do texto, para o estado
  // sobreviver sem enxergar cor (HIG 4.3 / Material R6.8).
  hourSel: { backgroundColor: c.selected, borderColor: c.accent },
  hourTxt: { ...Theme.typography.label, color: c.text },
  hourTxtSel: { color: c.onSelected },

  emptyState: { alignItems: 'center', gap: Theme.spacing.stack, marginHorizontal: Theme.spacing.margin, paddingVertical: Theme.spacing.xl },
  emptyTitle: { ...Theme.typography.caption, color: c.textMuted, textAlign: 'center', maxWidth: '80%' },

  payCard: { marginHorizontal: Theme.spacing.margin },
  payOpt: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.stack, paddingVertical: Theme.spacing.md, paddingHorizontal: Theme.spacing.md, minHeight: HIT },
  payDivider: { borderTopWidth: 1, borderTopColor: c.border },
  payTxt: { ...Theme.typography.caption, color: c.textMuted, flex: 1 },
  payTxtSel: { fontFamily: Theme.fonts.bodySemibold, color: c.text },
  radio: { width: 22, height: 22, borderRadius: Theme.radius.full, borderWidth: 2, borderColor: c.textDim, alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: c.primary },
  radioDot: { width: 12, height: 12, borderRadius: Theme.radius.full, backgroundColor: c.primary },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Theme.spacing.md,
    paddingVertical: Theme.spacing.md, borderTopWidth: 1, borderTopColor: c.border,
  },
  stepperLabel: { ...Theme.typography.caption, color: c.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceGray, borderRadius: Theme.radius.md },
  stepBtn: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontFamily: Theme.fonts.display, color: c.primary, fontSize: 24 },
  stepTxtOff: { color: c.textDim },
  stepNum: { ...Theme.typography.price, fontSize: 18, color: c.text, minWidth: 32, textAlign: 'center' },

  publicToggle: {
    flexDirection: 'row', alignItems: 'center', padding: Theme.spacing.md, minHeight: HIT,
    borderTopWidth: 1, borderTopColor: c.border,
    backgroundColor: c.primaryDim,
  },
  publicTitle: { ...Theme.typography.captionSemibold, color: c.text },
  publicSub: { ...Theme.typography.small, color: c.textMuted, marginTop: 2 },

  err: { ...Theme.typography.caption, color: c.danger, textAlign: 'center', marginTop: Theme.spacing.md, paddingHorizontal: Theme.spacing.margin },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: c.surface,
    borderTopLeftRadius: Theme.radius.xl, borderTopRightRadius: Theme.radius.xl,
    paddingHorizontal: Theme.spacing.margin, paddingTop: Theme.spacing.stack,
    alignItems: 'center',
    ...Theme.shadow.up,
  },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: Theme.spacing.sm, width: '100%', marginBottom: Theme.spacing.sm },
  totalLabel: { ...Theme.typography.small, color: c.textMuted },
  totalValue: { ...Theme.typography.price, fontSize: 18, color: c.text },
  totalHint: { ...Theme.typography.small, color: c.textMuted },

  termsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.sm, width: '100%' },
  checkbox: { alignItems: 'center', justifyContent: 'center' },
  termsText: { ...Theme.typography.small, color: c.textMuted, lineHeight: 17, flex: 1, marginLeft: 10 },
  termsLink: { fontFamily: Theme.fonts.bodySemibold, color: c.primary, textDecorationLine: 'underline' },

  modalCard: { backgroundColor: c.surface, width: '100%', maxWidth: 400, borderRadius: Theme.radius.lg, padding: Theme.spacing.lg, ...Theme.shadow.overlay },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...Theme.typography.h3, color: c.text },
  // -12 de margem compensa o alvo de 48 para o X não parecer deslocado do canto.
  modalClose: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  modalText: { ...Theme.typography.caption, color: c.textMuted, lineHeight: 22 },
});
