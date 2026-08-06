import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Share, Linking, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Search, Settings2, CheckCircle2, Clock3, XCircle, MessageCircle, CreditCard, Star } from 'lucide-react-native';
import { api } from '@/api';
import { Theme, brl } from '@/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [b, setB] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentInvites, setRecentInvites] = useState<any[]>([]);
  const [isEditingPublic, setIsEditingPublic] = useState(false);
  const [spotsNeeded, setSpotsNeeded] = useState('');

  const load = useCallback(() => { 
    api.booking(id!).then(res => {
      setB(res);
      setSpotsNeeded(String(res.spotsNeeded || 0));
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
      Alert.alert('Sucesso', 'Amigo adicionado ao jogo!');
    } catch (e: any) {
      Alert.alert('Ops', e.message);
    }
  };

  if (!b) return (
    <View style={s.wrap}>
      <Skeleton width="100%" height={150} style={{ margin: 16 }} />
      <Skeleton width="100%" height={200} style={{ margin: 16 }} />
    </View>
  );

  const share = () =>
    Share.share({
      message: `Bora jogar! Reservei ${b.court.name} na ${b.court.arena.name} dia ${b.date.split('-').reverse().join('/')} às ${b.startTime}. Paga tua parte aqui (${brl(Math.ceil(b.totalAmount / b.splitCount))}): ${b.shareUrl}`,
    });

  const statusColor = b.status === 'confirmed' ? Theme.colors.success : b.status === 'cancelled' ? Theme.colors.danger : Theme.colors.warning;
  const StatusIcon = b.status === 'confirmed' ? CheckCircle2 : b.status === 'cancelled' ? XCircle : Clock3;
  const label: any = { pix: 'Pix', card: 'Cartão', on_site: 'No local' };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: Theme.spacing.md, paddingBottom: 40, gap: Theme.spacing.md }}>
      <Card padding="md">
        <Text style={s.h1}>{b.court.arena.name}</Text>
        <Text style={s.mut}>{b.court.name} · {b.date.split('-').reverse().join('/')} · {b.startTime}–{b.endTime}</Text>
        <View style={s.statusRow}>
          <StatusIcon color={statusColor} size={16} strokeWidth={2} />
          <Text style={[s.status, { color: statusColor }]}>
            {b.status === 'confirmed' ? 'Reserva confirmada' : b.status === 'cancelled' ? 'Cancelada' : 'Aguardando pagamentos'}
          </Text>
        </View>
        <Text style={s.totalAmount}>{brl(b.totalAmount)}</Text>
      </Card>

      {b.paymentMode === 'split' && (
        <>
          {/* Ações exclusivas do Dono da Reserva */}
          {me?.id === b.userId && (
            <Card padding="md" style={{ borderColor: Theme.colors.primary, borderWidth: 1 }}>
              <Text style={s.h2}>Configurações do Organizador</Text>
              
              {!b.shares.some((s: any) => s.userId === me.id && s.status === 'paid') && (
                <Button 
                  title="Pagar minha própria cota" 
                  onPress={() => api.payMyShare(b.id).then(load).catch(e => Alert.alert('Erro', e.message))} 
                  style={{ marginBottom: 12 }}
                />
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Theme.colors.text, fontWeight: '700' }}>Partida Aberta (Pública)</Text>
                  <Text style={{ color: Theme.colors.textMuted, fontSize: 13, marginTop: 2 }}>{b.isPublic ? 'Ligado. Qualquer um pode entrar.' : 'Desligado. Apenas convidados.'}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsEditingPublic(!isEditingPublic)}>
                  <Settings2 color={Theme.colors.primary} size={24} />
                </TouchableOpacity>
              </View>

              {isEditingPublic && (
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingTop: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={{ color: Theme.colors.textMuted }}>Vagas abertas:</Text>
                    <TextInput 
                      style={[s.searchInput, { flex: 0, width: 60, height: 36, backgroundColor: Theme.colors.surface, borderRadius: Theme.radius.sm, textAlign: 'center', color: Theme.colors.text }]}
                      keyboardType="number-pad"
                      value={spotsNeeded}
                      onChangeText={setSpotsNeeded}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <Button 
                      title={b.isPublic ? "Desligar Partida Aberta" : "Ligar Partida Aberta"} 
                      variant="outline"
                      style={{ flex: 1 }}
                      onPress={() => {
                        api.updatePublicMatch(b.id, { isPublic: !b.isPublic, spotsNeeded: Number(spotsNeeded) })
                           .then(() => { setIsEditingPublic(false); load(); })
                           .catch(e => Alert.alert('Erro', e.message));
                      }}
                    />
                    {b.isPublic && (
                      <Button 
                        title="Salvar Vagas" 
                        style={{ flex: 1 }}
                        onPress={() => {
                          api.updatePublicMatch(b.id, { isPublic: true, spotsNeeded: Number(spotsNeeded) })
                             .then(() => { setIsEditingPublic(false); load(); })
                             .catch(e => Alert.alert('Erro', e.message));
                        }}
                      />
                    )}
                  </View>
                </View>
              )}
            </Card>
          )}

          <Card padding="md">
            <Text style={s.h2}>Adicionar à Lista do Fut</Text>
            <View style={s.searchBox}>
              <Search color={Theme.colors.textMuted} size={20} />
              <TextInput
                style={s.searchInput}
                placeholder="Buscar amigo por @username ou nome"
                placeholderTextColor={Theme.colors.textMuted}
                value={search}
                onChangeText={doSearch}
              />
            </View>
            
            {search.length > 0 ? searchResults.map(u => (
              <View key={u.id} style={s.userRow}>
                <View>
                  <Text style={{ color: Theme.colors.text, fontWeight: '600' }}>{u.name}</Text>
                  {u.username && <Text style={{ color: Theme.colors.textMuted, fontSize: 13 }}>@{u.username}</Text>}
                </View>
                <Button size="sm" title="Convidar" onPress={() => invite(u.id)} />
              </View>
            )) : recentInvites.length > 0 && (
              <View>
                <Text style={{ color: Theme.colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 }}>
                  SUGESTÕES (Jogaram com você)
                </Text>
                {recentInvites.map(u => (
                  <View key={u.id} style={s.userRow}>
                    <View>
                      <Text style={{ color: Theme.colors.text, fontWeight: '600' }}>{u.name}</Text>
                      {u.username && <Text style={{ color: Theme.colors.textMuted, fontSize: 13 }}>@{u.username}</Text>}
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

            <Button title="Enviar link pelo WhatsApp" icon={<MessageCircle />} onPress={share} />
            <Text style={[s.mut, { textAlign: 'center', marginTop: 8 }]}>
              Amigos sem o app pagam clicando no link
            </Text>
          </Card>

          <Card padding="md">
            <Text style={s.h2}>Cotas ({b.shares.length}/{b.splitCount})</Text>
            {b.shares.length === 0 && <Text style={s.mut}>Ninguém entrou ainda — envie o link ou adicione amigos!</Text>}
            {b.shares.map((sh: any) => (
              <View key={sh.id} style={s.row}>
                <View>
                  <Text style={{ color: Theme.colors.text }}>{sh.name} <Text style={s.mut}>{label[sh.method]}</Text></Text>
                  {sh.userId === me?.id && sh.status === 'committed' && (
                    <TouchableOpacity onPress={() => api.payMyShare(b.id).then(load)} style={{ marginTop: 4 }}>
                      <Text style={{ color: Theme.colors.primary, fontWeight: '700', fontSize: 13 }}>Pagar agora</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={{ color: sh.status === 'pending' ? Theme.colors.danger : sh.status === 'committed' ? Theme.colors.warning : Theme.colors.success, fontWeight: '600' }}>
                  {sh.status === 'pending' ? 'aguardando' : sh.status === 'committed' ? 'pendente' : 'pago'}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {b.paymentMode === 'full' && b.status === 'pending' && b.payments?.[0]?.checkoutUrl && (
        <Button title="Concluir pagamento" icon={<CreditCard />} onPress={() => Linking.openURL(b.payments[0].checkoutUrl)} />
      )}

      {/* Avaliação após o jogo (padrão marketplace) */}
      {(b.status === 'done' || (b.status === 'confirmed' && b.date < new Date().toISOString().slice(0, 10))) && (
        <Card padding="md">
          {reviewed ? (
            <Text style={{ color: Theme.colors.success, fontWeight: '700', textAlign: 'center' }}>Avaliação enviada — obrigado!</Text>
          ) : (
            <>
              <Text style={s.h2}>Como foi jogar na {b.court.arena.name}?</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setStars(n)}>
                    <Star
                      size={30}
                      color={n <= stars ? Theme.colors.warning : Theme.colors.border}
                      fill={n <= stars ? Theme.colors.warning : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={s.reviewInput} placeholder="Conte como foi (opcional)" placeholderTextColor={Theme.colors.textMuted}
                value={comment} onChangeText={setComment} multiline
              />
              <Button
                title="Enviar avaliação"
                disabled={stars === 0}
                style={{ marginTop: Theme.spacing.sm }}
                onPress={() =>
                  api.reviewArena(b.court.arena.id, { rating: stars, comment })
                    .then(() => setReviewed(true))
                    .catch((e) => Alert.alert('Ops', e.message))
                }
              />
            </>
          )}
        </Card>
      )}

      {b.status !== 'cancelled' && b.status !== 'confirmed' && (
        <TouchableOpacity
          style={s.cancel}
          onPress={() =>
            Alert.alert('Cancelar reserva?', 'Essa ação não pode ser desfeita.', [
              { text: 'Voltar' },
              { text: 'Cancelar', style: 'destructive', onPress: () => api.cancelBooking(b.id).then(load) },
            ])
          }
        >
          <Text style={{ color: Theme.colors.danger, textAlign: 'center', fontWeight: '600' }}>Cancelar reserva</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Theme.colors.background },
  h1: { color: Theme.colors.text, fontSize: 20, fontWeight: '800' },
  h2: { color: Theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  mut: { color: Theme.colors.textMuted, fontSize: 13, marginTop: 3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  status: { fontWeight: '700' },
  totalAmount: { ...Theme.typography.price, color: Theme.colors.text, fontSize: 24, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  cancel: { borderWidth: 1, borderColor: Theme.colors.danger, borderRadius: Theme.radius.md, padding: 14, marginTop: Theme.spacing.lg },
  reviewInput: { backgroundColor: Theme.colors.background, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.radius.sm, color: Theme.colors.text, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, borderWidth: 1, borderColor: Theme.colors.border, borderRadius: Theme.radius.md, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, color: Theme.colors.text, marginLeft: 8 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  
  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  orLine: { flex: 1, height: 1, backgroundColor: Theme.colors.border },
  orText: { marginHorizontal: 12, color: Theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
});
