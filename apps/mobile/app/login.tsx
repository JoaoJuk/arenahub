import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { api, setToken, setRole, homeOf } from '@/api';
import { C } from '@/theme';

const logoImg = require('../assets/logo.png');

export default function Login() {
  const [email, setEmail] = useState('demo@arenahub.app');
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
      <Text style={s.logo}>Lig<Text style={{ color: C.green }}>go</Text></Text>
      <Text style={s.sub}>Liga a galera. Jogue junto.</Text>
      <TextInput style={s.input} placeholder="E-mail" placeholderTextColor={C.mut}
        autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Senha" placeholderTextColor={C.mut}
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
  wrap: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: 24, maxWidth: 480, width: '100%', alignSelf: 'center' },
  logoImg: { width: 130, height: 130, alignSelf: 'center', marginBottom: 16 },
  logo: { color: C.txt, fontSize: 40, fontWeight: '800', textAlign: 'center', letterSpacing: 2 },
  sub: { color: C.mut, textAlign: 'center', marginBottom: 32, marginTop: 6, fontSize: 15, fontStyle: 'italic' },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 12, color: C.txt, padding: 15, fontSize: 16, marginBottom: 12 },
  err: { color: C.danger, textAlign: 'center', marginBottom: 10 },
  cta: { backgroundColor: C.green, borderRadius: 12, padding: 16, marginTop: 6 },
  ctaTxt: { color: '#04170b', fontWeight: '800', textAlign: 'center', fontSize: 16 },
  link: { color: C.green, textAlign: 'center', marginTop: 20, fontSize: 15 },
});
