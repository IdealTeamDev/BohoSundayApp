import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../../store/useAuthStore';
import { useDatabaseStore } from '../../../store/useDatabaseStore';
import { LogOut, Map } from 'lucide-react-native';
import LogoutConfirmModal from '../../../components/LogoutConfirmModal';

export default function WaiterMapScreen() {
  const { logout, user } = useAuthStore();
  const { tables } = useDatabaseStore();
  const [logoutVisible, setLogoutVisible] = useState(false);

  // The map will automatically re-render when the Zustand store 'tables' array changes
  // which will happen instantly when a Bouncer scans a ticket using 'processScan'.

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'occupied': return '#47311f'; // Active / Occupied
      case 'reserved': return '#686a54'; // Reserved but not arrived
      case 'available': return '#f4efe9'; // Empty
      default: return '#d9d1c0';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.name}</Text>
          <Text style={styles.zoneTitle}>ZONA OASIS</Text>
        </View>
        <TouchableOpacity onPress={() => setLogoutVisible(true)} style={styles.logoutBtn}>
          <LogOut color="#f4efe9" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.mapContainer}>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#47311f' }]} />
            <Text style={styles.legendText}>En sitio</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#686a54' }]} />
            <Text style={styles.legendText}>Por llegar</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f4efe9', borderWidth: 1, borderColor: '#bdb39b' }]} />
            <Text style={styles.legendText}>Libre</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {tables.map(table => (
            <TouchableOpacity 
              key={table.id} 
              style={[
                styles.tableBox, 
                { 
                  backgroundColor: getStatusColor(table.status),
                  borderColor: table.status === 'available' ? '#bdb39b' : 'transparent',
                  borderWidth: table.status === 'available' ? 1 : 0
                }
              ]}
            >
              <Text style={[styles.tableName, table.status === 'available' && { color: '#686a54' }]}>{table.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <LogoutConfirmModal 
        visible={logoutVisible} 
        onCancel={() => setLogoutVisible(false)} 
        onConfirm={() => {
          setLogoutVisible(false);
          logout();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#bdb39b',
  },
  greeting: {
    color: '#686a54',
    fontSize: 14,
  },
  zoneTitle: {
    color: '#231e1a',
    fontSize: 24,
    fontFamily: 'NunitoSans_600SemiBold',
    letterSpacing: 2,
    marginTop: 4,
  },
  logoutBtn: {
    backgroundColor: '#686a54',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bdb39b',
  },
  mapContainer: {
    padding: 24,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#d9d1c0',
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#bdb39b',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    color: '#231e1a',
    fontSize: 12,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  tableBox: {
    width: '45%',
    aspectRatio: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  tableName: {
    color: '#f4efe9',
    fontSize: 18,
    fontFamily: 'NunitoSans_600SemiBold',
  }
});
