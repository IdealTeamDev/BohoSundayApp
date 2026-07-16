import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useDatabaseStore } from '../../../store/useDatabaseStore';
import { Ticket } from '../../../types';
import { Search, CheckCircle, MessageCircle, Share2, X } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Linking, Platform, Image } from 'react-native';

export default function AttendeesScreen() {
  const { tickets, processScan } = useDatabaseStore();
  const [search, setSearch] = useState('');

  const ticketsArray = (Object.values(tickets) as Ticket[]).filter(t => 
    t.buyer_name?.toLowerCase().includes(search.toLowerCase()) || 
    t.order_id?.toLowerCase().includes(search.toLowerCase())
  );

  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [checkInQty, setCheckInQty] = useState(1);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [editPhone, setEditPhone] = useState('');

  const openManualCheckIn = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCheckInQty(1);
    setShowModal(true);
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
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${selectedTicket.order_id}`;
    const message = `Hola ${selectedTicket.buyer_name},\n\nAquí tienes tu entrada para el Boho Sunday Colombiamoda Edition.\n\n🎟️ Entrada: ${selectedTicket.ticket_name?.toUpperCase() || 'GENERAL'}\n👥 Cantidad: ${selectedTicket.total_accesos} Personas\n\nAbre este enlace para ver tu Código QR:\n${qrImageUrl}`;
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
        await Sharing.shareAsync(uri, { dialogTitle: 'Compartir Código QR', mimeType: 'image/png', UTI: 'public.png' });
      } else {
        Alert.alert('Error', 'No se puede compartir en este dispositivo');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Hubo un problema al compartir el QR: ' + e.message);
    }
  };

  const confirmCheckIn = async () => {
    if (selectedTicket && checkInQty > 0) {
      await processScan(selectedTicket.order_id, checkInQty);
      setShowModal(false);
    }
  };



  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Search color="#686a54" size={20} />
        <TextInput
          style={styles.input}
          placeholder="Buscar por nombre o QR..."
          placeholderTextColor="#bdb39b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={ticketsArray}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const remaining = item.accesos_restantes;
          const isComplete = remaining === 0;

          return (
            <TouchableOpacity onPress={() => openQrModal(item)} style={[styles.card, item.status === 'invalid' && { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <View style={styles.cardContent}>
                <Text style={styles.name}>{item.buyer_name}</Text>
                <Text style={styles.meta}>Código: {item.order_id}</Text>
                <Text style={styles.meta}>Ingresos: {item.total_accesos - item.accesos_restantes} / {item.total_accesos}</Text>
                
                {item.status === 'invalid' ? (
                  <View style={[styles.completeTag, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                    <Text style={[styles.completeText, { color: '#ef4444' }]}>LISTA NEGRA</Text>
                  </View>
                ) : isComplete ? (
                  <View style={styles.completeTag}>
                    <Text style={styles.completeText}>COMPLETO</Text>
                  </View>
                ) : (
                  <View style={styles.pendingTag}>
                    <Text style={styles.pendingText}>FALTAN {remaining}</Text>
                  </View>
                )}
              </View>

              {!isComplete && item.status !== 'invalid' && (
                <TouchableOpacity 
                  style={styles.checkInBtn}
                  onPress={() => openManualCheckIn(item)}
                >
                  <CheckCircle color="#f4efe9" size={24} />
                  <Text style={styles.checkInText}>Ingresar</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
      />

      
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
                <Text style={styles.qrModalSub}>{selectedTicket.total_accesos} Personas (Quedan {selectedTicket.accesos_restantes}) - {selectedTicket.ticket_name?.toUpperCase()} #{selectedTicket.ticket_number}</Text>
                
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

                <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f0ebe1', marginTop: 12 }]} onPress={shareQrCode}>
                  <Share2 color="#1a1614" size={20} style={{ marginRight: 8 }} />
                  <Text style={[styles.shareBtnText, { color: '#231e1a' }]}>Descargar QR</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Check-in Manual */}
      {selectedTicket && (
        <Modal visible={showModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Check-in Manual</Text>
              <Text style={styles.modalDesc}>¿Cuántas personas van a ingresar ahora del grupo de {selectedTicket.buyer_name}?</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 }}>
                <TouchableOpacity onPress={() => setCheckInQty(Math.max(1, checkInQty-1))} style={styles.qtyBtn}>
                  <Text style={{ color: '#231e1a', fontSize: 20 }}>-</Text>
                </TouchableOpacity>
                <Text style={{ color: '#231e1a', fontSize: 20, fontFamily: 'NunitoSans_600SemiBold' }}>{checkInQty}</Text>
                <TouchableOpacity onPress={() => setCheckInQty(Math.min(selectedTicket.accesos_restantes, checkInQty+1))} style={styles.qtyBtn}>
                  <Text style={{ color: '#231e1a', fontSize: 20 }}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f4efe9', borderWidth: 1, borderColor: '#bdb39b' }]} onPress={() => setShowModal(false)}>
                  <Text style={{ color: '#686a54', fontFamily: 'NunitoSans_600SemiBold' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#686a54' }]} onPress={confirmCheckIn}>
                  <Text style={{ color: '#f4efe9', fontFamily: 'NunitoSans_600SemiBold' }}>Confirmar Ingreso</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe9',
    padding: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  input: {
    flex: 1,
    color: '#231e1a',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  name: {
    color: '#231e1a',
    fontSize: 18,
    fontFamily: 'NunitoSans_700Bold',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  meta: {
    color: '#686a54',
    fontSize: 14,
  },
  completeTag: {
    backgroundColor: 'rgba(71, 49, 31, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  completeText: {
    color: '#47311f',
    fontSize: 12,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  pendingTag: {
    backgroundColor: 'rgba(104, 106, 84, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  pendingText: {
    color: '#686a54',
    fontSize: 12,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  checkInBtn: {
    backgroundColor: '#686a54',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkInText: {
    color: '#f4efe9',
    fontSize: 10,
    fontFamily: 'NunitoSans_600SemiBold',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  
  qrModalContent: {
    backgroundColor: '#ffffff',
    width: '90%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    position: 'relative',
    alignSelf: 'center',
    marginBottom: '20%',
  },
  closeQrBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
    backgroundColor: '#f4efe9',
    padding: 8,
    borderRadius: 16,
  },
  qrModalTitle: { color: '#231e1a', fontSize: 24, fontFamily: 'NunitoSans_700Bold', marginTop: 16, textAlign: 'center' },
  qrModalSub: { color: '#8b8378', fontSize: 15, fontFamily: 'NunitoSans_600SemiBold', marginTop: 4, marginBottom: 24, textAlign: 'center' },
  qrLarge: { width: 220, height: 220, marginBottom: 32 },
  shareBtn: { backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, width: '100%' },
  shareBtnText: { color: '#ffffff', fontFamily: 'NunitoSans_700Bold', fontSize: 16 },
  label: { color: '#231e1a', fontSize: 13, fontFamily: 'NunitoSans_700Bold', marginBottom: 8, marginLeft: 4 },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 48,
  },
  modalTitle: { color: '#231e1a', fontSize: 24, fontFamily: 'NunitoSans_600SemiBold', marginBottom: 8 },
  modalDesc: { color: '#686a54', fontSize: 14, marginBottom: 24 },
  qtyBtn: { backgroundColor: '#f4efe9', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bdb39b' },
  actionBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' }
});
