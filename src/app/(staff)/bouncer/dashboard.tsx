import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useDatabaseStore } from '../../../store/useDatabaseStore';
import { Ticket, Table } from '../../../types';

export default function DashboardScreen() {
  const { tickets, tables } = useDatabaseStore();

  const totalCapacity = (Object.values(tickets) as Ticket[]).reduce((acc, t) => acc + t.capacity, 0);
  const totalArrived = (Object.values(tickets) as Ticket[]).reduce((acc, t) => acc + t.used, 0);
  
  const tablesOccupied = (tables as Table[]).filter(t => t.status === 'occupied').length;
  const tablesReserved = (tables as Table[]).filter(t => t.status === 'reserved').length;
  const tablesAvailable = (tables as Table[]).filter(t => t.status === 'available').length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Progreso del Evento</Text>
        <Text style={styles.heroBigNumber}>{totalArrived} / {totalCapacity}</Text>
        <Text style={styles.heroSubtitle}>Personas Ingresadas</Text>
      </View>

      <Text style={styles.sectionTitle}>Estado de Mesas (Oasis)</Text>
      <View style={styles.grid}>
        <View style={[styles.statBox, { borderColor: '#3b82f6' }]}>
          <Text style={styles.statNumber}>{tablesOccupied}</Text>
          <Text style={styles.statLabel}>Ocupadas (Full/Parcial)</Text>
        </View>
        <View style={[styles.statBox, { borderColor: '#eab308' }]}>
          <Text style={styles.statNumber}>{tablesReserved}</Text>
          <Text style={styles.statLabel}>Vendidas (Por llegar)</Text>
        </View>
        <View style={[styles.statBox, { borderColor: '#52525b' }]}>
          <Text style={styles.statNumber}>{tablesAvailable}</Text>
          <Text style={styles.statLabel}>Disponibles (Vacías)</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
    padding: 24,
  },
  heroCard: {
    backgroundColor: '#18181b',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  heroTitle: {
    color: '#a1a1aa',
    fontSize: 14,
    fontFamily: 'NunitoSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  heroBigNumber: {
    color: '#fff',
    fontSize: 56,
    fontFamily: 'NunitoSans_600SemiBold',
    marginVertical: 8,
  },
  heroSubtitle: {
    color: '#eab308',
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  statBox: {
    width: '47%',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  statNumber: {
    color: '#fff',
    fontSize: 32,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#a1a1aa',
    fontSize: 12,
  }
});
