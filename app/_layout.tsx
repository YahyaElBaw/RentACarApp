import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import '../global.css';

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        useAuthStore.getState().touchSession();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const inLogin = segments[0] === 'login';
    if (!isAuthenticated && !inLogin) {
      router.replace('/login');
    }
  }, [isInitialized, isAuthenticated, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="client/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="client/[id]" />
      <Stack.Screen name="fleet-tracking" />
    </Stack>
  );
}
