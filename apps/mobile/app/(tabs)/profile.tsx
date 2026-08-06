import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronRight, ChevronDown, User as UserIcon, CreditCard, 
  Settings, History, LogOut, Bell, FileText, Lock, Gift, MapPin, Search
} from 'lucide-react-native';
import { api, setToken } from '@/api';
import { Theme } from '@/theme';
import { Skeleton } from '@/components/Skeleton';

// --- COMPONENTES DA TELA ---

function Avatar({ name }: { name: string }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View style={s.avatarBox}>
      <Text style={s.avatarTxt}>{initial}</Text>
    </View>
  );
}

function SectionItem({ icon: Icon, title, subtitle, onPress, rightContent }: any) {
  return (
    <TouchableOpacity style={s.itemRow} activeOpacity={0.7} onPress={onPress}>
      <View style={s.itemIconWrap}>
        <Icon size={22} color={Theme.colors.text} />
      </View>
      <View style={s.itemTexts}>
        <Text style={s.itemTitle}>{title}</Text>
        {!!subtitle && <Text style={s.itemSub}>{subtitle}</Text>}
      </View>
      {rightContent || <ChevronRight size={18} color={Theme.colors.textMuted} />}
    </TouchableOpacity>
  );
}

function Accordion({ icon: Icon, title, subtitle, children, badge }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={s.accordionWrap}>
      <TouchableOpacity 
        style={s.accordionHeader} 
        activeOpacity={0.7} 
        onPress={() => setExpanded(!expanded)}
      >
        <View style={s.itemIconWrap}>
          <Icon size={22} color={Theme.colors.text} />
        </View>
        <View style={s.itemTexts}>
          <Text style={s.itemTitle}>{title}</Text>
          {!!subtitle && !expanded && <Text style={s.itemSub}>{subtitle}</Text>}
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {!!badge && !expanded && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{badge}</Text>
            </View>
          )}
          {expanded ? <ChevronDown size={18} color={Theme.colors.textMuted} /> : <ChevronRight size={18} color={Theme.colors.textMuted} />}
        </View>
      </TouchableOpacity>
      
      {expanded && (
        <View style={s.accordionBody}>
          {children}
        </View>
      )}
    </View>
  );
}

function SubItem({ title, onPress, isDanger }: any) {
  return (
    <TouchableOpacity style={s.subItemRow} activeOpacity={0.7} onPress={onPress}>
      <Text style={[s.subItemTitle, isDanger && { color: Theme.colors.danger }]}>{title}</Text>
      {isDanger ? <LogOut size={16} color={Theme.colors.danger} /> : <ChevronRight size={16} color={Theme.colors.border} />}
    </TouchableOpacity>
  );
}

// --- TELA PRINCIPAL ---

