import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { Brand } from '@/constants/Colors';

/** Entry: login or tabs depending on session. */
export default function Index() {
  const { ready, session } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Brand.primary} size="large" />
      </View>
    );
  }
  if (!session) return <Redirect href="/login" />;
  return <Redirect href="/(tabs)" />;
}
