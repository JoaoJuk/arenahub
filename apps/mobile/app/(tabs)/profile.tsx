import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronRight, ChevronDown, User as UserIcon, CreditCard,
  Settings, History, LogOut, Bell, Gift, Zap,
} from 'lucide-react-native';
import { api, setToken } from '@/api';
import { Theme, type Colors } from '@/theme';
import { useColors, useStyles } from '@/theme-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';

type RowProps = {
  icon: any;
  title: string;
  onPress?: () => void;
  right?: React.ReactNode;
  last?: boolean;
};

function Row({ icon: Icon, title, onPress, right, last }: RowProps) {
  const c = useColors();
  const s = useStyles(styles);
  return (
    <TouchableOpacity
      style={[s.row, !last && s.rowDivider]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Icon size={20} color={c.text} />
      <Text style={s.rowTitle}>{title}</Text>
      {right ?? <ChevronRight size={18} color={c.textDim} />}
    </TouchableOpacity>
  );
}

type AccordionProps = {
  icon: any;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  last?: boolean;
};

function Accordion({ icon: Icon, title, open, onToggle, children, last }: AccordionProps) {
  const c = useColors();
  const s = useStyles(styles);
  return (
    <View>
      <TouchableOpacity
        style={[s.row, !last && !open && s.rowDivider]}
        activeOpacity={0.7}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Icon size={20} color={c.text} />
        <Text style={s.rowTitle}>{title}</Text>
        {open
          ? <ChevronDown size={18} color={c.textDim} />
          : <ChevronRight size={18} color={c.textDim} />}
      </TouchableOpacity>
      {open && <View style={s.accordionBody}>{children}</View>}
    </View>
  );
}

function SubItem({ title, onPress }: { title: string; onPress?: () => void }) {
  const c = useColors();
  const s = useStyles(styles);
  return (
    <TouchableOpacity style={s.subItem} activeOpacity={0.7} onPress={onPress} accessibilityRole="button">
      <Text style={s.subItemTxt}>{title}</Text>
      <ChevronRight size={16} color={c.textDim} />
    </TouchableOpacity>
  );
}

export default function Profile() {
  const c = useColors();
  const s = useStyles(styles);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    api.me().then(setMe).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await setToken(null);
    router.replace('/login');
  };

  const toggle = (key: string) => setOpen((k) => (k === key ? null : key));

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={[s.content, { paddingTop: insets.top + Theme.spacing.stack, paddingBottom: insets.bottom + Theme.spacing.section }]}
    >
      <View style={s.topBar}>
        <Text style={s.wordmark}>Liggo</Text>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Configurações"
        >
          <Settings size={22} color={c.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ gap: Theme.spacing.lg, alignItems: 'center', marginTop: Theme.spacing.lg }}>
          <Skeleton width={96} height={96} borderRadius={Theme.radius.full} />
          <Skeleton width={160} height={28} />
          <Skeleton width="100%" height={104} borderRadius={Theme.radius.lg} />
          <Skeleton width="100%" height={168} borderRadius={Theme.radius.lg} />
        </View>
      ) : (
        <>
          {/* 1. Identidade */}
          <View style={s.identity}>
            <Avatar name={me?.name || 'Visitante'} size={96} />
            <Text style={s.name} numberOfLines={1}>{me?.name || 'Visitante'}</Text>
            {!!me?.username && <Text style={s.username}>@{me.username}</Text>}
          </View>

          {/* 2. Card "Pro" — a única superfície preta da tela */}
          <TouchableOpacity style={s.proCard} activeOpacity={0.9} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={s.proTitle}>Jogador Pro</Text>
              <Text style={s.proSub}>Desbloqueie estatísticas e reservas prioritárias.</Text>
            </View>
            <Zap size={28} color={c.accent} fill={c.accent} />
          </TouchableOpacity>

          {/* 3. Atalhos */}
          <View style={s.group}>
            <Row icon={CreditCard} title="Pagamentos" onPress={() => {}} />
            <Row
              icon={Gift}
              title="Convide amigos"
              onPress={() => {}}
              right={
                <View style={s.promoBadge}>
                  <Text style={s.promoBadgeTxt}>PROMO</Text>
                </View>
              }
            />
            <Row
              icon={Bell}
              title="Notificações"
              onPress={() => {}}
              last
              right={<View style={s.countBadge}><Text style={s.countBadgeTxt}>3</Text></View>}
            />
          </View>

          {/* 4. Seções expansíveis */}
          <View style={s.group}>
            <Accordion icon={History} title="Minhas partidas" open={open === 'matches'} onToggle={() => toggle('matches')}>
              <SubItem title="Jogos concluídos" />
              <SubItem title="Reservas ativas" />
              <SubItem title="Estatísticas do jogador" />
            </Accordion>

            <Accordion icon={UserIcon} title="Conta" open={open === 'account'} onToggle={() => toggle('account')}>
              <SubItem title="Dados da conta" />
              <SubItem title="Meu @username" />
              <SubItem title="Alterar senha" />
              <SubItem title="Endereços" />
            </Accordion>

            <Accordion icon={Settings} title="Configurações" open={open === 'config'} onToggle={() => toggle('config')} last>
              <SubItem title="Aparência (tema claro ou escuro)" onPress={() => router.push('/settings')} />
              <SubItem title="Gerenciar notificações" />
              <SubItem title="Privacidade" />
              <SubItem title="Termos de uso" />
            </Accordion>
          </View>

          <Button
            title="Sair"
            variant="danger"
            size="lg"
            fullWidth
            icon={<LogOut />}
            onPress={logout}
            style={{ marginTop: Theme.spacing.lg }}
          />

          <Text style={s.version}>Liggo v1.2.0</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = (c: Colors) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.background },
  content: {
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Theme.spacing.margin,
  },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  wordmark: { fontFamily: Theme.fonts.display, fontSize: 22, color: c.primary },

  identity: { alignItems: 'center', gap: Theme.spacing.sm, marginTop: Theme.spacing.md, marginBottom: Theme.spacing.lg },
  name: { ...Theme.typography.h1, color: c.text, marginTop: Theme.spacing.sm },
  username: { ...Theme.typography.caption, color: c.textMuted },

  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    padding: Theme.spacing.lg,
    borderRadius: Theme.radius.lg,
    // `contrast`, não `inverse`: no escuro este bloco sobe um degrau de superfície
    // (zinc-800) em vez de virar branco — é o que a tela Perfil - Dark mostra.
    backgroundColor: c.contrast,
    ...Theme.shadow.raised,
  },
  proTitle: { ...Theme.typography.h3, color: c.onContrast },
  proSub: { ...Theme.typography.caption, color: 'rgba(255,255,255,0.72)', marginTop: Theme.spacing.xs },

  group: {
    marginTop: Theme.spacing.lg,
    borderRadius: Theme.radius.lg,
    backgroundColor: c.surfaceGray,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    minHeight: 56,
    paddingHorizontal: Theme.spacing.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  rowTitle: { ...Theme.typography.bodySemibold, color: c.text, flex: 1 },

  accordionBody: { paddingLeft: Theme.spacing.section, paddingRight: Theme.spacing.md, paddingBottom: Theme.spacing.sm },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  subItemTxt: { ...Theme.typography.caption, color: c.textMuted },

  promoBadge: {
    paddingHorizontal: Theme.spacing.sm,
    height: 22,
    justifyContent: 'center',
    borderRadius: Theme.radius.full,
    backgroundColor: c.accent,
  },
  promoBadgeTxt: { ...Theme.typography.overline, fontSize: 10, color: c.onAccent },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: Theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.full,
    backgroundColor: c.danger,
  },
  countBadgeTxt: { ...Theme.typography.small, fontFamily: Theme.fonts.bodyBold, color: c.onInverse },

  version: { ...Theme.typography.small, textAlign: 'center', color: c.textDim, marginTop: Theme.spacing.section },
});
