import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image, Alert, Linking, Platform, FlatList } from 'react-native';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Plus, X, Share2, MessageCircle, Search, Filter } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Ticket } from '../../types';

export default function QRManagerScreen() {
  const { tickets, tiers, tables, getActiveTier, getFusedProductsForActiveTier, adminCreateTicket } = useDatabaseStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const { user } = useAuthStore();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Form state
  const [buyerName, setBuyerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [capacity, setCapacity] = useState('1');
  const [ticketCategory, setTicketCategory] = useState<'entrada'|'mesa'|'cama'|''>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState('');
  const [allowTierChange, setAllowTierChange] = useState(false);
  const [customTierId, setCustomTierId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal Edit state
  const [editPhone, setEditPhone] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'used' | 'available'>('all');

  const ticketsArr = Object.values(tickets || {}).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  
  const filteredTickets = ticketsArr.filter(t => {
    const searchMatch = t.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (t.buyer_phone || '').includes(searchQuery) || 
                        t.order_id.toLowerCase().includes(searchQuery.toLowerCase());
    const isUsed = t.accesos_restantes === 0;
    const statusMatch = filterStatus === 'all' ? true : (filterStatus === 'used' ? isUsed : !isUsed);
    return searchMatch && statusMatch;
  });
  
  const activeTier = getActiveTier();
  const availableProducts = getFusedProductsForActiveTier();

  const availableTables = tables.filter(t => t.available);
  // Get unique zones
  const availableZones = Array.from(new Set(availableTables.map(t => t.zone || 'Otros'))).sort();
  const tablesInSelectedZone = availableTables.filter(t => (t.zone || 'Otros') === selectedZone).sort((a, b) => a.name.localeCompare(b.name));

  const handleCreate = async () => {
    if (!buyerName || !capacity || !selectedType || !ticketCategory) {
      Alert.alert('Error', 'Por favor llena los campos obligatorios (Nombre, Capacidad, Tipo de boleta y Producto/Mesa).');
      return;
    }
    
    setIsSubmitting(true);
    const { success, error } = await adminCreateTicket(
      buyerName, 
      phone, 
      email,
      selectedType, 
      parseInt(capacity), 
      selectedTable || undefined
    );
    setIsSubmitting(false);

    if (success) {
      Alert.alert('Éxito', 'El QR ha sido generado correctamente.');
      // Reset
      setBuyerName('');
      setPhone('');
      setEmail('');
      setCapacity('1');
      setTicketCategory('');
      setSelectedType('');
      setSelectedZone('');
      setSelectedTable('');
      setModalVisible(false);
    } else {
      Alert.alert('Error', error || 'No se pudo generar el QR.');
    }
  };

  const openQrModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditPhone(ticket.buyer_phone || '');
    setQrModalVisible(true);
  };

  const shareViaWhatsApp = () => {
    if (!selectedTicket) return;
    const number = editPhone.replace(/\D/g, '');
    if (!number) {
      Alert.alert('Error', 'Ingresa un número de teléfono válido.');
      return;
    }
    // Update store with new phone
    // editTicket(selectedTicket.id, editPhone);
    
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${selectedTicket.order_id}`;
    const message = `Hola ${selectedTicket.buyer_name},\n\nAquí tienes tu entrada para *Boho Sunday*.\n\n🎟️ *Tipo:* ${selectedTicket.ticket_name?.toUpperCase() || 'General'}\n👥 *Aforo:* ${selectedTicket.total_accesos} Personas\n\nTu código de acceso único es: ${selectedTicket.order_id}\n\n📷 *Abre este enlace para ver tu Código QR:*\n${qrImageUrl}`;
    
    Linking.openURL(`whatsapp://send?phone=${number}&text=${encodeURIComponent(message)}`).catch(() => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp. Asegúrate de tenerlo instalado.');
    });
  };

  const shareQrCode = async () => {
    if (!selectedTicket) return;
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${selectedTicket.order_id}`;
      const safeName = selectedTicket.buyer_name.replace(/[^a-zA-Z0-9]/g, '_');
      
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = `QR_${safeName}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + `QR_${safeName}.png`;
      
      const { uri } = await FileSystem.downloadAsync(qrUrl, fileUri);
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { 
          dialogTitle: 'Compartir Código QR',
          mimeType: 'image/png',
          UTI: 'public.png'
        });
      } else {
        Alert.alert('Error', 'No se puede compartir en este dispositivo');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Hubo un problema al compartir el QR: ' + e.message);
    }
  };

  const getTierName = (id?: string) => tiers.find(t => t.id === id)?.name || 'N/A';
  const getTableName = (id?: string) => tables.find(t => t.id === id)?.name || 'N/A';

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestor de QR</Text>
        <Text style={styles.headerSubtitle}>Administra las entradas y reservas</Text>
      </View>

      {/* FILTERS SECTION */}
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Search color="#8b8378" size={20} style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Buscar por nombre, teléfono o ID..." 
            placeholderTextColor="#8b8378"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity 
            style={[styles.filterBtn, filterStatus === 'all' && styles.filterBtnActive]} 
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterBtnText, filterStatus === 'all' && styles.filterBtnTextActive]}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, filterStatus === 'available' && styles.filterBtnActive]} 
            onPress={() => setFilterStatus('available')}
          >
            <Text style={[styles.filterBtnText, filterStatus === 'available' && styles.filterBtnTextActive]}>Disponibles</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, filterStatus === 'used' && styles.filterBtnActive]} 
            onPress={() => setFilterStatus('used')}
          >
            <Text style={[styles.filterBtnText, filterStatus === 'used' && styles.filterBtnTextActive]}>Usados</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderItem = ({ item: ticket }: { item: Ticket }) => {
    const isUsed = ticket.accesos_restantes === 0;
    return (
      <TouchableOpacity style={[styles.ticketCard, isUsed && { opacity: 0.6 }]} onPress={() => openQrModal(ticket)}>
        <View style={styles.ticketInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={styles.ticketName}>{ticket.buyer_name}</Text>
            {isUsed && (
              <View style={[styles.statusBadge, { backgroundColor: '#fff0f0' }]}>
                <Text style={[styles.statusBadgeText, { color: '#ff4d4d' }]}>AGOTADO</Text>
              </View>
            )}
          </View>
          <Text style={styles.ticketMeta}>Teléfono: {ticket.buyer_phone || 'N/A'}</Text>
          <Text style={styles.ticketMeta}>Tipo: {availableProducts.find(p => p.id === ticket.ticket_name)?.name || ticket.ticket_name?.toUpperCase()}</Text>
          {ticket.zone && ticket.ticket_number && (
            <Text style={styles.ticketMeta}>Zona: {ticket.zone} #{ticket.ticket_number}</Text>
          )}
          <Text style={[styles.ticketMeta, { color: '#231e1a', fontFamily: 'NunitoSans_700Bold', marginTop: 4 }]}>
            Aforo: {ticket.total_accesos} (Disponibles: {ticket.accesos_restantes})
          </Text>
        </View>
        <View style={styles.qrPreviewContainer}>
          <Image 
            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${ticket.order_id}` }} 
            style={styles.qrPreview} 
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredTickets}
        keyExtractor={t => t.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron tickets.</Text>}
        contentContainerStyle={styles.scrollContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />

      {user?.role === 'admin' && (
        <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
          <Plus color="#f4efe9" size={24} />
        </TouchableOpacity>
      )}

      {/* MODAL CREAR TICKET */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Código QR</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color="#231e1a" size={24} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Información del Cliente</Text>
                
                <Text style={styles.label}>Nombre Completo *</Text>
                <TextInput style={styles.input} value={buyerName} onChangeText={setBuyerName} placeholder="Ej. Juan Pérez" placeholderTextColor="#b0a8a0" />

                <Text style={styles.label}>Teléfono (WhatsApp)</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Ej. +573000000000" keyboardType="phone-pad" placeholderTextColor="#b0a8a0" />

                <Text style={styles.label}>Correo Electrónico</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Ej. juan@correo.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#b0a8a0" />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Detalles del Boleto</Text>
                
                <Text style={styles.label}>Tipo de boleta *</Text>
                <View style={styles.pickerContainer}>
                  {['entrada', 'mesa', 'cama'].map(cat => (
                    <TouchableOpacity 
                      key={cat} 
                      style={[styles.pickerItem, ticketCategory === cat && styles.pickerItemActive]}
                      onPress={() => {
                        setTicketCategory(cat as any);
                        setSelectedType('');
                        setSelectedZone('');
                        setSelectedTable('');
                        setCapacity('1');
                      }}
                    >
                      <Text style={[styles.pickerItemText, ticketCategory === cat && styles.pickerItemTextActive]}>{cat.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {ticketCategory === 'entrada' && (
                  <>
                    <Text style={styles.label}>Entrada *</Text>
                    <View style={styles.pickerContainer}>
                      {availableProducts.filter(p => p.type === 'ticket').map(p => (
                        <TouchableOpacity 
                          key={p.id} 
                          style={[styles.pickerItem, selectedType === p.id && styles.pickerItemActive]}
                          onPress={() => setSelectedType(p.id)}
                        >
                          <Text style={[styles.pickerItemText, selectedType === p.id && styles.pickerItemTextActive]}>{p.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {(ticketCategory === 'mesa' || ticketCategory === 'cama') && (
                  <>
                    <Text style={styles.label}>Zona *</Text>
                    <View style={styles.pickerContainer}>
                      {Array.from(new Set(availableTables
                        .filter(t => ticketCategory === 'cama' ? t.name.toLowerCase().includes('cama') : !t.name.toLowerCase().includes('cama'))
                        .map(t => t.zone || 'Otros'))).sort().map(zone => (
                        <TouchableOpacity 
                          key={zone} 
                          style={[styles.pickerItem, selectedZone === zone && styles.pickerItemActive]}
                          onPress={() => { 
                            setSelectedZone(zone); 
                            setSelectedTable(''); 
                            setCapacity('1'); 
                          }}
                        >
                          <Text style={[styles.pickerItemText, selectedZone === zone && styles.pickerItemTextActive]}>{zone}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    
                    {selectedZone ? (
                      <>
                        <Text style={styles.label}>Qué numero *</Text>
                        <View style={styles.pickerContainer}>
                          {availableTables
                            .filter(t => (ticketCategory === 'cama' ? t.name.toLowerCase().includes('cama') : !t.name.toLowerCase().includes('cama')) && (t.zone || 'Otros') === selectedZone)
                            .map(t => (
                             <TouchableOpacity 
                               key={t.id} 
                               style={[styles.pickerItem, selectedTable === t.id && styles.pickerItemActive]}
                               onPress={() => { 
                                 setSelectedTable(t.id); 
                                 setCapacity(t.persons.toString()); 
                                 // The Table ID is its product ID in the backend
                                 setSelectedType(t.id); 
                               }}
                             >
                               <Text style={[styles.pickerItemText, selectedTable === t.id && styles.pickerItemTextActive]}>{t.name} #{t.number}</Text>
                             </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : null}
                  </>
                )}

                <Text style={styles.label}>Etapa *</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TouchableOpacity 
                    style={{
                      width: 20, height: 20, borderRadius: 4, borderWidth: 2, 
                      borderColor: allowTierChange ? '#1a1614' : '#b0a8a0', 
                      backgroundColor: allowTierChange ? '#1a1614' : 'transparent',
                      marginRight: 8,
                      alignItems: 'center', justifyContent: 'center'
                    }}
                    onPress={() => {
                      setAllowTierChange(!allowTierChange);
                      if (allowTierChange) setCustomTierId('');
                    }}
                  >
                    {allowTierChange && <Text style={{color: '#f4efe9', fontSize: 12, fontWeight: 'bold'}}>✓</Text>}
                  </TouchableOpacity>
                  <Text style={{color: '#bdb39b', fontSize: 13, fontFamily: 'NunitoSans_600SemiBold'}}>
                    Quiero cambiar la etapa manualmente
                  </Text>
                </View>

                {allowTierChange ? (
                  <View style={styles.pickerContainer}>
                    {tiers.map(t => (
                      <TouchableOpacity 
                        key={t.id} 
                        style={[styles.pickerItem, (customTierId || activeTier?.id) === t.id && styles.pickerItemActive]}
                        onPress={() => setCustomTierId(t.id)}
                      >
                        <Text style={[styles.pickerItemText, (customTierId || activeTier?.id) === t.id && styles.pickerItemTextActive]}>
                          {t.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <TextInput style={[styles.input, { backgroundColor: '#f0ebe1', color: '#bdb39b' }]} value={activeTier?.name || 'Cargando...'} editable={false} />
                )}

                <Text style={styles.label}>Cantidad en Aforo *</Text>
                <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} placeholder="Ej. 2" keyboardType="numeric" placeholderTextColor="#b0a8a0" />
              </View>

              <TouchableOpacity style={[styles.submitBtn, isSubmitting && { opacity: 0.5 }]} onPress={handleCreate} disabled={isSubmitting}>
                <Text style={styles.submitBtnText}>{isSubmitting ? 'Generando código...' : 'Generar QR Oficial'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL VER QR Y COMPARTIR */}
      <Modal visible={qrModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <TouchableOpacity style={styles.closeQrBtn} onPress={() => setQrModalVisible(false)}>
              <X color="#1a1614" size={24} />
            </TouchableOpacity>
            
            {selectedTicket && (
              <>
                <Text style={styles.qrModalTitle}>{selectedTicket.buyer_name}</Text>
                <Text style={styles.qrModalSub}>{selectedTicket.total_accesos} Personas (Quedan {selectedTicket.accesos_restantes}) - {availableProducts.find(p => p.id === selectedTicket.ticket_name)?.name || selectedTicket.ticket_name?.toUpperCase()} #{selectedTicket.ticket_number}</Text>
                
                <Image 
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${selectedTicket.order_id}` }} 
                  style={styles.qrLarge} 
                />

                <View style={{ width: '100%', marginBottom: 16 }}>
                  <Text style={styles.label}>Número de WhatsApp</Text>
                  <TextInput 
                    style={[styles.input, { marginBottom: 0 }]} 
                    value={editPhone} 
                    onChangeText={setEditPhone} 
                    placeholder="Ej. 573000000000" 
                    keyboardType="phone-pad" 
                  />
                </View>
                
                <TouchableOpacity style={styles.shareBtn} onPress={shareViaWhatsApp}>
                  <MessageCircle color="#fff" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.shareBtnText}>Enviar por WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#f4efe9', borderWidth: 1, borderColor: '#f0ebe1', marginTop: 12 }]} onPress={shareQrCode}>
                  <Share2 color="#1a1614" size={20} style={{ marginRight: 8 }} />
                  <Text style={[styles.shareBtnText, { color: '#231e1a' }]}>Descargar QR</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe9',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: { marginBottom: 24, marginTop: 8 },
  headerTitle: { color: '#231e1a', fontSize: 28, fontFamily: 'NunitoSans_700Bold', letterSpacing: -0.5 },
  headerSubtitle: { color: '#bdb39b', fontSize: 15, fontFamily: 'NunitoSans_600SemiBold', marginTop: 4 },
  
  filterSection: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#231e1a',
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f4efe9',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  filterBtnActive: {
    backgroundColor: '#686a54',
    borderColor: '#1a1614',
  },
  filterBtnText: {
    color: '#bdb39b',
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 13,
  },
  filterBtnTextActive: {
    color: '#f4efe9',
  },
  
  emptyText: {
    color: '#bdb39b',
    textAlign: 'center',
    marginTop: 40,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    color: '#231e1a',
    fontSize: 18,
    fontFamily: 'NunitoSans_700Bold',
    letterSpacing: -0.3,
  },
  statusBadge: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'NunitoSans_700Bold',
    letterSpacing: 0.5,
  },
  ticketMeta: {
    color: '#bdb39b',
    fontSize: 13,
    marginBottom: 2,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  qrPreviewContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    backgroundColor: '#f8f5f1',
    padding: 8,
    borderRadius: 12,
  },
  qrPreview: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#686a54',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    color: '#231e1a',
    fontFamily: 'NunitoSans_700Bold',
    letterSpacing: -0.5,
  },
  modalForm: {
    flex: 1,
  },
  formSection: {
    backgroundColor: '#fdfbf9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#231e1a',
    fontFamily: 'NunitoSans_700Bold',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 13,
    color: '#bdb39b',
    marginBottom: 8,
    fontFamily: 'NunitoSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f0ebe1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontFamily: 'NunitoSans_600SemiBold',
    color: '#231e1a',
    fontSize: 15,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  pickerItem: {
    backgroundColor: '#f4efe9',
    borderWidth: 1,
    borderColor: '#f0ebe1',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pickerItemActive: {
    backgroundColor: '#686a54',
    borderColor: '#1a1614',
  },
  pickerItemText: {
    color: '#bdb39b',
    fontFamily: 'NunitoSans_700Bold',
  },
  pickerItemTextActive: {
    color: '#f4efe9',
  },
  submitBtn: {
    backgroundColor: '#686a54',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  submitBtnText: {
    color: '#f4efe9',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
  },
  qrModalContent: {
    backgroundColor: '#f8f5f1',
    margin: 24,
    marginTop: '30%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  closeQrBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: '#f4efe9',
    padding: 8,
    borderRadius: 20,
  },
  qrModalTitle: {
    fontSize: 24,
    color: '#231e1a',
    fontFamily: 'NunitoSans_700Bold',
    marginTop: 16,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  qrModalSub: {
    fontSize: 14,
    color: '#bdb39b',
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 32,
  },
  qrLarge: {
    width: 250,
    height: 250,
    marginBottom: 32,
    borderRadius: 16,
  },
  shareBtn: {
    backgroundColor: '#686a54',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    justifyContent: 'center',
  },
  shareBtnText: {
    color: '#f4efe9',
    fontSize: 15,
    fontFamily: 'NunitoSans_700Bold',
  }
});
