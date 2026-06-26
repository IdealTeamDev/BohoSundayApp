import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { StatusBar } from 'expo-status-bar';
import { useFonts, NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans';

export default function RootLayout() {
  const { user, deviceId, logout, checkSession } = useAuthStore();
  const { checkSessionValidity } = useDatabaseStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });

  useEffect(() => {
    // Wait for the navigation to be mounted before routing
    setTimeout(() => {
      setIsReady(true);
    }, 100);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === '(admin)';
    
    // Validamos caducidad
    const isSessionActive = checkSession();
    
    // Validamos Dispositivo Único
    const isDeviceValid = user && deviceId ? checkSessionValidity(user.id, deviceId) : true;

    if (!user || !isSessionActive || !isDeviceValid) {
      if (user && !isDeviceValid) {
        logout(); // Forzar cierre si no es válido
      }
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (user) {
      if (inAuthGroup) {
        if (user.role === 'bouncer') {
          router.replace('/(staff)/bouncer/scanner');
        } else if (user.role === 'waiter') {
          router.replace('/(staff)/waiter/map');
        } else if (user.role === 'viewer') {
          router.replace('/(admin)/tables');
        } else if (user.role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else {
          // fallback
          router.replace('/(auth)/login');
        }
      }
    }
  }, [user, segments, isReady]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}
