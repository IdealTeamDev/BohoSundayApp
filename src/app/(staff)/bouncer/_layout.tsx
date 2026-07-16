import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Camera, List, BarChart3, LogOut, Plane, Map } from 'lucide-react-native';
import { TouchableOpacity, View, Text } from 'react-native';
import { useAuthStore } from '../../../store/useAuthStore';
import { useDatabaseStore } from '../../../store/useDatabaseStore';
import LogoutConfirmModal from '../../../components/LogoutConfirmModal';

export default function BouncerLayout() {
  const { logout } = useAuthStore();
  const { offlineQueue } = useDatabaseStore();
  const [logoutVisible, setLogoutVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.03)', shadowOpacity: 0, elevation: 0 },
          headerTintColor: '#1a1614',
          tabBarStyle: { 
            backgroundColor: '#f4efe9', 
            borderTopColor: 'rgba(0,0,0,0.03)',
            paddingBottom: 15,
            paddingTop: 10,
            height: 80,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.03,
            shadowRadius: 10,
            elevation: 10,
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
          name="scanner"
          options={{
            title: 'Lector de QR',
            headerShown: false,
            tabBarIcon: ({ color }) => <Camera color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="attendees"
          options={{
            title: 'Asistentes',
            tabBarIcon: ({ color }) => <List color={color} size={24} />,
            headerLeft: () => (
              offlineQueue.length > 0 ? (
                <View style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6 }}>
                    <Text style={{ color: '#f4efe9', fontSize: 10, fontFamily: 'NunitoSans_600SemiBold' }}>{offlineQueue.length} ptes</Text>
                  </View>
                </View>
              ) : null
            ),
            headerRight: () => (
              <TouchableOpacity onPress={() => setLogoutVisible(true)} style={{ marginRight: 16 }}>
                <LogOut color="#ef4444" size={20} />
              </TouchableOpacity>
            ),
          }}
        />
        <Tabs.Screen name="dashboard" options={{ href: null }} />
        <Tabs.Screen name="map" options={{ href: null }} />
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
