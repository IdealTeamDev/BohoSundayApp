import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useDatabaseStore } from '../../../store/useDatabaseStore';
import { Ticket, Table } from '../../../types';

export default function DashboardScreen() {
  const { tickets, tables } = useDatabaseStore();

  const ticketsArr = Object.values(tickets) as Ticket[];
  const totalExpected = ticketsArr.reduce((acc, t) => acc + (t.total_accesos || 0), 0);
  const totalArrived = ticketsArr.reduce((acc, t) => acc + ((t.total_accesos - t.accesos_restantes) || 0), 0);
  
  const availableTables = (tables as Table[]).filter(t => t.available).length;
  const reservedTables = 0; // tables.filter(t => t.status === 'reserved').length;
  const occupiedTables = (tables as Table[]).filter(t => !t.available).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel de Control</Text>
        <Text style={styles.headerSubtitle}>Métricas de ingreso en tiempo real</Text>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Aforo Ingresado</Text>
        <Text style={styles.heroBigNumber}>{totalArrived}</Text>
        <Text style={styles.heroSubtitle}>de {totalExpected} personas esperadas</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Estado de Mesas (Oasis)</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#ff4d4d' }]}>{occupiedTables}</Text>
          <Text style={styles.statLabel}>Ocupadas (Full/Parcial)</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#eab308' }]}>{reservedTables}</Text>
          <Text style={styles.statLabel}>Vendidas (Por llegar)</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#a3c293' }]}>{availableTables}</Text>
          <Text style={styles.statLabel}>Disponibles (Vacías)</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 20,
  },
  header: { marginBottom: 24, marginTop: 16 },
  headerTitle: { color: '#f4efe9', fontSize: 28, fontFamily: 'NunitoSans_700Bold', letterSpacing: -0.5 },
  headerSubtitle: { color: '#a1a1aa', fontSize: 15, fontFamily: 'NunitoSans_600SemiBold', marginTop: 4 },
  
  heroCard: {
    backgroundColor: '#171717',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#262626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heroTitle: {
    color: '#a1a1aa',
    fontSize: 14,
    fontFamily: 'NunitoSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  heroBigNumber: {
    color: '#f4efe9',
    fontSize: 72,
    fontFamily: 'NunitoSans_700Bold',
    marginVertical: 4,
    letterSpacing: -2,
  },
  heroSubtitle: {
    color: '#c89d71',
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#f4efe9',
    fontSize: 18,
    fontFamily: 'NunitoSans_700Bold',
  },
  
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: '#171717',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  statNumber: {
    color: '#f4efe9',
    fontSize: 32,
    fontFamily: 'NunitoSans_700Bold',
    marginBottom: 4,
    letterSpacing: -1,
  },
  statLabel: {
    color: '#a1a1aa',
    fontSize: 13,
    fontFamily: 'NunitoSans_600SemiBold',
  }
});