export default function Profile() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { 
    api.me().then(setMe).catch(() => {}).finally(() => setLoading(false)); 
  }, []);

  const logout = async () => {
    await setToken(null);
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={s.wrap}>
        <View style={s.header}>
          <Skeleton width={64} height={64} borderRadius={32} />
          <View style={{ marginLeft: 16, gap: 8 }}>
            <Skeleton width={120} height={24} />
            <Skeleton width={160} height={16} />
          </View>
        </View>
        <Skeleton width="100%" height={80} style={{ marginTop: 16, borderRadius: 12 }} />
        <Skeleton width="100%" height={200} style={{ marginTop: 16, borderRadius: 12 }} />
      </View>
    );
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* 1. Header (Avatar + Nome) */}
      <View style={s.header}>
        <Avatar name={me?.name || 'Visitante'} />
        <View style={s.headerInfo}>
          <Text style={s.name}>{me?.name || 'Visitante'}</Text>
          <TouchableOpacity style={s.clubeBtn} activeOpacity={0.7}>
            <Text style={s.clubeTxt}>Jogador Pro — 2 meses grátis!</Text>
            <ChevronRight size={14} color={Theme.colors.text} />
          </TouchableOpacity>
          {me?.username && <Text style={s.username}>@{me.username}</Text>}
        </View>
      </View>

      <View style={s.divider} />

      {/* 2. Menu Top-Level (Pagamentos) */}
      <SectionItem 
        icon={CreditCard} 
        title="Pagamentos" 
        subtitle="Gerencie suas formas de pagamento e recibos"
        onPress={() => {}} 
      />

      {/* Banner Promocional no meio do menu (estilo iFood) */}
      <View style={s.promoBanner}>
        <View style={s.promoIconBox}>
          <Gift size={24} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.promoTitle}>Convide um amigo e ganhe R$ 20</Text>
          <Text style={s.promoSub}>Acumule saldo a cada amigo que jogar no app!</Text>
        </View>
        <ChevronRight size={18} color={Theme.colors.textMuted} />
      </View>

      <View style={s.dividerThin} />

      {/* 3. Notificações */}
      <SectionItem 
        icon={Bell} 
        title="Notificações" 
        rightContent={<View style={s.badge}><Text style={s.badgeTxt}>3</Text></View>}
        onPress={() => {}} 
      />

      <View style={s.dividerThin} />

      {/* 4. Sanfonas (Accordions) */}
      <Accordion icon={History} title="Minhas Partidas e Estatísticas" subtitle="Histórico, placares e arenas visitadas">
        <SubItem title="Jogos concluídos" onPress={() => {}} />
        <SubItem title="Reservas ativas" onPress={() => {}} />
        <SubItem title="Estatísticas do Jogador" onPress={() => {}} />
      </Accordion>

      <Accordion icon={UserIcon} title="Conta" subtitle="Dados pessoais, senha e endereços">
        <SubItem title="Dados da conta" onPress={() => {}} />
        <SubItem title="Meu @username" onPress={() => {}} />
        <SubItem title="Alterar senha" onPress={() => {}} />
        <SubItem title="Endereços" onPress={() => {}} />
      </Accordion>

      <Accordion icon={Settings} title="Configurações">
        <SubItem title="Gerenciar notificações" onPress={() => {}} />
        <SubItem title="Privacidade" onPress={() => {}} />
        <SubItem title="Termos de uso" onPress={() => {}} />
        <SubItem title="Sair da conta" onPress={logout} isDanger />
      </Accordion>

      <Text style={s.version}>Liggo v1.2.0</Text>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Theme.colors.background },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 32 },
  avatarBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: Theme.colors.primaryDim, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 28, color: Theme.colors.text, fontWeight: '800' },
  headerInfo: { marginLeft: 16, flex: 1, justifyContent: 'center' },
  name: { fontSize: 22, color: Theme.colors.text, fontWeight: '800' },
  username: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 2 },
  clubeBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4, backgroundColor: Theme.colors.surfaceHighlight, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Theme.radius.full },
  clubeTxt: { fontSize: 12.5, color: Theme.colors.text, fontWeight: '700' },

  divider: { height: 8, backgroundColor: Theme.colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Theme.colors.border, marginVertical: 12 },
  dividerThin: { height: 1, backgroundColor: Theme.colors.border, marginHorizontal: 20 },

  // Items
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  itemIconWrap: { width: 32, alignItems: 'flex-start' },
  itemTexts: { flex: 1, paddingRight: 16 },
  itemTitle: { fontSize: 16, color: Theme.colors.text, fontWeight: '600' },
  itemSub: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 4, lineHeight: 18 },

  // Promo Banner
  promoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface, marginHorizontal: 20, marginVertical: 12, padding: 16, borderRadius: Theme.radius.lg, borderWidth: 1, borderColor: Theme.colors.border, gap: 12 },
  promoIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: Theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  promoTitle: { fontSize: 15, color: Theme.colors.text, fontWeight: '800' },
  promoSub: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 2, lineHeight: 18 },

  // Badge
  badge: { backgroundColor: Theme.colors.danger, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  // Accordion
  accordionWrap: { borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  accordionBody: { paddingLeft: 52, paddingRight: 20, paddingBottom: 12 },
  subItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Theme.colors.surface },
  subItemTitle: { fontSize: 15, color: Theme.colors.text, fontWeight: '500' },

  version: { textAlign: 'center', color: Theme.colors.textMuted, fontSize: 12, marginTop: 40 },
});
