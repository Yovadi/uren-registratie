import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import { Brand } from '@/constants/Colors';

/** Simple online/offline indicator (web + RN where NetInfo isn't required). */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const sync = () => setOnline(navigator.onLine !== false);
    sync();
    if (typeof window === 'undefined') return;
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (online) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Offline — wijzigingen blijven lokaal tot je weer verbinding hebt.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Brand.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
});
