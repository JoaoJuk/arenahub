import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { loadToken, loadRole, homeOf } from '@/api';
import { C } from '@/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadToken().then(() => setReady(true));
  }, []);

  // Relê o token a cada mudança de tela (o estado antigo ficava "congelado"
  // no valor da abertura do app e devolvia o usuário pro login após entrar).
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const [t, r] = await Promise.all([loadToken(), loadRole()]);
      const first = segments[0] as string | undefined;
      const inAuth = first === 'login' || first === 'register';
      if (!t && !inAuth) { router.replace('/login'); return; }
      // Cada papel abre na sua área (dono → /owner, admin → /admin)
      if (t && !inAuth) {
        if (r === 'owner' && first === '(tabs)') router.replace('/owner' as any);
        if (r === 'admin' && first === '(tabs)') router.replace('/admin' as any);
      }
    })();
  }, [ready, segments]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.txt,
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="owner" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Criar conta' }} />
        <Stack.Screen name="arena/[id]" options={{ title: 'Arena' }} />
        <Stack.Screen name="booking/[id]" options={{ title: 'Reserva' }} />
      </Stack>
    </>
  );
}
