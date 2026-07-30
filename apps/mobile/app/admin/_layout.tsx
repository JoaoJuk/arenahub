import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { C } from '@/theme';

const icon = (e: string) => ({ color }: { color: string }) => (
  <Text style={{ fontSize: 20, color }}>{e}</Text>
);

export default function AdminLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'Visão geral', tabBarIcon: icon('📊') }} />
      <Tabs.Screen name="usuarios" options={{ title: 'Usuários', tabBarIcon: icon('👥') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icon('🛡️') }} />
    </Tabs>
  );
}
