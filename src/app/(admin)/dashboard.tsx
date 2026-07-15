import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, TextInput, Modal } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { api, AdminStats } from '../../services/api';
import { RefreshCw, Users, Ticket, DollarSign, Edit2, Trash2, Plus, Save, X } from 'lucide-react-native';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { tiers, addTier, editTier, removeTier, products, addProduct, removeProduct, tickets } = useDatabaseStore();
  if (user?.role === 'viewer') return <Redirect href="/(admin)/tables" />;
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [tierModalVisible, setTierModalVisible] = useState(false);

  // Form State for Tiers (Event Stages)
  const [newTierName, setNewTierName] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  
  // State for Global Products
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductType, setNewProductType] = useState<'ticket'|'bed'|'table'>('ticket');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleAddOrEditTier = () => {
    if (newTierName.trim() !== '') {
      const endDate = newEndDate || new Date(Date.now() + 86400000).toISOString();
      
      if (editingTierId) {
        editTier(editingTierId, newTierName, endDate, priceOverrides);
      } else {
        addTier(newTierName, endDate, priceOverrides);
      }
      closeTierModal();
    }
  };

  const startEditTier = (tier: import('../../types').Tier) => {
    setEditingTierId(tier.id);
    setNewTierName(tier.name);
    setNewEndDate(tier.endDate);
    setPriceOverrides({ ...tier.priceOverrides });
    setTierModalVisible(true);
  };

  const startNewTier = () => {
    setEditingTierId(null);
    setNewTierName('');
    setNewEndDate('');
    setPriceOverrides({});
    setTierModalVisible(true);
  };

  const closeTierModal = () => {
    setTierModalVisible(false);
    setEditingTierId(null);
    setNewTierName('');
    setNewEndDate('');
    setPriceOverrides({});
  };

  const toggleOverride = (productId: string, basePrice: number) => {
    const overrides = { ...priceOverrides };
    if (overrides[productId] !== undefined) {
      delete overrides[productId];
    } else {
      overrides[productId] = basePrice;
    }
    setPriceOverrides(overrides);
  };

  const updateOverrideValue = (productId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setPriceOverrides(prev => ({ ...prev, [productId]: num }));
  };

  const handleAddProduct = () => {
    if (newProductName.trim() && newProductPrice) {
      addProduct(newProductName, newProductType, parseFloat(newProductPrice) || 0);
      setNewProductName('');
      setNewProductPrice('');
    }
  };

  const loadStats = useCallback(() => {
    setLoading(true);
    try {
      setError(null);
      const ticketsArr = Object.values(tickets) as import('../../types').Ticket[];
      
      const totalRevenue = ticketsArr.reduce((acc, t) => acc + Number(t.ticket_price || 0), 0);
      const totalCapacity = ticketsArr.reduce((acc, t) => acc + (t.total_accesos || 0), 0);
      const totalCheckIns = ticketsArr.reduce((acc, t) => acc + ((t.total_accesos - t.accesos_restantes) || 0), 0);
      const totalOrders = ticketsArr.length;

      setStats({
        totalRevenue,
        totalSold: totalCapacity, // Number of seats sold
        totalCheckIns,
        totalCapacity,
        totalOrders
      });
    } catch (err: any) {
      setError(err.message || 'Error calculando estadísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tickets]);

  useEffect(() => {
    loadStats();
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

        {/* PRODUCT CATALOG SECTION */}
        <View style={styles.mockSection}>
          <Text style={styles.title}>Catálogo de Productos Base ({products.length})</Text>
          <Text style={[styles.infoText, { marginBottom: 16 }]}>Define tus camas, mesas y boletos una sola vez. Estos precios se usarán por defecto a menos que los modifiques en una Etapa específica.</Text>
          
          <View style={styles.form}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput 
                style={[styles.input, { flex: 2, marginBottom: 0 }]} 
                placeholder="Nombre (Ej. Cama VIP)" 
                value={newProductName} 
                onChangeText={setNewProductName} 
              />
              <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                placeholder="Precio $" 
                keyboardType="numeric"
                value={newProductPrice} 
                onChangeText={setNewProductPrice} 
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', flex: 1, gap: 4 }}>
                {['ticket', 'bed', 'table'].map(t => (
                  <TouchableOpacity 
                    key={t}
                    onPress={() => setNewProductType(t as any)}
                    style={{ padding: 12, borderRadius: 8, flex: 1, alignItems: 'center', backgroundColor: newProductType === t ? '#47311f' : '#d9d1c0' }}
                  >
                    <Text style={{ color: newProductType === t ? '#fff' : '#231e1a', fontSize: 12, fontFamily: 'NunitoSans_600SemiBold' }}>
                      {t === 'ticket' ? 'Entrada' : t === 'bed' ? 'Cama' : 'Mesa'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={handleAddProduct} style={{ backgroundColor: '#686a54', width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Plus color="#fff" size={24} />
              </TouchableOpacity>
            </View>
          </View>

          {products.map(p => (
            <View key={p.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tableName}>{p.name}</Text>
                <Text style={styles.tableMeta}>{p.type.toUpperCase()}</Text>
              </View>
              <Text style={[styles.tableName, { marginRight: 16, color: '#47311f' }]}>${p.basePrice}</Text>
              <TouchableOpacity onPress={() => removeProduct(p.id)} style={[styles.deleteBtn, { backgroundColor: '#ffdbdb' }]}>
                <Trash2 color="#ff4d4d" size={20} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* TIERS MANAGEMENT SECTION */}
        <View style={styles.mockSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.title}>Etapas de Venta ({tiers.length})</Text>
            <TouchableOpacity style={{ backgroundColor: '#47311f', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }} onPress={startNewTier}>
              <Plus color="#fff" size={16} style={{ marginRight: 4 }} />
              <Text style={{ color: '#fff', fontFamily: 'NunitoSans_700Bold' }}>Nueva Etapa</Text>
            </TouchableOpacity>
          </View>

          {tiers.length === 0 ? (
            <Text style={styles.infoText}>No hay etapas creadas.</Text>
          ) : (
            tiers.map(item => (
              <View key={item.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tableName}>{item.name}</Text>
                  <Text style={styles.tableMeta}>{Object.keys(item.priceOverrides).length} precios modificados</Text>
                  <Text style={[styles.tableMeta, { marginTop: 4, color: '#47311f' }]}>Cierra: {new Date(item.endDate).toLocaleString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => startEditTier(item)} style={[styles.deleteBtn, { backgroundColor: '#686a54' }]}>
                    <Edit2 color="#f4efe9" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeTier(item.id)} style={[styles.deleteBtn, { backgroundColor: '#47311f' }]}>
                    <Trash2 color="#f4efe9" size={20} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

      </View>

      {/* TIER CREATION MODAL */}
      <Modal visible={tierModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTierId ? 'Editando Etapa' : 'Nueva Etapa de Venta'}</Text>
              <TouchableOpacity onPress={closeTierModal}>
                <X color="#231e1a" size={24} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.label}>Nombre de la Etapa *</Text>
              <TextInput style={styles.input} value={newTierName} onChangeText={setNewTierName} placeholder="Ej. Preventa 2" />

              <Text style={styles.label}>Fecha Cierre *</Text>
              <TextInput style={styles.input} value={newEndDate} onChangeText={setNewEndDate} placeholder="Ej. 2026-08-01T23:59:00Z" />

              <View style={{ backgroundColor: '#e8e3d5', padding: 16, borderRadius: 12, marginTop: 12 }}>
                <Text style={[styles.title, { fontSize: 16, marginBottom: 8 }]}>Excepciones de Precios</Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', color: '#686a54', fontSize: 13, marginBottom: 16 }}>
                  Selecciona únicamente los productos cuyo precio quieras que sea DIFERENTE en esta etapa. Los no seleccionados usarán el precio del catálogo base automáticamente.
                </Text>

                {products.length === 0 ? (
                  <Text style={{ color: '#ff4d4d', fontFamily: 'NunitoSans_600SemiBold' }}>No tienes productos en el catálogo base.</Text>
                ) : (
                  products.map(p => {
                    const isOverridden = priceOverrides[p.id] !== undefined;
                    return (
                      <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: isOverridden ? '#fff' : 'transparent', padding: 8, borderRadius: 8 }}>
                        <TouchableOpacity 
                          onPress={() => toggleOverride(p.id, p.basePrice)}
                          style={{ width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: '#686a54', backgroundColor: isOverridden ? '#686a54' : 'transparent', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}
                        >
                          {isOverridden && <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>✓</Text>}
                        </TouchableOpacity>
                        
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'NunitoSans_600SemiBold', color: '#231e1a' }}>{p.name}</Text>
                          <Text style={{ fontFamily: 'NunitoSans_400Regular', color: '#686a54', fontSize: 12 }}>Base: ${p.basePrice}</Text>
                        </View>

                        {isOverridden && (
                          <TextInput 
                            style={[styles.input, { width: 100, height: 40, marginBottom: 0 }]} 
                            placeholder="Nuevo $" 
                            keyboardType="numeric" 
                            value={priceOverrides[p.id].toString()} 
                            onChangeText={(val) => updateOverrideValue(p.id, val)} 
                          />
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddOrEditTier}>
                <Text style={styles.submitBtnText}>{editingTierId ? 'Guardar Cambios' : 'Crear Etapa'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f4efe9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    color: '#231e1a',
    fontFamily: 'NunitoSans_700Bold',
  },
  modalForm: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#686a54',
    marginBottom: 8,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  submitBtn: {
    backgroundColor: '#47311f',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#f4efe9',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
  },
});
