import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useDatabaseStore } from '../../../store/useDatabaseStore';
import { Ticket } from '../../../types';
import { Search, CheckCircle } from 'lucide-react-native';

export default function AttendeesScreen() {
  const { tickets, processScan } = useDatabaseStore();
  const [search, setSearch] = useState('');

  const ticketsArray = (Object.values(tickets) as Ticket[]).filter(t => 
    t.buyerName.toLowerCase().includes(search.toLowerCase()) || 
    t.qrCode.toLowerCase().includes(search.toLowerCase())
  );

  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [checkInQty, setCheckInQty] = useState(1);

  const openManualCheckIn = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setCheckInQty(1);
    setShowModal(true);
  };

  const confirmCheckIn = async () => {
    if (selectedTicket && checkInQty > 0) {
      await processScan(selectedTicket.qrCode, checkInQty);
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
          const remaining = item.capacity - item.used;
          const isComplete = remaining === 0;

          return (
            <View style={[styles.card, item.status === 'invalid' && { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }]}>
              <View style={styles.cardContent}>
                <Text style={styles.name}>{item.buyerName}</Text>
                <Text style={styles.meta}>Código: {item.qrCode}</Text>
                <Text style={styles.meta}>Ingresos: {item.used} / {item.capacity}</Text>
                
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
            </View>
          );
        }}
      />

      {/* Modal Check-in Manual */}
      {selectedTicket && (
        <Modal visible={showModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Check-in Manual</Text>
              <Text style={styles.modalDesc}>¿Cuántas personas van a ingresar ahora del grupo de {selectedTicket.buyerName}?</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 }}>
                <TouchableOpacity onPress={() => setCheckInQty(Math.max(1, checkInQty-1))} style={styles.qtyBtn}>
                  <Text style={{ color: '#231e1a', fontSize: 20 }}>-</Text>
                </TouchableOpacity>
                <Text style={{ color: '#231e1a', fontSize: 20, fontFamily: 'NunitoSans_600SemiBold' }}>{checkInQty}</Text>
                <TouchableOpacity onPress={() => setCheckInQty(Math.min(selectedTicket.capacity - selectedTicket.used, checkInQty+1))} style={styles.qtyBtn}>
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
    backgroundColor: '#d9d1c0',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bdb39b',
  },
  input: {
    flex: 1,
    color: '#231e1a',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#d9d1c0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#bdb39b',
  },
  cardContent: {
    flex: 1,
  },
  name: {
    color: '#231e1a',
    fontSize: 18,
    fontFamily: 'NunitoSans_600SemiBold',
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
  modalContent: {
    backgroundColor: '#d9d1c0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },
  modalTitle: { color: '#231e1a', fontSize: 24, fontFamily: 'NunitoSans_600SemiBold', marginBottom: 8 },
  modalDesc: { color: '#686a54', fontSize: 14, marginBottom: 24 },
  qtyBtn: { backgroundColor: '#f4efe9', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bdb39b' },
  actionBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' }
});
