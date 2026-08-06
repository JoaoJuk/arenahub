import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { api, setToken, setRole, homeOf } from '@/api';
import { Theme } from '@/theme';

const logoImg = require('../assets/logo.png');

export default function Login() {
  const [email, setEmail] = useState('demo@liggo.app');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function go() {
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api.login(email.trim(), password);
      await setToken(token);
      await setRole(user.role);
      router.replace(homeOf(user.role) as any);
    } catch (e: any) {
      setError(e.message === 'Failed to fetch'
        ? 'Não conectou na API — o backend está rodando em http://localhost:3333?'
        : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.wrap}>
      <Image source={logoImg} style={s.logoImg} resizeMode="contain" />
      <Text style={s.logo}>Lig<Text style={{ color: Theme.colors.primary }}>go</Text></Text>
      <Text style={s.sub}>Liga a galera. Jogue junto.</Text>
      <TextInput style={s.input} placeholder="E-mail" placeholderTextColor={Theme.colors.textMuted}
        autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Senha" placeholderTextColor={Theme.colors.textMuted}
        secureTextEntry value={password} onChangeText={setPassword} />
      {!!error && <Text style={s.err}>{error}</Text>}
      <TouchableOpacity style={s.cta} onPress={go} disabled={busy}>
        <Text style={s.ctaTxt}>{busy ? 'Entrando…' : 'Entrar'}</Text>
      </TouchableOpacity>
      <Link href="/register" style={s.link}>Criar conta grátis →</Link>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Theme.colors.background, justifyContent: 'center', padding: 24, maxWidth: 480, width: '100%', alignSelf: 'center' },
  logoImg: { width: 130, height: 130, alignSelf: 'center', marginBottom: 16 },
  logo: { ...Theme.typography.h1, color: Theme.colors.text, fontSize: 40, textAlign: 'center', letterSpacing: 2 },
  sub: { color: Theme.colors.textMuted, textAlign: 'center', marginBottom: 32, marginTop: 6, fontSize: 15, fontStyle: 'italic' },
  input: { backgroundColor: Theme.colors.surface, borderColor: Theme.colors.border, borderWidth: 1, borderRadius: Theme.radius.md, color: Theme.colors.text, padding: 15, fontSize: 16, marginBottom: 12 },
  err: { color: Theme.colors.danger, textAlign: 'center', marginBottom: 10 },
  cta: { backgroundColor: Theme.colors.primary, borderRadius: Theme.radius.md, padding: 16, marginTop: 6 },
  ctaTxt: { color: Theme.colors.text, fontWeight: '800', textAlign: 'center', fontSize: 16 },
  link: { color: Theme.colors.primaryHover, textAlign: 'center', marginTop: 20, fontSize: 15 },
});
