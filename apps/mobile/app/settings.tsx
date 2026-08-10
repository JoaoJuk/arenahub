import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Sun, Moon, Smartphone } from 'lucide-react-native';
import { Theme, type Colors, type ThemeMode } from '@/theme';
import { useColors, useStyles, useThemeMode } from '@/theme-context';

/**
 * As miniaturas são amostras dos DOIS temas lado a lado, então as cores delas
 * são literais de propósito: se seguissem o tema ativo, as duas ficariam iguais
 * e a prévia não serviria para nada.
 */
const PREVIEW = {
  light: { bg: '#F9F9F9', bar: '#FFFFFF', card: '#FFFFFF', line: '#E5E5E5', text: '#1A1C1C' },
  dark: { bg: '#000000', bar: '#18181B', card: '#18181B', line: '#27272A', text: '#FFFFFF' },
} as const;

const ACCENT = '#39FF14';

function ThemePreview({ variant }: { variant: ThemeMode }) {
  const p = PREVIEW[variant];
  return (
    <View style={[pv.frame, { backgroundColor: p.bg, borderColor: p.line }]}>
      <View style={[pv.bar, { backgroundColor: p.bar, borderBottomColor: p.line }]}>
        <View style={[pv.dot, { backgroundColor: ACCENT }]} />
        <View style={[pv.barLine, { backgroundColor: p.line }]} />
      </View>
      <View style={[pv.card, { backgroundColor: p.card, borderColor: p.line }]}>
        <View style={[pv.cardLine, { backgroundColor: p.line, width: '70%' }]} />
        <View style={[pv.cardLine, { backgroundColor: p.line, width: '45%' }]} />
      </View>
      <View style={[pv.pill, { backgroundColor: ACCENT }]} />
    </View>
  );
}

export default function Settings() {
  const c = useColors();
  const s = useStyles(styles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, followsSystem, setMode, followSystem } = useThemeMode();

  const options: { value: ThemeMode; label: string; Icon: any }[] = [
    { value: 'light', label: 'Claro', Icon: Sun },
    { value: 'dark', label: 'Escuro', Icon: Moon },
  ];

  return (
    <View style={s.wrap}>
      <View style={[s.header, { paddingTop: insets.top + Theme.spacing.sm }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ArrowLeft color={c.text} size={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle} accessibilityRole="header">Configurações</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + Theme.spacing.section }]}>
        <Text style={s.section}>Aparência</Text>
        <Text style={s.sectionSub}>
          Escolha como o Liggo deve aparecer. A troca vale na hora, em todas as telas.
        </Text>

        <View style={s.options}>
          {options.map((o) => {
            // Com "seguir o aparelho" ligado o cartão ainda mostra qual tema está
            // valendo, mas sem a marca de escolha manual.
            const active = mode === o.value;
            const chosen = active && !followsSystem;
            return (
              <TouchableOpacity
                key={o.value}
                style={[s.option, active && s.optionActive]}
                activeOpacity={0.9}
                onPress={() => setMode(o.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: chosen }}
                accessibilityLabel={`Tema ${o.label}`}
              >
                <ThemePreview variant={o.value} />
                <View style={s.optionFooter}>
                  <o.Icon color={active ? c.primary : c.textMuted} size={18} />
                  <Text style={[s.optionLabel, active && s.optionLabelActive]}>{o.label}</Text>
                  {chosen && (
                    <View style={s.check}>
                      <Check color={c.onAccent} size={12} strokeWidth={3} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.systemRow}>
          <Smartphone color={c.text} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={s.systemTitle}>Seguir o aparelho</Text>
            <Text style={s.systemSub}>
              {followsSystem
                ? `Acompanhando o sistema — agora está ${mode === 'dark' ? 'escuro' : 'claro'}.`
                : 'Desligado. O tema fica fixo no que você escolheu acima.'}
            </Text>
          </View>
          <Switch
            value={followsSystem}
            onValueChange={(v) => (v ? followSystem() : setMode(mode))}
            trackColor={{ false: c.border, true: c.accent }}
            thumbColor={c.surface}
            accessibilityLabel="Seguir o tema do aparelho"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const pv = StyleSheet.create({
  frame: {
    height: 132,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 8,
    gap: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 22,
    marginHorizontal: -8,
    marginTop: -8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  barLine: { height: 4, width: 34, borderRadius: 2 },
  card: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 8, gap: 6, justifyContent: 'center' },
  cardLine: { height: 5, borderRadius: 3 },
  pill: { height: 16, borderRadius: 999 },
});

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
    paddingTop: Theme.spacing.lg,
  },

  section: { ...Theme.typography.h2, color: c.text },
  sectionSub: { ...Theme.typography.caption, color: c.textMuted, marginTop: Theme.spacing.sm },

  options: { flexDirection: 'row', gap: Theme.spacing.stack, marginTop: Theme.spacing.lg },
  option: {
    flex: 1,
    padding: Theme.spacing.sm,
    borderRadius: Theme.radius.lg,
    backgroundColor: c.surfaceGray,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionActive: { borderColor: c.accent },
  optionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
    paddingTop: Theme.spacing.stack,
  },
  optionLabel: { ...Theme.typography.label, color: c.textMuted, flex: 1 },
  optionLabelActive: { color: c.text },
  check: {
    width: 20,
    height: 20,
    borderRadius: Theme.radius.full,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
    padding: Theme.spacing.md,
    borderRadius: Theme.radius.lg,
    backgroundColor: c.surfaceGray,
  },
  systemTitle: { ...Theme.typography.bodySemibold, color: c.text },
  systemSub: { ...Theme.typography.small, color: c.textMuted, marginTop: 2, lineHeight: 16 },
});
