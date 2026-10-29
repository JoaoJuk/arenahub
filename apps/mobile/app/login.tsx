import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { api, setToken, setRole, homeOf } from '@/api';
import { Theme, inputText, type Colors } from '@/theme';
import { useColors, useStyles } from '@/theme-context';
import { Button } from '@/components/Button';

const logoImg = require('../assets/logo.png');

export default function Login() {
  const c = useColors();
  const s = useStyles(styles);
  const [email, setEmail] = useState('demo@liggo.app');
  const [password, setPassword] = useState('123456');
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState<'email' | 'pass' | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Centralizar conteúdo que não cabe faz a ScrollView cortar as duas pontas, e
  // a parte de cima fica inalcançável — não dá para rolar até ela. Então só
  // centraliza quando cabe de fato; senão alinha ao topo e deixa rolar.
  // Medir (em vez de escutar o teclado) cobre de uma vez os dois casos: aparelho
  // pequeno e teclado aberto encolhendo a janela no Android.
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const fits = viewportH === 0 || contentH === 0 || contentH <= viewportH;

  async function go() {
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api.login(email.trim(), password);
      await setToken(token);
      await setRole(user.role);
      router.replace(homeOf(user.role) as any);
    } catch (e: any) {
      // A mensagem de falha de rede já vem pronta e com o endereço de `src/api.ts`.
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.wrap}>
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          {
            paddingTop: insets.top + Theme.spacing.lg,
            paddingBottom: insets.bottom + Theme.spacing.lg,
            justifyContent: fits ? 'center' : 'flex-start',
          },
        ]}
        onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
        onContentSizeChange={(_w, h) => setContentH(h)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // No iOS empurra o conteúdo junto com o teclado sem espremer o layout,
        // que é o que o KeyboardAvoidingView fazia (e era o que cortava o card).
        automaticallyAdjustKeyboardInsets
      >
        <View style={s.card}>
          <Image source={logoImg} style={s.logo} contentFit="contain" />
          <Text style={s.wordmark}>
            Liggo<Text style={s.dot}>.</Text>
          </Text>
          <Text style={s.sub}>Entre para encontrar seu próximo jogo.</Text>

          <Text style={s.label}>E-mail</Text>
          <View style={[s.field, focused === 'email' && s.fieldFocus]}>
            <Mail color={c.textMuted} size={18} />
            <TextInput
              style={s.input}
              placeholder="seu@email.com"
              placeholderTextColor={c.textDim}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              accessibilityLabel="E-mail"
            />
          </View>

          <Text style={s.label}>Senha</Text>
          <View style={[s.field, focused === 'pass' && s.fieldFocus]}>
            <Lock color={c.textMuted} size={18} />
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={c.textDim}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('pass')}
              onBlur={() => setFocused(null)}
              accessibilityLabel="Senha"
            />
            <TouchableOpacity
              onPress={() => setShowPass((v) => !v)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={showPass ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPass
                ? <EyeOff color={c.textMuted} size={18} />
                : <Eye color={c.textMuted} size={18} />}
            </TouchableOpacity>
          </View>

          {!!error && <Text style={s.err} accessibilityRole="alert">{error}</Text>}

          <Button
            title={busy ? 'Entrando…' : 'Entrar'}
            size="lg"
            fullWidth
            loading={busy}
            onPress={go}
            iconRight={<ArrowRight />}
            style={{ marginTop: Theme.spacing.lg }}
          />

          <View style={s.footer}>
            <Text style={s.footerTxt}>Ainda não tem uma conta? </Text>
            <Link href="/register" style={s.footerLink}>Criar conta</Link>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (c: Colors) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.background },
  scroll: {
    flexGrow: 1,
    // justifyContent e o padding vertical vêm do componente: dependem da área
    // segura do aparelho e de o teclado estar aberto ou não.
    paddingHorizontal: Theme.spacing.margin,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.lg,
    ...Theme.shadow.raised,
  },
  logo: { width: 96, height: 96, alignSelf: 'center' },
  wordmark: {
    ...Theme.typography.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.6,
    color: c.text,
    textAlign: 'center',
  },
  // O ponto é o único neon da tela — o resto do wordmark é preto para não
  // brigar com o CTA (DESIGN.md §2, teto de 2 usos do acento).
  dot: { color: c.accent },
  sub: {
    ...Theme.typography.caption,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },

  label: { ...Theme.typography.captionSemibold, color: c.text, marginBottom: Theme.spacing.sm, marginTop: Theme.spacing.stack },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    height: 52,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    backgroundColor: c.surfaceGray,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fieldFocus: { borderColor: c.accent },
  input: { flex: 1, ...inputText(Theme.typography.body), color: c.text, paddingVertical: 0 },

  err: { ...Theme.typography.caption, color: c.danger, marginTop: Theme.spacing.stack },

  footer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: Theme.spacing.lg },
  footerTxt: { ...Theme.typography.caption, color: c.textMuted },
  footerLink: { ...Theme.typography.captionSemibold, color: c.primary },
});
