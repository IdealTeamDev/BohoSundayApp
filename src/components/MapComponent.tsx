import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useDatabaseStore } from '../store/useDatabaseStore';

export default function MapComponent() {
  const { tables } = useDatabaseStore();

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'occupied': return '#47311f'; // Active / Occupied
      case 'reserved': return '#686a54'; // Reserved but not arrived
      case 'available': return '#f4efe9'; // Empty
      default: return '#d9d1c0';
    }
  };

  return (
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
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    padding: 24,
    paddingBottom: 100,
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
