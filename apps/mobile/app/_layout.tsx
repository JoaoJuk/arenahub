import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { loadToken, loadRole, homeOf } from '@/api';
import { Theme } from '@/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });

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

  if (!fontsLoaded) {
    // Sem tela de loading com texto aqui de propósito — evita o flash de texto
    // sem a fonte customizada aplicada antes dela terminar de carregar.
    return <View style={{ flex: 1, backgroundColor: Theme.colors.background }} />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTitleStyle: { fontFamily: Theme.fonts.displaySemibold },
          headerTintColor: Theme.colors.text,
          contentStyle: { backgroundColor: Theme.colors.background },
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
