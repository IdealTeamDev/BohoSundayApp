import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Settings, Grid, LogOut, FileBarChart, Users } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import LogoutConfirmModal from '../../components/LogoutConfirmModal';

export default function AdminLayout() {
  const { logout } = useAuthStore();
  const [logoutVisible, setLogoutVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#f4efe9', borderBottomWidth: 1, borderBottomColor: '#bdb39b' },
          headerTintColor: '#47311f',
          tabBarStyle: { 
            backgroundColor: '#d9d1c0', 
            borderTopColor: '#bdb39b',
            paddingBottom: 15,
            paddingTop: 10,
            height: 80,
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
            title: 'Staff',
            tabBarIcon: ({ color }) => <Users color={color} size={24} />,
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
