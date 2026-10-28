import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { Brand } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.primary,
        tabBarInactiveTintColor: '#8A9AAB',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: Brand.border,
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
        name="tvt"
        options={{
          title: 'TVT',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={String(color)} />
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
