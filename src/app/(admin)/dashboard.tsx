import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { api, AdminStats } from '../../services/api';
import { RefreshCw, Users, Ticket, DollarSign } from 'lucide-react-native';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  if (user?.role === 'viewer') return <Redirect href="/(admin)/tables" />;
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error cargando estadísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    // Auto-refresh every 15 seconds
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#231e1a" />}
    >
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Panel General</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <RefreshCw color="#231e1a" size={20} />
          </TouchableOpacity>
        </View>

        {loading && !stats ? (
          <Text style={styles.infoText}>Cargando datos en tiempo real...</Text>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : stats ? (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#47311f' }]}>
              <DollarSign color="#f4efe9" size={32} style={styles.statIcon} />
              <Text style={styles.statLabelLight}>Ingresos Totales</Text>
              <Text style={styles.statValueLight}>{formatCurrency(stats.totalRevenue)}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#686a54' }]}>
              <Ticket color="#f4efe9" size={32} style={styles.statIcon} />
              <Text style={styles.statLabelLight}>Boletas Vendidas</Text>
              <Text style={styles.statValueLight}>{stats.totalSold} / {stats.totalCapacity}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#d9d1c0' }]}>
              <Users color="#231e1a" size={32} style={styles.statIcon} />
              <Text style={styles.statLabelDark}>Check-ins (Gente que ingresó)</Text>
              <Text style={styles.statValueDark}>{stats.totalCheckIns}</Text>
            </View>
          </View>
        ) : null}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe9',
  },
  content: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    color: '#231e1a',
    fontSize: 22,
    fontFamily: 'NunitoSans_700Bold',
    textTransform: 'uppercase',
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#d9d1c0',
  },
  infoText: {
    color: '#686a54',
    fontSize: 16,
    fontFamily: 'NunitoSans_400Regular',
  },
  errorBox: {
    backgroundColor: '#ffdbdb',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4d4d',
  },
  errorText: {
    color: '#ff4d4d',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  statsGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  statCard: {
    borderRadius: 16,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  statIcon: {
    position: 'absolute',
    right: 24,
    top: 24,
    opacity: 0.2,
  },
  statLabelLight: {
    color: '#f4efe9',
    opacity: 0.8,
    fontSize: 14,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 8,
  },
  statValueLight: {
    color: '#f4efe9',
    fontSize: 32,
    fontFamily: 'NunitoSans_700Bold',
  },
  statLabelDark: {
    color: '#231e1a',
    opacity: 0.8,
    fontSize: 14,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 8,
  },
  statValueDark: {
    color: '#231e1a',
    fontSize: 32,
    fontFamily: 'NunitoSans_700Bold',
  },
});
