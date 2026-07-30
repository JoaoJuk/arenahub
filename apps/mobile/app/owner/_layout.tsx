import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { C } from '@/theme';

const icon = (e: string) => ({ color }: { color: string }) => (
  <Text style={{ fontSize: 20, color }}>{e}</Text>
);

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.txt,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line },
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.mut,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="desempenho" options={{ title: 'Desempenho', tabBarIcon: icon('📈') }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: icon('🗓️') }} />
      <Tabs.Screen name="quadras" options={{ title: 'Quadras', tabBarIcon: icon('🏟️') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
