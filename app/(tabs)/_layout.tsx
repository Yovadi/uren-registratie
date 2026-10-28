import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabGlyph({ label, color }: { label: string; color: string }) {
  return (
    <Text style={{ color, fontSize: 13, fontWeight: '700' }} accessibilityLabel={label}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Week',
          tabBarIcon: ({ color }) => <TabGlyph label="Wk" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="entries"
        options={{
          title: 'Uren',
          tabBarIcon: ({ color }) => <TabGlyph label="Ur" color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Instellingen',
          tabBarIcon: ({ color }) => <TabGlyph label="In" color={String(color)} />,
        }}
      />
    </Tabs>
  );
}
