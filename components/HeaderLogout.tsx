import { router } from 'expo-router';

import { LogoutHeaderButton } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

/** Shared header logout — visible on every main screen. */
export function HeaderLogout() {
  const { session, logout } = useAuth();
  if (!session) return null;
  return (
    <LogoutHeaderButton
      onPress={() => {
        logout();
        router.replace('/login');
      }}
    />
  );
}
