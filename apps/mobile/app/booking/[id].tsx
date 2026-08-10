import { useCallback, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Share, Linking, Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft, Search, MessageCircle, CreditCard, Star,
  TriangleAlert, CircleCheckBig, X,
} from 'lucide-react-native';
import { api } from '@/api';
import { Theme, inputText, brl, type Colors } from '@/theme';
import { useColors, useStyles } from '@/theme-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { Avatar } from '@/components/Avatar';
import { SplitProgress } from '@/components/SplitProgress';
import { statusMeta } from '@/components/StatusBadge';
import { Dialog } from '@/components/Dialog';

const METHOD_LABEL: Record<string, string> = { pix: 'Pix', card: 'Cartão', on_site: 'No local' };

// Função (e não constante) porque as cores mudam com o tema.
const shareStatus = (status: string, c: Colors) => ({
  paid: { label: 'Pago', color: c.primary },
  committed: { label: 'Pendente', color: c.warningText },
  pending: { label: 'Aguardando', color: c.textMuted },
}[status] ?? { label: 'Aguardando', color: c.textMuted });

export default function BookingScreen() {
  const c = useColors();
  const s = useStyles(styles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [b, setB] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentInvites, setRecentInvites] = useState<any[]>([]);
  const [spotsNeeded, setSpotsNeeded] = useState('');
  const [savingSpots, setSavingSpots] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  // Aviso na própria tela. `Alert.alert` com botões é no-op no react-native-web,
  // então erro e sucesso ficavam invisíveis — parecia que o botão não fazia nada.
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; msg: string } | null>(null);

  // Enquanto o usuário está mexendo no campo de vagas, o polling não pode
  // sobrescrever o que ele digitou. Ref (e não state) porque `load` precisa
  // manter a identidade estável para o setInterval.
  const spotsDirty = useRef(false);

  const load = useCallback(() => {
    api.booking(id!).then(res => {
      setB(res);
      if (!spotsDirty.current) setSpotsNeeded(String(res.spotsNeeded || 0));
    }).catch(() => {});
  }, [id]);

  useFocusEffect(useCallback(() => {
    api.me().then(setMe).catch(() => {});
    api.recentInvites().then(setRecentInvites).catch(() => {});
    load();
    const t = setInterval(load, 5000); // acompanha cotas em tempo real
    return () => clearInterval(t);
  }, [load]));

  const doSearch = async (q: string) => {
    setSearch(q);
    if (q.length >= 3) {
      const res = await api.searchUsers(q).catch(() => []);
      setSearchResults(res);
    } else {
      setSearchResults([]);
    }
  };

  const invite = async (userId: string) => {
    try {
      await api.inviteUser(id!, userId);
      setSearch('');
      setSearchResults([]);
      load();
      setNotice({ kind: 'ok', msg: 'Amigo adicionado ao jogo.' });
    } catch (e: any) {
      setNotice({ kind: 'error', msg: e.message });
    }
  };

  const Header = (
    <View style={[s.header, { paddingTop: insets.top + Theme.spacing.sm }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={s.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <ArrowLeft color={c.text} size={22} />
      </TouchableOpacity>
      <Text style={s.headerTitle} accessibilityRole="header">Detalhes da Reserva</Text>
      <View style={s.backBtn} />
    </View>
  );

  if (!b) return (
    <View style={s.wrap}>
      {Header}
      <View style={{ padding: Theme.spacing.margin, gap: Theme.spacing.md }}>
        <Skeleton width="100%" height={100} borderRadius={Theme.radius.lg} />
        <Skeleton width="100%" height={160} borderRadius={Theme.radius.lg} />
        <Skeleton width="100%" height={200} borderRadius={Theme.radius.lg} />
      </View>
    </View>
  );

  // `myRole` vem da API; o fallback cobre resposta antiga em cache.
  const isOrganizer = b.myRole ? b.myRole === 'organizer' : me?.id === b.userId;
  const isSplit = b.paymentMode === 'split' && !!b.splitCount;
  // Pedidos ainda não aceitos não são cota: não contam vaga nem progresso.
  const held = b.shares.filter((sh: any) => sh.status !== 'requested');
  const requests = b.shares.filter((sh: any) => sh.status === 'requested');
  const paidShares = held.filter((sh: any) => sh.status !== 'pending').length;
  // Valor da cota vem da API (shareAt distribui os centavos do resto). Calcular
  // com Math.ceil aqui divergia do servidor em 1 centavo.
  const myShare = b.myShare ?? b.shares.find((sh: any) => sh.userId === me?.id) ?? null;
  const perPerson = myShare?.amount
    ?? (isSplit ? Math.floor(b.totalAmount / b.splitCount) : b.totalAmount);
  const photo = b.court?.photoUrl || b.court?.arena?.photoUrl;
  const { color: statusColor, Icon: StatusIcon } = statusMeta(b.status, c);

  const share = () =>
    Share.share({
      message: `Bora jogar! Reservei ${b.court.name} na ${b.court.arena.name} dia ${b.date.split('-').reverse().join('/')} às ${b.startTime}. Paga tua parte aqui (${brl(perPerson)}): ${b.shareUrl}`,
    });

  const setPublic = async (next: boolean) => {
    setNotice(null);
    try {
      await api.updatePublicMatch(b.id, { isPublic: next, spotsNeeded: Number(spotsNeeded) || b.splitCount });
      load();
    } catch (e: any) {
      setNotice({ kind: 'error', msg: e.message });
    }
  };

  const saveSpots = async () => {
    const n = Number(spotsNeeded);
    if (!Number.isInteger(n) || n < 0) {
      setNotice({ kind: 'error', msg: 'Informe um número de vagas válido.' });
      return;
    }
    setSavingSpots(true);
    setNotice(null);
    try {
      await api.updatePublicMatch(b.id, { isPublic: true, spotsNeeded: n });
      spotsDirty.current = false;
      load();
      setNotice({ kind: 'ok', msg: `Vagas abertas atualizadas para ${n}.` });
    } catch (e: any) {
      setNotice({ kind: 'error', msg: e.message });
    } finally {
      setSavingSpots(false);
    }
  };

  const answerRequest = async (shareId: string, aceitar: boolean) => {
    setNotice(null);
    try {
      if (aceitar) await api.approveRequest(b.id, shareId);
      else await api.rejectRequest(b.id, shareId);
      load();
      setNotice({ kind: 'ok', msg: aceitar ? 'Jogador aceito no racha.' : 'Pedido recusado.' });
    } catch (e: any) {
      setNotice({ kind: 'error', msg: e.message });
    }
  };

  const doCancel = async () => {
    setCancelling(true);
    try {
      await api.cancelBooking(b.id);
      setShowCancel(false);
      load();
      setNotice({ kind: 'ok', msg: 'Reserva cancelada.' });
    } catch (e: any) {
      setShowCancel(false);
      setNotice({ kind: 'error', msg: e.message });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View style={s.wrap}>
      {Header}

      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {!!notice && (
          <TouchableOpacity
            style={[s.notice, notice.kind === 'error' ? s.noticeError : s.noticeOk]}
            activeOpacity={0.8}
            onPress={() => setNotice(null)}
            accessibilityRole="alert"
            accessibilityLabel={notice.msg}
          >
            {notice.kind === 'error'
              ? <TriangleAlert color={c.danger} size={18} />
              : <CircleCheckBig color={c.primary} size={18} />}
            <Text style={[s.noticeTxt, { color: notice.kind === 'error' ? c.danger : c.primary }]}>
              {notice.msg}
            </Text>
            <X color={c.textMuted} size={16} />
          </TouchableOpacity>
        )}

        {/* 1. Faixa de status */}
        <View style={[s.statusBanner, { borderColor: statusColor }]}>
          <StatusIcon color={b.status === 'confirmed' ? c.primary : statusColor} size={18} />
          <Text style={s.statusTxt}>
            {b.status === 'confirmed' ? 'Reserva confirmada'
              : b.status === 'cancelled' ? 'Reserva cancelada'
              : b.status === 'done' ? 'Partida finalizada'
              : 'Aguardando pagamentos'}
          </Text>
        </View>

        {/* 2. Cartão da arena */}
        <View style={s.arenaCard}>
          <Image
            source={{ uri: photo || undefined }}
            style={s.arenaPhoto}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View style={{ flex: 1 }}>
            <Text style={s.arenaName} numberOfLines={1}>{b.court.arena.name}</Text>
            <Text style={s.arenaMeta} numberOfLines={2}>
              {b.court.name} • {b.date.split('-').reverse().join('/')} • {b.startTime}–{b.endTime}
            </Text>
          </View>
        </View>

        {/* 3. Divisão do pagamento — título à esquerda, o valor que importa em
            destaque à direita, e a barra ocupando a largura toda embaixo. */}
        <Card variant="gray" padding="lg" style={s.block}>
          <View style={s.payHead}>
            <View style={s.payHeadLeft}>
              <Text style={s.blockTitle}>{isSplit ? 'Divisão do Pagamento' : 'Pagamento'}</Text>
              {isSplit && <Text style={s.priceHint}>Cota total: {brl(b.totalAmount)}</Text>}
            </View>
            <View style={s.payHeadRight}>
              <Text style={s.priceBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {brl(isSplit ? perPerson : b.totalAmount)}
              </Text>
              <Text style={s.priceLabel}>{isSplit ? 'cada um paga' : 'total'}</Text>
            </View>
          </View>

          {isSplit && (
            <View style={{ marginTop: Theme.spacing.md }}>
              <SplitProgress paid={paidShares} total={b.splitCount} ringColor={c.surfaceGray} />
            </View>
          )}
        </Card>

        {isSplit && (
          <>
            {/* 4. Pedidos para entrar — só o organizador decide */}
            {isOrganizer && requests.length > 0 && (
              <Card variant="gray" padding="lg" style={s.block}>
                <Text style={s.blockTitle}>
                  {requests.length === 1 ? 'Pedido para entrar' : `Pedidos para entrar (${requests.length})`}
                </Text>
                <Text style={s.helperLeft}>
                  A vaga só é ocupada depois que você aceitar.
                </Text>
                {requests.map((sh: any, i: number) => (
                  <View key={sh.id} style={[s.playerRow, i > 0 && s.playerDivider]}>
                    <Avatar name={sh.name} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.playerName} numberOfLines={1}>{sh.name}</Text>
                      <Text style={s.playerMeta}>quer entrar no racha</Text>
                    </View>
                    <View style={s.requestActions}>
                      <Button size="sm" variant="outline" title="Recusar" onPress={() => answerRequest(sh.id, false)} />
                      <Button size="sm" title="Aceitar" onPress={() => answerRequest(sh.id, true)} />
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* 5. Jogadores confirmados */}
            <Card variant="gray" padding="lg" style={s.block}>
              <Text style={s.blockTitle}>Jogadores Confirmados</Text>
              {held.length === 0 ? (
                <Text style={s.empty}>Ninguém entrou ainda — envie o link ou adicione amigos.</Text>
              ) : (
                held.map((sh: any, i: number) => {
                  const st = shareStatus(sh.status, c);
                  return (
                    <View key={sh.id} style={[s.playerRow, i > 0 && s.playerDivider]}>
                      <Avatar name={sh.name} size={40} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.playerName} numberOfLines={1}>{sh.name}</Text>
                        <Text style={s.playerMeta}>
                          {METHOD_LABEL[sh.method] ?? sh.method}
                          {sh.userId === b.userId ? ' • Organizador' : ''}
                        </Text>
                        {sh.userId === me?.id && sh.status === 'committed' && (
                          <TouchableOpacity
                            onPress={() => api.payMyShare(b.id).then(load)}
                            style={{ marginTop: Theme.spacing.xs }}
                            accessibilityRole="button"
                          >
                            <Text style={s.payNow}>Pagar agora</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={[s.shareStatus, { color: st.color }]}>{st.label}</Text>
                    </View>
                  );
                })
              )}

              {/* Vale para os dois: organizador paga a dele, participante paga a
                  dele. Antes só o organizador conseguia — a API rejeitava o resto. */}
              {(isOrganizer || !!myShare) && myShare?.status !== 'paid' && (
                <Button
                  title="Pagar minha cota"
                  size="md"
                  fullWidth
                  style={{ marginTop: Theme.spacing.md }}
                  onPress={() => api.payMyShare(b.id).then(load).catch((e) => setNotice({ kind: 'error', msg: e.message }))}
                />
              )}
            </Card>

            {/* 6. Convidar — chamar gente é função do organizador */}
            {isOrganizer && (
            <Card variant="gray" padding="lg" style={s.block}>
              <Text style={s.blockTitle}>Adicionar à Lista do Fut</Text>
              <View style={s.searchBox}>
                <Search color={c.textMuted} size={20} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Buscar por @username ou nome"
                  placeholderTextColor={c.textDim}
                  value={search}
                  onChangeText={doSearch}
                  accessibilityLabel="Buscar amigo"
                />
              </View>

              {search.length > 0 ? searchResults.map((u) => (
                <View key={u.id} style={s.userRow}>
                  <Avatar name={u.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.playerName}>{u.name}</Text>
                    {!!u.username && <Text style={s.playerMeta}>@{u.username}</Text>}
                  </View>
                  <Button size="sm" title="Convidar" onPress={() => invite(u.id)} />
                </View>
              )) : recentInvites.length > 0 && (
                <View>
                  <Text style={s.overline}>SUGESTÕES — JOGARAM COM VOCÊ</Text>
                  {recentInvites.map((u) => (
                    <View key={u.id} style={s.userRow}>
                      <Avatar name={u.name} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.playerName}>{u.name}</Text>
                        {!!u.username && <Text style={s.playerMeta}>@{u.username}</Text>}
                      </View>
                      <Button size="sm" title="Convidar" onPress={() => invite(u.id)} />
                    </View>
                  ))}
                </View>
              )}

              <View style={s.orDivider}>
                <View style={s.orLine} />
                <Text style={s.orText}>OU</Text>
                <View style={s.orLine} />
              </View>

              <Button title="Enviar link pelo WhatsApp" variant="dark" size="lg" fullWidth icon={<MessageCircle />} onPress={share} />
              <Text style={s.helper}>Amigos sem o app pagam clicando no link.</Text>
            </Card>
            )}

            {/* 7. Partida aberta — só o organizador controla */}
            {isOrganizer && (
              <Card variant="gray" padding="lg" style={s.block}>
                <View style={s.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.blockTitle}>Partida Aberta</Text>
                    <Text style={s.helperLeft}>
                      {b.isPublic
                        ? 'Ligado. Jogadores avulsos podem entrar e pagar a cota.'
                        : 'Desligado. Só quem você convidar entra na partida.'}
                    </Text>
                  </View>
                  <Switch
                    value={!!b.isPublic}
                    onValueChange={setPublic}
                    trackColor={{ false: c.border, true: c.accent }}
                    thumbColor={c.surface}
                    accessibilityLabel="Partida aberta"
                  />
                </View>

                {b.isPublic && (
                  <View style={s.spotsRow}>
                    <Text style={s.helperLeft}>Vagas abertas</Text>
                    <TextInput
                      style={s.spotsInput}
                      keyboardType="number-pad"
                      value={spotsNeeded}
                      onChangeText={(v) => { spotsDirty.current = true; setSpotsNeeded(v); }}
                      accessibilityLabel="Número de vagas abertas"
                    />
                    <Button
                      size="sm"
                      title={savingSpots ? 'Salvando…' : 'Salvar'}
                      loading={savingSpots}
                      // Desabilitado quando não há o que salvar — assim o botão
                      // deixa claro que já está tudo gravado.
                      disabled={savingSpots || String(b.spotsNeeded ?? 0) === spotsNeeded}
                      onPress={saveSpots}
                    />
                  </View>
                )}
              </Card>
            )}
          </>
        )}

        {b.paymentMode === 'full' && b.status === 'pending' && b.payments?.[0]?.checkoutUrl && (
          <Button
            title="Concluir pagamento"
            size="lg"
            fullWidth
            icon={<CreditCard />}
            style={s.block}
            onPress={() => Linking.openURL(b.payments[0].checkoutUrl)}
          />
        )}

        {/* Avaliação após o jogo (padrão marketplace) */}
        {(b.status === 'done' || (b.status === 'confirmed' && b.date < new Date().toISOString().slice(0, 10))) && (
          <Card variant="gray" padding="lg" style={s.block}>
            {reviewed ? (
              <Text style={s.reviewDone}>Avaliação enviada — obrigado!</Text>
            ) : (
              <>
                <Text style={s.blockTitle}>Como foi jogar na {b.court.arena.name}?</Text>
                <View style={s.starRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setStars(n)}
                      accessibilityRole="button"
                      accessibilityLabel={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
                    >
                      <Star
                        size={32}
                        color={n <= stars ? c.warning : c.border}
                        fill={n <= stars ? c.warning : 'transparent'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={s.reviewInput}
                  placeholder="Conte como foi (opcional)"
                  placeholderTextColor={c.textDim}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                />
                <Button
                  title="Enviar avaliação"
                  size="lg"
                  fullWidth
                  disabled={stars === 0}
                  style={{ marginTop: Theme.spacing.stack }}
                  onPress={() =>
                    api.reviewArena(b.court.arena.id, { rating: stars, comment })
                      .then(() => setReviewed(true))
                      .catch((e) => setNotice({ kind: 'error', msg: e.message }))
                  }
                />
              </>
            )}
          </Card>
        )}

        {/* Cancelar a reserva inteira é do organizador; participante não desmarca
            o jogo dos outros. */}
        {isOrganizer && b.status !== 'cancelled' && b.status !== 'confirmed' && (
          <Button
            title="Cancelar reserva"
            variant="danger"
            size="lg"
            fullWidth
            style={s.block}
            onPress={() => setShowCancel(true)}
          />
        )}
      </ScrollView>

      {/* Confirmação em Dialog, não em Alert.alert nem no Modal do RN: o Alert com
          botões não existe no react-native-web e o Modal não entrega toque a nada
          dentro dele — nos dois casos o botão ficava inerte. */}
      <Dialog visible={showCancel} onRequestClose={() => setShowCancel(false)}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle} accessibilityRole="header">Cancelar reserva?</Text>
          <Text style={s.modalText}>
            Essa ação não pode ser desfeita. Quem já pagou a cota precisa ser reembolsado pelo suporte.
          </Text>
          <View style={s.modalActions}>
            <Button
              title="Voltar"
              variant="secondary"
              size="lg"
              style={{ flex: 1 }}
              disabled={cancelling}
              onPress={() => setShowCancel(false)}
            />
            <Button
              title={cancelling ? 'Cancelando…' : 'Cancelar reserva'}
              variant="danger"
              size="lg"
              style={{ flex: 1 }}
              loading={cancelling}
              disabled={cancelling}
              onPress={doCancel}
            />
          </View>
        </View>
      </Dialog>
    </View>
  );
}

const styles = (c: Colors) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: c.surface,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Theme.typography.bodySemibold, color: c.text, flex: 1, textAlign: 'center' },

  content: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Theme.spacing.margin,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.section,
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    padding: Theme.spacing.stack,
    marginBottom: Theme.spacing.stack,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
  },
  noticeOk: { backgroundColor: c.primaryDim, borderColor: c.primary },
  noticeError: { backgroundColor: c.dangerDim, borderColor: c.danger },
  noticeTxt: { ...Theme.typography.caption, flex: 1 },

  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: Theme.spacing.lg,
    borderRadius: Theme.radius.lg,
    backgroundColor: c.surface,
    ...Theme.shadow.overlay,
  },
  modalTitle: { ...Theme.typography.h3, color: c.text },
  modalText: { ...Theme.typography.caption, color: c.textMuted, marginTop: Theme.spacing.sm, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: Theme.spacing.stack, marginTop: Theme.spacing.lg },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    height: 44,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    backgroundColor: c.surface,
  },
  statusTxt: { ...Theme.typography.label, color: c.text },

  arenaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.stack,
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.stack,
    borderRadius: Theme.radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    ...Theme.shadow.raised,
  },
  arenaPhoto: { width: 72, height: 72, borderRadius: Theme.radius.sm, backgroundColor: c.surfaceHigh },
  arenaName: { ...Theme.typography.h3, color: c.text },
  arenaMeta: { ...Theme.typography.caption, color: c.textMuted, marginTop: Theme.spacing.xs },

  block: { marginTop: Theme.spacing.md },
  blockTitle: { ...Theme.typography.h3, color: c.text },

  payHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Theme.spacing.md },
  // O título pode quebrar em duas linhas; o valor nunca encolhe por causa dele.
  payHeadLeft: { flex: 1 },
  payHeadRight: { alignItems: 'flex-end', maxWidth: '45%' },
  priceLabel: { ...Theme.typography.small, color: c.textMuted },
  priceBig: { ...Theme.typography.price, fontSize: 30, lineHeight: 36, color: c.text },
  priceHint: { ...Theme.typography.small, color: c.textMuted, marginTop: Theme.spacing.xs },

  empty: { ...Theme.typography.caption, color: c.textMuted, marginTop: Theme.spacing.sm },

  playerRow: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.stack, paddingVertical: Theme.spacing.stack },
  playerDivider: { borderTopWidth: 1, borderTopColor: c.border },
  requestActions: { flexDirection: 'row', gap: Theme.spacing.sm },
  playerName: { ...Theme.typography.captionSemibold, color: c.text },
  playerMeta: { ...Theme.typography.small, color: c.textMuted, marginTop: 2 },
  payNow: { ...Theme.typography.small, fontFamily: Theme.fonts.bodyBold, color: c.primary },
  shareStatus: { ...Theme.typography.small, fontFamily: Theme.fonts.bodyBold },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    height: 48,
    paddingHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.stack,
    borderRadius: Theme.radius.full,
    backgroundColor: c.surface,
  },
  searchInput: { flex: 1, ...inputText(Theme.typography.caption), color: c.text, paddingVertical: 0 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.stack,
    paddingVertical: Theme.spacing.sm,
  },
  overline: { ...Theme.typography.overline, color: c.textMuted, marginTop: Theme.spacing.stack },

  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: Theme.spacing.md },
  orLine: { flex: 1, height: 1, backgroundColor: c.border },
  orText: { ...Theme.typography.overline, marginHorizontal: Theme.spacing.stack, color: c.textMuted },
  helper: { ...Theme.typography.small, color: c.textMuted, textAlign: 'center', marginTop: Theme.spacing.sm },
  helperLeft: { ...Theme.typography.small, color: c.textMuted, marginTop: Theme.spacing.xs },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.md },
  spotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.stack,
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  spotsInput: {
    width: 64,
    height: 44,
    borderRadius: Theme.radius.md,
    backgroundColor: c.surface,
    textAlign: 'center',
    ...inputText(Theme.typography.price),
    color: c.text,
  },

  starRow: { flexDirection: 'row', gap: Theme.spacing.sm, marginVertical: Theme.spacing.stack },
  reviewInput: {
    backgroundColor: c.surface,
    borderRadius: Theme.radius.md,
    ...inputText(Theme.typography.caption),
    color: c.text,
    padding: Theme.spacing.stack,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  reviewDone: { ...Theme.typography.captionSemibold, color: c.primary, textAlign: 'center' },
});
