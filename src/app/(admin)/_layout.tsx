import React, { useState } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Settings, Grid, LogOut, FileBarChart, Users, Scan, QrCode, Map } from 'lucide-react-native';
import { TouchableOpacity, useWindowDimensions } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminLayout() {
  const { logout, user } = useAuthStore();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }
  
  if (user.role === 'bouncer') {
    return <Redirect href="/(staff)/bouncer/scanner" />;
  }

  const isViewer = user?.role === 'viewer';
  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)', shadowOpacity: 0, elevation: 0 },
          headerTintColor: '#1a1614',
          tabBarLabelPosition: 'below-icon',
          tabBarStyle: { 
            backgroundColor: '#f4efe9', 
            borderTopColor: 'rgba(0,0,0,0.03)',
            paddingBottom: Math.max(insets.bottom, 15),
            paddingTop: 10,
            height: 65 + Math.max(insets.bottom, 15),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.03,
            shadowRadius: 10,
            elevation: 10,
            ...(isDesktop ? {
              maxWidth: 600,
              width: '100%',
              alignSelf: 'center',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: 'rgba(0,0,0,0.05)',
            } : {}),
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: 'NunitoSans_700Bold'
          },
          tabBarActiveTintColor: '#1a1614',
          tabBarInactiveTintColor: '#8b8378',
          headerRight: () => (
            <TouchableOpacity onPress={() => setLogoutVisible(true)} style={{ marginRight: 16 }}>
              <LogOut color="#ef4444" size={24} />
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            href: isViewer ? null : '/(admin)/dashboard',
            title: 'Ajustes de Evento',
            tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="tables"
          options={{
            title: 'Gestor de Mesas',
            tabBarIcon: ({ color }) => <Grid color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reportes',
            tabBarIcon: ({ color }) => <FileBarChart color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="staff"
          options={{
            href: isViewer ? null : '/(admin)/staff',
            title: 'Staff',
            tabBarIcon: ({ color }) => <Users color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="scanner"
          options={{
            href: isViewer ? null : '/(admin)/scanner',
            title: 'Escáner',
            tabBarIcon: ({ color }) => <Scan color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="qr-manager"
          options={{
            href: isViewer ? null : '/(admin)/qr-manager',
            title: 'Gestor QR',
            tabBarIcon: ({ color }) => <QrCode color={color} size={24} />,
          }}
        />
      </Tabs>
      <LogoutConfirmModal 
        visible={logoutVisible} 
        onCancel={() => setLogoutVisible(false)} 
        onConfirm={() => {
          setLogoutVisible(false);
          logout();
        }}
      />
    </>
  );
}
