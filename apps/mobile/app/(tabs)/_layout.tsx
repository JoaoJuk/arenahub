import { Tabs } from 'expo-router';
import { Theme } from '@/theme';
import { Search, CalendarDays, MailOpen, User, Home } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Theme.colors.background },
        headerTintColor: Theme.colors.text,
        tabBarStyle: { backgroundColor: Theme.colors.surface, borderTopColor: Theme.colors.border },
        tabBarActiveTintColor: Theme.colors.primary,
        tabBarInactiveTintColor: Theme.colors.textMuted,
        sceneStyle: { backgroundColor: Theme.colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color }) => <Home color={color} size={24} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Pesquisar', tabBarIcon: ({ color }) => <Search color={color} size={24} /> }} />
      <Tabs.Screen name="bookings" options={{ title: 'Reservas', tabBarIcon: ({ color }) => <CalendarDays color={color} size={24} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <User color={color} size={24} /> }} />
    </Tabs>
  );
}
