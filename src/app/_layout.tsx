import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { StatusBar } from 'expo-status-bar';
import { Animated, Text, StyleSheet } from 'react-native';
import { useFonts, NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans';
import NetInfo from '@react-native-community/netinfo';

export default function RootLayout() {
  const { user, deviceId, logout, checkSession } = useAuthStore();
  const { checkSessionValidity, syncAll, setIsOnline } = useDatabaseStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded] = useFonts({
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });

  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const [onlineAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Wait for the navigation to be mounted before routing
    setTimeout(() => {
      setIsReady(true);
      syncAll(); // Initial sync of data
    }, 100);

    // Network Listener
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      
      const { isOnline } = useDatabaseStore.getState();
      if (!isOnline && online && isReady) {
        setShowOnlineBanner(true);
        Animated.sequence([
          Animated.timing(onlineAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(3000),
          Animated.timing(onlineAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start(() => {
          setShowOnlineBanner(false);
        });
      }
      
      setIsOnline(online);
    });

    // Como Supabase Realtime requiere configuración en el panel de control de la DB
    // que actualmente está deshabilitada por defecto, implementamos un polling
    // cada 5 segundos para mantener las pantallas siempre actualizadas de forma automática.
    const interval = setInterval(() => {
      const { isOnline } = useDatabaseStore.getState();
      if (isOnline) {
        syncAll();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      unsubscribeNetInfo();
    };
  }, [syncAll, setIsOnline]);

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
      {showOnlineBanner && (
        <Animated.View style={[styles.onlineBanner, { transform: [{ translateY: onlineAnim }] }]}>
          <Text style={styles.onlineBannerText}>¡Conexión restaurada! Estás online.</Text>
        </Animated.View>
      )}
      <Slot />
    </>
  );
}

const styles = StyleSheet.create({
  onlineBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 12,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  onlineBannerText: {
    color: '#ffffff',
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 14,
  }
});
