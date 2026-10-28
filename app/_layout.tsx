import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { OfflineBanner } from '@/components/OfflineBanner';
import { AppDataProvider } from '@/context/AppDataContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Brand } from '@/constants/Colors';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: 'index',
};

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const onLogin = segments[0] === 'login';
    if (!session && !onLogin) router.replace('/login');
    if (session && onLogin) router.replace('/(tabs)');
  }, [ready, session, segments, router]);

  return <>{children}</>;
}

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
    <AuthProvider>
      <AppDataProvider>
        <ThemeProvider>
          <AuthGate>
            <View style={{ flex: 1 }}>
              <OfflineBanner />
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: Brand.header },
                  headerTintColor: '#fff',
                  headerTitleStyle: { fontWeight: '700' },
                }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="registratie/new"
                  options={{ presentation: 'modal', title: 'Week invoeren' }}
                />
                <Stack.Screen name="analyse/klant" options={{ title: 'Klantanalyse' }} />
                <Stack.Screen name="analyse/project" options={{ title: 'Projectanalyse' }} />
                <Stack.Screen name="analyse/land" options={{ title: 'Hotel & toelage' }} />
              </Stack>
            </View>
          </AuthGate>
        </ThemeProvider>
      </AppDataProvider>
    </AuthProvider>
  );
}
