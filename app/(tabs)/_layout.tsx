import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { useTheme } from '@/components/ui';
import { Brand } from '@/constants/Colors';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';

export default function TabLayout() {
  const theme = useTheme();
  const { session } = useAuth();
  const { overurenWeken, settings } = useAppData();
  const isManager = session?.rol === 'manager' || settings.rol === 'manager';
  const myName = session?.naam ?? settings.medewerkerNaam;
  const dark = (settings.thema ?? 'light') === 'dark';

  const badge = useMemo(() => {
    if (isManager) {
      const n = overurenWeken.filter((w) => w.status === 'ingediend').length;
      return n > 0 ? n : undefined;
    }
    const n = overurenWeken.filter(
      (w) => w.medewerker === myName && w.status === 'info_gevraagd',
    ).length;
    return n > 0 ? n : undefined;
  }, [isManager, overurenWeken, myName]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: dark ? theme.tint : Brand.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          height: Platform.OS === 'web' ? 64 : undefined,
          paddingTop: Platform.OS === 'web' ? 6 : undefined,
          paddingBottom: Platform.OS === 'web' ? 8 : undefined,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="registraties"
        options={{
          title: 'Uren',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="overuren"
        options={{
          title: 'Overuren',
          tabBarBadge: badge,
          tabBarBadgeStyle: {
            backgroundColor: Brand.accent,
            color: '#fff',
            fontSize: 11,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="reizen"
        options={{
          title: 'Reizen',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="airplane-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="meer"
        options={{
          title: 'Meer',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
