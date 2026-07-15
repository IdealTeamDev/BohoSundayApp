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
        totalSold: totalOrders, // Number of reservations (17) instead of 117
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
          <View>
            <Text style={styles.title}>Panel General</Text>
            <Text style={styles.subtitle}>Gestión de productos y etapas</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <RefreshCw color="#1a1614" size={20} />
          </TouchableOpacity>
        </View>

        {loading && !stats ? (
          <Text style={styles.infoText}>Cargando datos en tiempo real...</Text>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : stats ? (
          <View style={styles.kpiContainer}>
            <View style={[styles.kpiCardPrimary]}>
              <View style={styles.kpiHeader}>
                <Text style={[styles.kpiTitle, { color: 'rgba(255,255,255,0.8)' }]}>Ingresos Totales</Text>
                <View style={styles.iconCircleLight}>
                  <DollarSign color="#fff" size={16} />
                </View>
              </View>
              <Text style={[styles.kpiValue, { color: '#fff' }]}>{formatCurrency(stats.totalRevenue)}</Text>
            </View>

            <View style={styles.kpiRow}>
              <View style={styles.kpiCardSmall}>
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiTitle}>Reservas</Text>
                  <Ticket color="#a39a85" size={16} />
                </View>
                <Text style={styles.kpiValueSmall}>{stats.totalSold}</Text>
              </View>

              <View style={styles.kpiCardSmall}>
                <View style={styles.kpiHeader}>
                  <Text style={styles.kpiTitle}>Check-ins</Text>
                  <Users color="#a39a85" size={16} />
                </View>
                <Text style={styles.kpiValueSmall}>{stats.totalCheckIns}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* PRODUCT CATALOG SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Catálogo de Productos Base ({products.length})</Text>
          <Text style={styles.sectionSubtitle}>Define precios predeterminados para el evento.</Text>
        </View>
        
        <View style={styles.formCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TextInput 
              style={[styles.input, { flex: 2 }]} 
              placeholder="Nombre (Ej. Cama VIP)" 
              value={newProductName} 
              onChangeText={setNewProductName} 
            />
            <TextInput 
              style={[styles.input, { flex: 1 }]} 
              placeholder="Precio $" 
              keyboardType="numeric"
              value={newProductPrice} 
              onChangeText={setNewProductPrice} 
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 12 }}>
            <View style={{ flexDirection: 'row', flex: 1, gap: 8 }}>
              {['ticket', 'bed', 'table'].map(t => (
                <TouchableOpacity 
                  key={t}
                  onPress={() => setNewProductType(t as any)}
                  style={[styles.typeSelectBtn, newProductType === t && styles.typeSelectBtnActive]}
                >
                  <Text style={[styles.typeSelectBtnText, newProductType === t && styles.typeSelectBtnTextActive]}>
                    {t === 'ticket' ? 'Entrada' : t === 'bed' ? 'Cama' : 'Mesa'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={handleAddProduct} style={styles.addBtnSmall}>
              <Plus color="#fff" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listContainer}>
          {products.map((p, idx) => (
            <View key={p.id} style={[styles.listItem, idx === products.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listItemName}>{p.name}</Text>
                <Text style={styles.listItemMeta}>{p.type.toUpperCase()}</Text>
              </View>
              <Text style={styles.listItemValue}>${p.basePrice}</Text>
              <TouchableOpacity onPress={() => removeProduct(p.id)} style={styles.deleteBtnIcon}>
                <Trash2 color="#ff4d4d" size={20} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* TIERS MANAGEMENT SECTION */}
        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={styles.sectionTitle}>Etapas de Venta ({tiers.length})</Text>
            <Text style={styles.sectionSubtitle}>Gestiona fechas y excepciones de precios.</Text>
          </View>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={startNewTier}>
            <Plus color="#fff" size={16} style={{ marginRight: 4 }} />
            <Text style={styles.primaryActionBtnText}>Nueva</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          {tiers.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={styles.infoText}>No hay etapas creadas.</Text>
            </View>
          ) : (
            tiers.map((item, idx) => (
              <View key={item.id} style={[styles.listItem, idx === tiers.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listItemName}>{item.name}</Text>
                  <Text style={styles.listItemMeta}>{Object.keys(item.priceOverrides).length} precios modificados</Text>
                  <Text style={[styles.listItemMeta, { marginTop: 4, color: '#1a1614', fontFamily: 'NunitoSans_700Bold' }]}>Cierra: {new Date(item.endDate).toLocaleString()}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => startEditTier(item)} style={styles.editBtnIcon}>
                    <Edit2 color="#1a1614" size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeTier(item.id)} style={styles.deleteBtnIcon}>
                    <Trash2 color="#ff4d4d" size={20} />
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
    backgroundColor: '#f8f5f1',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    color: '#1a1614',
    fontSize: 28,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#8b8378',
    fontSize: 15,
    fontFamily: 'NunitoSans_600SemiBold',
    marginTop: 4,
  },
  refreshBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    color: '#8b8378',
    fontSize: 15,
    fontFamily: 'NunitoSans_400Regular',
  },
  errorBox: {
    backgroundColor: '#fff0f0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffd6d6',
    marginBottom: 24,
  },
  errorText: {
    color: '#ff4d4d',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  kpiContainer: {
    gap: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCardPrimary: {
    backgroundColor: '#1a1614',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  kpiCardSmall: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiTitle: {
    color: '#8b8378',
    fontSize: 12,
    fontFamily: 'NunitoSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  iconCircleLight: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 36,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: -1,
  },
  kpiValueSmall: {
    color: '#1a1614',
    fontSize: 24,
    fontFamily: 'NunitoSans_800ExtraBold',
  },
  sectionHeader: {
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#1a1614',
    fontSize: 18,
    fontFamily: 'NunitoSans_700Bold',
  },
  sectionSubtitle: {
    color: '#8b8378',
    fontSize: 13,
    fontFamily: 'NunitoSans_400Regular',
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f8f5f1',
    borderWidth: 1,
    borderColor: '#f0ebe1',
    borderRadius: 12,
    color: '#1a1614',
    paddingHorizontal: 16,
    height: 48,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
  },
  typeSelectBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f8f5f1',
    borderWidth: 1,
    borderColor: '#f0ebe1',
  },
  typeSelectBtnActive: {
    backgroundColor: '#1a1614',
    borderColor: '#1a1614',
  },
  typeSelectBtnText: {
    color: '#8b8378',
    fontSize: 13,
    fontFamily: 'NunitoSans_700Bold',
  },
  typeSelectBtnTextActive: {
    color: '#ffffff',
  },
  addBtnSmall: {
    backgroundColor: '#c89d71',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ebe1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemName: {
    color: '#1a1614',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
    marginBottom: 2,
  },
  listItemMeta: {
    color: '#8b8378',
    fontSize: 13,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  listItemValue: {
    color: '#c89d71',
    fontSize: 18,
    fontFamily: 'NunitoSans_800ExtraBold',
    marginRight: 16,
  },
  editBtnIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f5f1',
  },
  deleteBtnIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff0f0',
  },
  primaryActionBtn: {
    backgroundColor: '#1a1614',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f8f5f1',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '85%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    color: '#1a1614',
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: -0.5,
  },
  modalForm: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#8b8378',
    marginBottom: 8,
    fontFamily: 'NunitoSans_700Bold',
  },
  submitBtn: {
    backgroundColor: '#1a1614',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
  },
});
