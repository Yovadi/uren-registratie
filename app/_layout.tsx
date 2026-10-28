import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AppDataProvider } from '@/context/AppDataContext';
import { Brand } from '@/constants/Colors';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AppDataProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Brand.header },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="registratie/new"
          options={{ presentation: 'modal', title: 'Nieuwe registratie' }}
        />
        <Stack.Screen name="analyse/klant" options={{ title: 'Klantanalyse' }} />
        <Stack.Screen name="analyse/project" options={{ title: 'Projectanalyse' }} />
        <Stack.Screen name="analyse/land" options={{ title: 'Hotel & toelage' }} />
      </Stack>
    </AppDataProvider>
  );
}
