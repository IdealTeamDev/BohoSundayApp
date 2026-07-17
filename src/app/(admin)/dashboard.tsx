import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform, TextInput, Modal, Alert, useWindowDimensions } from 'react-native';
import { Redirect } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuthStore } from '../../store/useAuthStore';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { formatCOP } from '../../utils/format';
import { api, AdminStats } from '../../services/api';
import { RefreshCw, Users, Ticket, DollarSign, Edit2, Trash2, Plus, Save, X } from 'lucide-react-native';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { tiers, addTier, editTier, removeTier, products, addProduct, removeProduct, tickets } = useDatabaseStore();
  if (user?.role === 'viewer') return <Redirect href="/(admin)/tables" />;
  
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [tierModalVisible, setTierModalVisible] = useState(false);

  // Form State for Tiers (Event Stages)
  const [newTierName, setNewTierName] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [isSavingTier, setIsSavingTier] = useState(false);
  const [expandedCatalogGroups, setExpandedCatalogGroups] = useState<Record<string, boolean>>({});
  
  // State for Global Products
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductType, setNewProductType] = useState<'ticket'|'bed'|'table'>('ticket');
  const [newProductZone, setNewProductZone] = useState('oasis');
  const [newProductNumber, setNewProductNumber] = useState('');
  const [newProductPersons, setNewProductPersons] = useState('10');
  const [newProductStock, setNewProductStock] = useState('100');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleAddOrEditTier = async () => {
    if (newTierName.trim() !== '') {
      setIsSavingTier(true);
      const endDate = newEndDate || new Date(Date.now() + 86400000).toISOString();
      
      try {
        if (editingTierId) {
          await editTier(editingTierId, newTierName, endDate, priceOverrides);
        } else {
          await addTier(newTierName, endDate, priceOverrides);
        }
        closeTierModal();
      } catch (e) {
        console.error("Error saving tier", e);
      } finally {
        setIsSavingTier(false);
      }
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

  const toggleOverride = (ids: string[], basePrice: number) => {
    const overrides = { ...priceOverrides };
    const isOverridden = overrides[ids[0]] !== undefined;
    if (isOverridden) {
      ids.forEach(id => delete overrides[id]);
    } else {
      ids.forEach(id => overrides[id] = basePrice);
    }
    setPriceOverrides(overrides);
  };

  const updateOverrideValue = (ids: string[], val: string) => {
    const num = parseFloat(val) || 0;
    setPriceOverrides(prev => {
      const next = { ...prev };
      ids.forEach(id => next[id] = num);
      return next;
    });
  };

  const handleAddProduct = async () => {
    if (!newProductPrice) return;
    try {
      setIsAddingProduct(true);
      if (newProductType === 'ticket') {
        if (!newProductName.trim()) return;
        await addProduct({
          type: 'ticket',
          name: newProductName,
          basePrice: parseFloat(newProductPrice) || 0,
          stock: parseInt(newProductStock, 10) || 100
        });
      } else {
        if (!newProductNumber) return;
        let pName = 'MESA';
        if (newProductType === 'bed') {
          pName = `CAMA ${newProductZone.toUpperCase()}`;
        } else {
          pName = `MESA ${newProductZone.toUpperCase()}`;
        }
        await addProduct({
          type: newProductType,
          name: pName,
          basePrice: parseFloat(newProductPrice) || 0,
          zone: newProductZone,
          number: newProductNumber,
          persons: parseInt(newProductPersons, 10) || 10
        });
      }
      setNewProductName('');
      setNewProductPrice('');
      setNewProductNumber('');
      setNewProductStock('100');
    } catch (e) {
      Alert.alert('Error', 'No se pudo añadir el producto');
    } finally {
      setIsAddingProduct(false);
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
      <View style={[styles.content, isDesktop && { maxWidth: 1000, alignSelf: 'center', width: '100%' }]}>
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
          <View style={[styles.kpiContainer, isDesktop && { flexDirection: 'row' }]}>
            <View style={[styles.kpiCardPrimary, isDesktop && { flex: 2 }]}>
              <View style={styles.kpiHeader}>
                <Text style={[styles.kpiTitle, { color: 'rgba(255,255,255,0.8)' }]}>Ingresos Totales</Text>
                <View style={styles.iconCircleLight}>
                  <DollarSign color="#fff" size={16} />
                </View>
              </View>
              <Text style={[styles.kpiValue, { color: '#f4efe9' }]}>{formatCurrency(stats.totalRevenue)}</Text>
            </View>

            <View style={[styles.kpiRow, isDesktop && { flex: 3 }]}>
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
          <Text style={[styles.title, { fontSize: 16, marginBottom: 12 }]}>Añadir Nuevo Producto</Text>
          
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity 
              style={[styles.typeSelectBtn, newProductType === 'ticket' && styles.typeSelectBtnActive]}
              onPress={() => setNewProductType('ticket')}
            >
              <Text style={[styles.typeSelectBtnText, newProductType === 'ticket' && styles.typeSelectBtnTextActive]}>Ticket</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeSelectBtn, newProductType === 'table' && styles.typeSelectBtnActive]}
              onPress={() => {
                setNewProductType('table');
                setNewProductZone('oasis');
              }}
            >
              <Text style={[styles.typeSelectBtnText, newProductType === 'table' && styles.typeSelectBtnTextActive]}>Mesa</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeSelectBtn, newProductType === 'bed' && styles.typeSelectBtnActive]}
              onPress={() => {
                setNewProductType('bed');
                setNewProductZone('bohemian');
              }}
            >
              <Text style={[styles.typeSelectBtnText, newProductType === 'bed' && styles.typeSelectBtnTextActive]}>Cama</Text>
            </TouchableOpacity>
          </View>

          {newProductType === 'ticket' ? (
            <>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Nombre *</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 0 }]} 
                    placeholder="Ej. ANYTIME" 
                    value={newProductName} 
                    onChangeText={setNewProductName} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Stock *</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 0 }]} 
                    placeholder="100" 
                    keyboardType="numeric"
                    value={newProductStock} 
                    onChangeText={setNewProductStock} 
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {(newProductType === 'table' ? ['oasis', 'candela', 'backstage'] : ['bohemian', 'lujo primitivo', 'vip']).map(zone => (
                  <TouchableOpacity 
                    key={zone}
                    style={{ 
                      paddingHorizontal: 16, 
                      paddingVertical: 8, 
                      borderRadius: 20, 
                      backgroundColor: newProductZone === zone ? '#1a1614' : '#ffffff',
                      borderWidth: 1,
                      borderColor: newProductZone === zone ? '#1a1614' : '#f0ebe1',
                    }}
                    onPress={() => setNewProductZone(zone)}
                  >
                    <Text style={{ 
                      fontSize: 12, 
                      fontFamily: 'NunitoSans_700Bold', 
                      color: newProductZone === zone ? '#ffffff' : '#8b8378'
                    }}>
                      {zone.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Número (ej. 13) *</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 0 }]} 
                    placeholder="Ej. 1" 
                    keyboardType="numeric"
                    value={newProductNumber} 
                    onChangeText={setNewProductNumber} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Personas</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 0 }]} 
                    placeholder="Ej. 10" 
                    keyboardType="numeric"
                    value={newProductPersons} 
                    onChangeText={setNewProductPersons} 
                  />
                </View>
              </View>
            </>
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Precio Base (COP) *</Text>
            <TextInput 
              style={[styles.input, { marginBottom: 0 }]} 
              placeholder="Ej. 50000" 
              keyboardType="numeric" 
              value={newProductPrice} 
              onChangeText={setNewProductPrice} 
            />
          </View>
          
          <TouchableOpacity onPress={handleAddProduct} style={{ backgroundColor: '#c89d71', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 }} disabled={isAddingProduct}>
            <Text style={{ color: '#f4efe9', fontFamily: 'NunitoSans_700Bold', fontSize: 16 }}>
              {isAddingProduct ? 'Añadiendo...' : 'Añadir Producto'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          {(() => {
            const catalogGroups: Record<string, { key: string, name: string, type: string, items: typeof products }> = {};
            products.forEach(p => {
              if (!catalogGroups[p.name]) {
                catalogGroups[p.name] = { key: p.name, name: p.name, type: p.type, items: [] };
              }
              catalogGroups[p.name].items.push(p);
            });
            
            return Object.values(catalogGroups).map((g, idx) => {
              const isExpanded = expandedCatalogGroups[g.key];
              const toggleGroup = () => setExpandedCatalogGroups(prev => ({ ...prev, [g.key]: !prev[g.key] }));
              
              return (
                <View key={g.key} style={[styles.listItem, { flexDirection: 'column', alignItems: 'stretch' }, idx === Object.keys(catalogGroups).length - 1 && !isExpanded && { borderBottomWidth: 0 }]}>
                  <TouchableOpacity onPress={toggleGroup} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listItemName}>{g.name} ({g.items.length})</Text>
                      <Text style={styles.listItemMeta}>{g.type.toUpperCase()}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={[styles.listItemValue, { color: '#bdb39b' }]}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View style={{ marginTop: 12, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#f0ebe1' }}>
                      {g.items.map(p => (
                        <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', color: '#4a4542', flexWrap: 'wrap' }}>{p.name} <Text style={{ color: '#a0978b', fontSize: 12 }}>({p.id})</Text></Text>
                            <Text style={{ fontFamily: 'NunitoSans_700Bold', color: '#231e1a', marginTop: 4 }}>{formatCOP(p.basePrice)}</Text>
                          </View>
                          <TouchableOpacity onPress={() => removeProduct(p.id, p.type as 'ticket'|'bed'|'table')} style={{ padding: 4 }}>
                            <Trash2 color="#ff4d4d" size={18} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            });
          })()}
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

        <View style={[styles.listContainer, { marginBottom: 40 }]}>
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
                  <Text style={[styles.listItemMeta, { marginTop: 4, color: '#231e1a', fontFamily: 'NunitoSans_700Bold' }]}>Cierra: {new Date(item.endDate).toLocaleString()}</Text>
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
              {Platform.OS === 'web' ? (
                // @ts-ignore - web only element
                <input 
                  type="date"
                  style={{ padding: 12, borderRadius: 8, border: '1px solid #d4cfb4', backgroundColor: '#ffffff', marginBottom: 16, width: '100%', boxSizing: 'border-box', fontFamily: 'NunitoSans_400Regular', fontSize: 16, color: '#231e1a' }}
                  value={newEndDate ? new Date(newEndDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Fix time to 00:00:01 in local timezone
                      const [year, month, day] = e.target.value.split('-').map(Number);
                      const d = new Date(year, month - 1, day, 0, 0, 1);
                      setNewEndDate(d.toISOString());
                    }
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.input, { justifyContent: 'center' }]} 
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={{ fontFamily: 'NunitoSans_400Regular', color: newEndDate ? '#231e1a' : '#aaa' }}>
                      {newEndDate ? new Date(newEndDate).toLocaleDateString() : 'Seleccionar fecha'}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={newEndDate ? new Date(newEndDate) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event: any, selectedDate?: Date) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          const finalDate = new Date(selectedDate);
                          finalDate.setHours(0, 0, 1, 0);
                          setNewEndDate(finalDate.toISOString());
                        }
                      }}
                    />
                  )}
                </>
              )}

              <View style={{ backgroundColor: '#e8e3d5', padding: 16, borderRadius: 12, marginTop: 12 }}>
                <Text style={[styles.title, { fontSize: 16, marginBottom: 8 }]}>Excepciones de Precios</Text>
                <Text style={{ fontFamily: 'NunitoSans_400Regular', color: '#686a54', fontSize: 13, marginBottom: 16 }}>
                  Selecciona únicamente los productos cuyo precio quieras que sea DIFERENTE en esta etapa. Los no seleccionados usarán el precio del catálogo base automáticamente.
                </Text>

                {products.length === 0 ? (
                  <Text style={{ color: '#ff4d4d', fontFamily: 'NunitoSans_600SemiBold' }}>No tienes productos en el catálogo base.</Text>
                ) : (
                  (() => {
                    const groups: Record<string, { key: string, name: string, basePrice: number, ids: string[] }> = {};
                    products.forEach(p => {
                      const key = p.name === 'CAMA VIP' ? p.id : p.name;
                      if (!groups[key]) {
                        groups[key] = { key, name: p.name === 'CAMA VIP' ? `CAMA VIP (${p.id})` : p.name, basePrice: p.basePrice, ids: [] };
                      }
                      groups[key].ids.push(p.id);
                    });
                    
                    return Object.values(groups).map(g => {
                      const isOverridden = priceOverrides[g.ids[0]] !== undefined;
                      return (
                        <View key={g.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: isOverridden ? '#fff' : 'transparent', padding: 8, borderRadius: 8 }}>
                          <TouchableOpacity 
                            onPress={() => toggleOverride(g.ids, g.basePrice)}
                            style={{ width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: '#686a54', backgroundColor: isOverridden ? '#686a54' : 'transparent', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}
                          >
                            {isOverridden && <Text style={{ color: '#f4efe9', fontSize: 16, fontWeight: 'bold' }}>✓</Text>}
                          </TouchableOpacity>
                          
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: 'NunitoSans_600SemiBold', color: '#231e1a' }}>{g.name} {g.ids.length > 1 ? `(${g.ids.length})` : ''}</Text>
                            <Text style={{ fontFamily: 'NunitoSans_400Regular', color: '#686a54', fontSize: 12 }}>Base: {formatCOP(g.basePrice)}</Text>
                          </View>
  
                          {isOverridden && (
                            <TextInput
                              style={[styles.input, { width: 100, marginBottom: 0, paddingVertical: 4, height: 36 }]}
                              keyboardType="numeric"
                              value={priceOverrides[g.ids[0]].toString()} 
                              onChangeText={(val) => updateOverrideValue(g.ids, val)}
                            />
                          )}
                        </View>
                      )
                    });
                  })()
                )}
              </View>

              <TouchableOpacity 
                style={[styles.submitBtn, isSavingTier && { opacity: 0.6 }]} 
                onPress={handleAddOrEditTier}
                disabled={isSavingTier}
              >
                <Text style={styles.submitBtnText}>{isSavingTier ? 'Guardando...' : editingTierId ? 'Guardar Cambios' : 'Crear Etapa'}</Text>
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
    color: '#231e1a',
    fontSize: 28,
    fontFamily: 'NunitoSans_700Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#bdb39b',
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
    color: '#bdb39b',
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
    backgroundColor: '#686a54',
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
    color: '#bdb39b',
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
    fontFamily: 'NunitoSans_700Bold',
    letterSpacing: -1,
  },
  kpiValueSmall: {
    color: '#231e1a',
    fontSize: 24,
    fontFamily: 'NunitoSans_700Bold',
  },
  sectionHeader: {
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#231e1a',
    fontSize: 18,
    fontFamily: 'NunitoSans_700Bold',
  },
  sectionSubtitle: {
    color: '#bdb39b',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f0ebe1',
    borderRadius: 12,
    color: '#231e1a',
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f0ebe1',
  },
  typeSelectBtnActive: {
    backgroundColor: '#686a54',
    borderColor: '#1a1614',
  },
  typeSelectBtnText: {
    color: '#bdb39b',
    fontSize: 13,
    fontFamily: 'NunitoSans_700Bold',
  },
  typeSelectBtnTextActive: {
    color: '#f4efe9',
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
    color: '#231e1a',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
    marginBottom: 2,
  },
  listItemMeta: {
    color: '#bdb39b',
    fontSize: 13,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  listItemValue: {
    color: '#c89d71',
    fontSize: 18,
    fontFamily: 'NunitoSans_700Bold',
    marginRight: 16,
  },
  editBtnIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  deleteBtnIcon: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff0f0',
  },
  primaryActionBtn: {
    backgroundColor: '#686a54',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryActionBtnText: {
    color: '#f4efe9',
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
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
    color: '#231e1a',
    fontFamily: 'NunitoSans_700Bold',
    letterSpacing: -0.5,
  },
  modalForm: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#bdb39b',
    marginBottom: 8,
    fontFamily: 'NunitoSans_700Bold',
  },
  submitBtn: {
    backgroundColor: '#686a54',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  submitBtnText: {
    color: '#f4efe9',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
  },
});
