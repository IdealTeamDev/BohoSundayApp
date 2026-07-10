import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image, Alert } from 'react-native';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Plus, X, Share2, Download } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Ticket } from '../../types';

export default function QRManagerScreen() {
  const { tickets, tiers, tables, adminCreateTicket } = useDatabaseStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const { user } = useAuthStore();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Form state
  const [buyerName, setBuyerName] = useState('');
  const [phone, setPhone] = useState('');
  const [capacity, setCapacity] = useState('1');
  const [selectedType, setSelectedType] = useState<'early'|'general'|'bed'|'table'|''>('');
  const [selectedTable, setSelectedTable] = useState('');

  const ticketsArr = Object.values(tickets || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const handleCreate = () => {
    if (!buyerName || !capacity || !selectedType) {
      Alert.alert('Error', 'Por favor llena los campos obligatorios (Nombre, Capacidad, Tipo).');
      return;
    }
    
    adminCreateTicket(buyerName, phone, selectedType as any, parseInt(capacity), selectedTable || undefined);
    
    // Reset
    setBuyerName('');
    setPhone('');
    setCapacity('1');
    setSelectedType('');
    setSelectedTable('');
    setModalVisible(false);
  };

  const openQrModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setQrModalVisible(true);
  };

  const shareQrCode = async () => {
    if (!selectedTicket) return;
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${selectedTicket.qrCode}`;
      // @ts-ignore
      const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + `QR_${selectedTicket.buyerName.replace(/\s/g, '_')}.png`;
      
      const { uri } = await FileSystem.downloadAsync(qrUrl, fileUri);
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { dialogTitle: 'Compartir Código QR' });
      } else {
        Alert.alert('Error', 'No se puede compartir en este dispositivo');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Hubo un problema al compartir el QR: ' + e.message);
    }
  };

  const getTierName = (id?: string) => tiers.find(t => t.id === id)?.name || 'N/A';
  const getTableName = (id?: string) => tables.find(t => t.id === id)?.name || 'N/A';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Historial de Códigos QR</Text>
        
        {ticketsArr.length === 0 ? (
          <Text style={styles.emptyText}>No hay tickets creados aún.</Text>
        ) : (
          ticketsArr.map(ticket => (
            <TouchableOpacity key={ticket.id} style={styles.ticketCard} onPress={() => openQrModal(ticket)}>
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketName}>{ticket.buyerName}</Text>
                <Text style={styles.ticketMeta}>Teléfono: {ticket.phone || 'N/A'}</Text>
                <Text style={styles.ticketMeta}>Tipo: {ticket.ticketType?.toUpperCase()}</Text>
                <Text style={styles.ticketMeta}>Etapa de compra: {getTierName(ticket.tierId)}</Text>
                <Text style={styles.ticketMeta}>Mesa: {ticket.tableId ? getTableName(ticket.tableId) : 'Ninguna'}</Text>
                <Text style={styles.ticketMeta}>Aforo: {ticket.capacity}</Text>
              </View>
              <View style={styles.qrPreviewContainer}>
                <Image 
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${ticket.qrCode}` }} 
                  style={styles.qrPreview} 
                />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

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
            
            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Nombre del Comprador *</Text>
              <TextInput style={styles.input} value={buyerName} onChangeText={setBuyerName} placeholder="Ej. Juan Pérez" />

              <Text style={styles.label}>Teléfono (WhatsApp)</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Ej. +573000000000" keyboardType="phone-pad" />

              <Text style={styles.label}>Cantidad de Personas *</Text>
              <TextInput style={styles.input} value={capacity} onChangeText={setCapacity} placeholder="1" keyboardType="numeric" />

              <Text style={styles.label}>Tipo de Boleto / Producto *</Text>
              <View style={styles.pickerContainer}>
                {[
                  { id: 'early', name: 'Early' },
                  { id: 'general', name: 'General' },
                  { id: 'bed', name: 'Cama VIP' },
                  { id: 'table', name: 'Mesa' }
                ].map(t => (
                  <TouchableOpacity 
                    key={t.id} 
                    style={[styles.pickerItem, selectedType === t.id && styles.pickerItemActive]}
                    onPress={() => setSelectedType(t.id as any)}
                  >
                    <Text style={[styles.pickerItemText, selectedType === t.id && styles.pickerItemTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Mesa (Opcional)</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity 
                    style={[styles.pickerItem, selectedTable === '' && styles.pickerItemActive]}
                    onPress={() => setSelectedTable('')}
                  >
                    <Text style={[styles.pickerItemText, selectedTable === '' && styles.pickerItemTextActive]}>Ninguna</Text>
                </TouchableOpacity>
                {tables.map(t => (
                  <TouchableOpacity 
                    key={t.id} 
                    style={[styles.pickerItem, selectedTable === t.id && styles.pickerItemActive]}
                    onPress={() => setSelectedTable(t.id)}
                  >
                    <Text style={[styles.pickerItemText, selectedTable === t.id && styles.pickerItemTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                <Text style={styles.submitBtnText}>Generar QR</Text>
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
              <X color="#231e1a" size={24} />
            </TouchableOpacity>
            
            {selectedTicket && (
              <>
                <Text style={styles.qrModalTitle}>{selectedTicket.buyerName}</Text>
                <Text style={styles.qrModalSub}>{selectedTicket.capacity} Personas - {selectedTicket.ticketType?.toUpperCase()}</Text>
                
                <Image 
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${selectedTicket.qrCode}` }} 
                  style={styles.qrLarge} 
                />
                
                <TouchableOpacity style={styles.shareBtn} onPress={shareQrCode}>
                  <Share2 color="#f4efe9" size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.shareBtnText}>Compartir / Reenviar</Text>
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
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    color: '#231e1a',
    fontSize: 18,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 16,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  emptyText: {
    color: '#686a54',
    textAlign: 'center',
    marginTop: 40,
  },
  ticketCard: {
    backgroundColor: '#d9d1c0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#bdb39b',
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    color: '#231e1a',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
    marginBottom: 4,
  },
  ticketMeta: {
    color: '#686a54',
    fontSize: 13,
    marginBottom: 2,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  qrPreviewContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  qrPreview: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#686a54',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
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
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bdb39b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontFamily: 'NunitoSans_400Regular',
    color: '#231e1a',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pickerItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bdb39b',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pickerItemActive: {
    backgroundColor: '#686a54',
    borderColor: '#686a54',
  },
  pickerItemText: {
    color: '#686a54',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  pickerItemTextActive: {
    color: '#f4efe9',
  },
  submitBtn: {
    backgroundColor: '#47311f',
    padding: 16,
    borderRadius: 12,
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
    backgroundColor: '#f4efe9',
    margin: 24,
    marginTop: '30%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  closeQrBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  qrModalTitle: {
    fontSize: 22,
    color: '#231e1a',
    fontFamily: 'NunitoSans_700Bold',
    marginTop: 8,
    marginBottom: 4,
  },
  qrModalSub: {
    fontSize: 14,
    color: '#686a54',
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 24,
  },
  qrLarge: {
    width: 250,
    height: 250,
    marginBottom: 24,
  },
  shareBtn: {
    backgroundColor: '#686a54',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  shareBtnText: {
    color: '#f4efe9',
    fontSize: 16,
    fontFamily: 'NunitoSans_700Bold',
  }
});
