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
  const [newEndDate, setNewEndDate] = useState('');
  const [newPrices, setNewPrices] = useState<import('../../types').ProductPrice[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // State for adding a new product directly in the form
  const [newProductName, setNewProductName] = useState('');
  const [newProductType, setNewProductType] = useState<'ticket'|'bed'|'table'>('ticket');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleAddOrEdit = () => {
    if (newTierName.trim() !== '') {
      const endDate = newEndDate || new Date(Date.now() + 86400000).toISOString();
      
      if (editingId) {
        editTier(editingId, newTierName, endDate, newPrices);
        setEditingId(null);
      } else {
        addTier(newTierName, endDate, newPrices);
      }
      setNewTierName('');
      setNewEndDate('');
      setNewPrices([]);
    }
  };

  const startEdit = (tier: import('../../types').Tier) => {
    setEditingId(tier.id);
    setNewTierName(tier.name);
    setNewEndDate(tier.endDate);
    // clone to avoid direct mutation
    setNewPrices(JSON.parse(JSON.stringify(tier.prices)));
  };

  const handleStartNewTier = () => {
    setEditingId(null);
    setNewTierName('');
    setNewEndDate('');
    if (tiers.length > 0) {
      // Auto-fill from last tier
      const lastTier = tiers[tiers.length - 1];
      setNewPrices(JSON.parse(JSON.stringify(lastTier.prices)));
    } else {
      setNewPrices([]);
    }
  };

  const addNewProduct = () => {
    if (!newProductName.trim()) return;
    const id = newProductType.substring(0, 1) + '_' + Date.now();
    setNewPrices([...newPrices, { id, name: newProductName, type: newProductType, price: 0 }]);
    setNewProductName('');
  };

  const updateProductPrice = (id: string, priceStr: string) => {
    const val = parseFloat(priceStr) || 0;
    setNewPrices(newPrices.map(p => p.id === id ? { ...p, price: val } : p));
  };
  
  const removeProduct = (id: string) => {
    setNewPrices(newPrices.filter(p => p.id !== id));
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.title}>{editingId ? 'Editando Etapa' : 'Crear Etapa de Venta (Tier)'}</Text>
            {!editingId && <TouchableOpacity onPress={handleStartNewTier}><Text style={{ color: '#47311f', fontFamily: 'NunitoSans_700Bold' }}>Auto-rellenar</Text></TouchableOpacity>}
          </View>
          
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
            
            <View style={{ backgroundColor: '#e8e3d5', padding: 12, borderRadius: 8 }}>
              <Text style={[styles.title, { fontSize: 16, marginBottom: 8 }]}>Catálogo de Precios</Text>
              
              {newPrices.map(p => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'NunitoSans_600SemiBold', color: '#231e1a' }}>{p.name}</Text>
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', color: '#686a54', fontSize: 12 }}>{p.type.toUpperCase()}</Text>
                  </View>
                  <TextInput 
                    style={[styles.input, { flex: 1, height: 40, marginBottom: 0 }]} 
                    placeholder="Precio" 
                    keyboardType="numeric" 
                    value={p.price.toString()} 
                    onChangeText={(val) => updateProductPrice(p.id, val)} 
                  />
                  <TouchableOpacity onPress={() => removeProduct(p.id)}>
                    <Trash2 color="#ef4444" size={20} />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 }}>
                <TextInput 
                  style={[styles.input, { flex: 2, height: 40, marginBottom: 0 }]} 
                  placeholder="Nuevo Producto..." 
                  value={newProductName} 
                  onChangeText={setNewProductName} 
                />
                <View style={{ flexDirection: 'row', flex: 1, gap: 4 }}>
                  {['ticket', 'bed', 'table'].map(t => (
                    <TouchableOpacity 
                      key={t}
                      onPress={() => setNewProductType(t as any)}
                      style={{ padding: 4, borderRadius: 4, backgroundColor: newProductType === t ? '#47311f' : '#d9d1c0' }}
                    >
                      <Text style={{ color: newProductType === t ? '#fff' : '#231e1a', fontSize: 10 }}>{t.substring(0,3)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity onPress={addNewProduct} style={{ backgroundColor: '#686a54', padding: 8, borderRadius: 8 }}>
                  <Plus color="#fff" size={16} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[styles.addBtn, { width: '100%', marginTop: 8 }]} onPress={handleAddOrEdit}>
              {editingId ? <Text style={{ color: '#fff', fontFamily: 'NunitoSans_700Bold' }}>Guardar Cambios</Text> : <Text style={{ color: '#fff', fontFamily: 'NunitoSans_700Bold' }}>Crear Etapa</Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Etapas Existentes ({tiers.length})</Text>

          {tiers.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tableName}>{item.name}</Text>
                <Text style={styles.tableMeta}>{item.prices.length} productos configurados</Text>
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
