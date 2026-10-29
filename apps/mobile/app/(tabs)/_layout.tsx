import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Search, CalendarDays, User, Home } from 'lucide-react-native';
import { Theme, type Colors } from '@/theme';
import { useColors, useStyles } from '@/theme-context';

const ICONS: Record<string, any> = {
  index: Home,
  search: Search,
  bookings: CalendarDays,
  profile: User,
};

const TITLES: Record<string, string> = {
  index: 'Início',
  search: 'Pesquisar',
  bookings: 'Reservas',
  profile: 'Perfil',
};

/**
 * Barra de abas do Liggo Kinetic. A barra padrão do react-navigation não desenha
 * a pílula neon em volta do item ativo (ícone + rótulo juntos), então ela é
 * substituída por completo aqui.
 */
function LiggoTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const s = useStyles(styles);

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom, height: 72 + insets.bottom }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const Icon = ICONS[route.name] ?? Home;
        const label = TITLES[route.name] ?? route.name;
        const color = focused ? c.onAccent : c.textMuted;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={[s.item, focused && s.itemActive]}
          >
            <Icon color={color} size={24} strokeWidth={focused ? 2.4 : 2} />
            <Text style={[s.label, { color }, focused && s.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const c = useColors();

  return (
    <Tabs
      tabBar={(props) => <LiggoTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="search" options={{ title: 'Pesquisar' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Reservas' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

const styles = (c: Colors) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Theme.spacing.gutter,
    backgroundColor: c.surface,
    borderTopLeftRadius: Theme.radius.md,
    borderTopRightRadius: Theme.radius.md,
    // No escuro a sombra preta some contra o fundo preto; a linha de topo é o
    // que separa a barra do conteúdo.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    ...Theme.shadow.up,
  },
  item: {
    // 48px de altura mínima em qualquer estado — alvo de toque (DESIGN.md §8).
    minHeight: 48,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.full,
  },
  itemActive: {
    backgroundColor: c.accent,
    ...(Platform.OS === 'ios' ? Theme.shadow.glow : null),
  },
  label: { ...Theme.typography.small, fontSize: 11 },
  labelActive: { fontFamily: Theme.fonts.bodyBold },
});
