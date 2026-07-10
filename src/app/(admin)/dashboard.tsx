import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, TextInput } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { api, AdminStats } from '../../services/api';
import { RefreshCw, Users, Ticket, DollarSign, Edit2, Trash2, Plus, Save } from 'lucide-react-native';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { tiers, addTier, editTier, removeTier } = useDatabaseStore();
  if (user?.role === 'viewer') return <Redirect href="/(admin)/tables" />;
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State for Tiers (Event Stages)
  const [newTierName, setNewTierName] = useState('');
  const [newEndDate, setNewEndDate] = useState(''); // e.g. YYYY-MM-DD
  const [newPriceEarly, setNewPriceEarly] = useState('');
  const [newPriceGeneral, setNewPriceGeneral] = useState('');
  const [newPriceBed, setNewPriceBed] = useState('');
  const [newPriceTable, setNewPriceTable] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleAddOrEdit = () => {
    if (newTierName.trim() !== '') {
      const endDate = newEndDate || new Date(Date.now() + 86400000).toISOString();
      const pE = parseFloat(newPriceEarly) || 0;
      const pG = parseFloat(newPriceGeneral) || 0;
      const pB = parseFloat(newPriceBed) || 0;
      const pT = parseFloat(newPriceTable) || 0;

      if (editingId) {
        editTier(editingId, newTierName, endDate, pE, pG, pB, pT);
        setEditingId(null);
      } else {
        addTier(newTierName, endDate, pE, pG, pB, pT);
      }
      setNewTierName('');
      setNewEndDate('');
      setNewPriceEarly('');
      setNewPriceGeneral('');
      setNewPriceBed('');
      setNewPriceTable('');
    }
  };

  const startEdit = (tier: any) => {
    setEditingId(tier.id);
    setNewTierName(tier.name);
    setNewEndDate(tier.endDate);
    setNewPriceEarly(tier.priceEarly.toString());
    setNewPriceGeneral(tier.priceGeneral.toString());
    setNewPriceBed(tier.priceBed.toString());
    setNewPriceTable(tier.priceTable.toString());
  };

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
      ref={scrollViewRef}
      style={styles.container} 
      keyboardShouldPersistTaps="handled"
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

        {/* TIERS MANAGEMENT SECTION */}
        <View style={[styles.mockSection, { borderTopWidth: 0 }]}>
          <Text style={styles.title}>{editingId ? 'Editando Etapa' : 'Crear Etapa de Venta (Tier)'}</Text>
          
          <View style={styles.form}>
            <TextInput 
              style={styles.input} 
              placeholder="Nombre de la Etapa (Ej. Preventa 1)" 
              placeholderTextColor="#bdb39b" 
              value={newTierName} 
              onChangeText={setNewTierName} 
            />
            <TextInput 
              style={styles.input} 
              placeholder="Fecha Cierre (Ej. 2026-07-20T23:59:00Z)" 
              placeholderTextColor="#bdb39b" 
              value={newEndDate} 
              onChangeText={setNewEndDate} 
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Early $" placeholderTextColor="#bdb39b" keyboardType="numeric" value={newPriceEarly} onChangeText={setNewPriceEarly} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="General $" placeholderTextColor="#bdb39b" keyboardType="numeric" value={newPriceGeneral} onChangeText={setNewPriceGeneral} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Camas VIP $" placeholderTextColor="#bdb39b" keyboardType="numeric" value={newPriceBed} onChangeText={setNewPriceBed} />
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Mesas $" placeholderTextColor="#bdb39b" keyboardType="numeric" value={newPriceTable} onChangeText={setNewPriceTable} />
              
              <TouchableOpacity style={[styles.addBtn, editingId && { backgroundColor: '#47311f' }]} onPress={handleAddOrEdit}>
                {editingId ? <Save color="#f4efe9" size={24} /> : <Plus color="#f4efe9" size={24} />}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.title}>Etapas Existentes ({tiers.length})</Text>

          {tiers.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tableName}>{item.name}</Text>
                <Text style={styles.tableMeta}>Early: ${item.priceEarly} | General: ${item.priceGeneral}</Text>
                <Text style={styles.tableMeta}>Cama: ${item.priceBed} | Mesa: ${item.priceTable}</Text>
                <Text style={[styles.tableMeta, { marginTop: 4, color: '#47311f' }]}>Cierra: {new Date(item.endDate).toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => startEdit(item)} style={[styles.deleteBtn, { backgroundColor: '#686a54' }]}>
                  <Edit2 color="#f4efe9" size={20} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeTier(item.id)} style={[styles.deleteBtn, { backgroundColor: '#47311f' }]}>
                  <Trash2 color="#f4efe9" size={20} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

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
  form: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#d9d1c0',
    borderWidth: 1,
    borderColor: '#bdb39b',
    borderRadius: 8,
    color: '#231e1a',
    paddingHorizontal: 8,
    height: 50,
    fontFamily: 'NunitoSans_400Regular',
  },
  addBtn: {
    backgroundColor: '#686a54',
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#bdb39b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableName: {
    color: '#231e1a',
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 4,
  },
  tableMeta: {
    color: '#686a54',
    fontSize: 12,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
  },
  mockSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: '#bdb39b',
  },
});
