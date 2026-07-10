import React, { useState } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Settings, Grid, LogOut, FileBarChart, Users, Scan, QrCode, Map } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminLayout() {
  const { logout, user } = useAuthStore();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  const isViewer = user?.role === 'viewer';
  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#f4efe9', borderBottomWidth: 1, borderBottomColor: '#bdb39b' },
          headerTintColor: '#47311f',
          tabBarStyle: { 
            backgroundColor: '#d9d1c0', 
            borderTopColor: '#bdb39b',
            paddingBottom: Math.max(insets.bottom, 15),
            paddingTop: 10,
            height: 65 + Math.max(insets.bottom, 15),
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: 'NunitoSans_600SemiBold'
          },
          tabBarActiveTintColor: '#47311f',
          tabBarInactiveTintColor: '#686a54',
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
