import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { loadToken, loadRole, homeOf } from '@/api';
import { Theme } from '@/theme';
import { ThemeProvider, useColors, useThemeMode } from '@/theme-context';

function RootNavigator() {
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const c = useColors();
  const { mode } = useThemeMode();
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
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
    return <View style={{ flex: 1, backgroundColor: c.background }} />;
  }

  return (
    <>
      {/* Ícones da barra de status invertem junto com o tema, senão somem. */}
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.background },
          headerTitleStyle: { fontFamily: Theme.fonts.displaySemibold },
          headerTintColor: c.text,
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="owner" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        {/* Estas trazem o próprio cabeçalho (voltar + progresso/título dentro
            da tela), como nas telas do Stitch — o header nativo duplicaria. */}
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="arena/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="booking/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  // O provider fica acima do Stack inteiro: trocar o tema precisa repintar
  // navegação, barra de status e todas as telas de uma vez.
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
