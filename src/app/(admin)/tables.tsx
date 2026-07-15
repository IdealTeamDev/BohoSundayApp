import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Trash2, Plus, X, Users, RotateCcw } from 'lucide-react-native';
import { Table } from '../../types';

export default function TablesManagerScreen() {
  const { user } = useAuthStore();
  const isViewer = user?.role === 'viewer';
  const { tables, addTable, removeTable, tickets, revokeTableReservation } = useDatabaseStore();
  const [newTableName, setNewTableName] = useState('');
  const [newCapacity, setNewCapacity] = useState('10');
  const [newPrice, setNewPrice] = useState('');

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const handleAdd = () => {
    if (newTableName.trim() !== '') {
      addTable(newTableName, parseInt(newCapacity) || 10, newPrice);
      setNewTableName('');
      setNewPrice('');
    }
  };

  const getTableColor = (status: string) => {
    switch (status) {
      case 'available': return '#a3c293'; // Greenish
      case 'reserved': return '#e6c77a'; // Yellowish
      case 'occupied': return '#ff8585'; // Reddish
      default: return '#d9d1c0';
    }
  };

  const openTableDetails = (table: Table) => {
    setSelectedTable(table);
  };

  const closeDetails = () => {
    setSelectedTable(null);
  };

  const handleRevoke = () => {
    if (selectedTable) {
      Alert.alert(
        'Confirmar',
        '¿Estás seguro de que quieres liberar esta mesa? El código QR asociado quedará invalidado y la mesa se podrá revender.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Liberar Mesa', 
            style: 'destructive',
            onPress: () => {
              revokeTableReservation(selectedTable.id);
              closeDetails();
            }
          }
        ]
      );
    }
  };

  const getTicketForTable = (ticketId?: string) => {
    if (!ticketId) return null;
    return tickets[ticketId];
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {!isViewer && (
          <>
            <Text style={styles.title}>Añadir Mesa / Cama</Text>
            
            <View style={[styles.form, { gap: 0, alignItems: 'center' }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Nombre (Ej. Oasis 5)" 
                  placeholderTextColor="#bdb39b" 
                  value={newTableName} 
                  onChangeText={setNewTableName} 
                />
              </View>
              <View style={{ width: 60, marginRight: 8 }}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Aforo" 
                  placeholderTextColor="#bdb39b" 
                  keyboardType="numeric" 
                  value={newCapacity} 
                  onChangeText={setNewCapacity} 
                />
              </View>
              <View style={{ width: 80, marginRight: 8 }}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Precio $" 
                  placeholderTextColor="#bdb39b" 
                  keyboardType="numeric" 
                  value={newPrice} 
                  onChangeText={setNewPrice} 
                />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                <Plus color="#f4efe9" size={24} />
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.headerRow}>
          <Text style={styles.title}>Mapa de Mesas ({tables.length})</Text>
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: '#a3c293' }]} /><Text style={styles.legendText}>Libre</Text>
            <View style={[styles.legendDot, { backgroundColor: '#e6c77a', marginLeft: 8 }]} /><Text style={styles.legendText}>Res.</Text>
            <View style={[styles.legendDot, { backgroundColor: '#ff8585', marginLeft: 8 }]} /><Text style={styles.legendText}>Ocup.</Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          {tables.map(table => (
            <TouchableOpacity 
              key={table.id} 
              style={[styles.gridItem, { backgroundColor: getTableColor(table.available ? 'available' : 'occupied') }]}
              onPress={() => openTableDetails(table)}
            >
              <Text style={styles.gridItemTitle} numberOfLines={1}>{table.name}</Text>
              <Text style={styles.gridItemMeta}>{table.persons} pax</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* TABLE DETAILS MODAL */}
      <Modal visible={!!selectedTable} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTable && (() => {
              const ticket = getTicketForTable(selectedTable.order_id);
              
              return (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{selectedTable.name}</Text>
                    <TouchableOpacity onPress={closeDetails}>
                      <X color="#231e1a" size={24} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ marginBottom: 24 }}>
                    <Text style={styles.infoLabel}>Estado Actual:</Text>
                    <Text style={[styles.infoValue, { color: getTableColor(selectedTable.available ? 'available' : 'occupied') }]}>
                      {selectedTable.available ? 'DISPONIBLE PARA VENTA' : 'OCUPADA'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                    <View>
                      <Text style={styles.infoLabel}>Aforo Total</Text>
                      <Text style={styles.infoValue}>{selectedTable.persons} Personas</Text>
                    </View>
                    <View>
                      <Text style={styles.infoLabel}>Precio Base</Text>
                      <Text style={styles.infoValue}>${selectedTable.price || 0}</Text>
                    </View>
                  </View>

                  {ticket && (
                    <View style={styles.ticketBox}>
                      <Text style={styles.ticketBoxTitle}>Información de Reserva</Text>
                      <Text style={styles.infoLabel}>Comprador:</Text>
                      <Text style={styles.infoValue}>{ticket.buyer_name} {ticket.buyer_phone ? `(${ticket.buyer_phone})` : ''}</Text>
                      
                      <View style={styles.capacityProgress}>
                        <Users color="#686a54" size={20} style={{ marginRight: 8 }} />
                        <Text style={styles.progressText}>
                          Han llegado: {ticket.total_accesos - ticket.accesos_restantes} / {ticket.total_accesos}
                        </Text>
                      </View>

                      {!isViewer && (!selectedTable.available) && (
                        <TouchableOpacity style={styles.revokeBtn} onPress={handleRevoke}>
                          <RotateCcw color="#fff" size={20} style={{ marginRight: 8 }} />
                          <Text style={styles.revokeBtnText}>Liberar Mesa / Reventa</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {!ticket && (
                    <Text style={{ textAlign: 'center', color: '#686a54', marginTop: 20 }}>
                      No hay reservación activa. Puedes asignarla desde la sección Generar QR.
                    </Text>
                  )}
                  
                  {!isViewer && (
                    <TouchableOpacity style={styles.deleteTableBtn} onPress={() => {
                      removeTable(selectedTable.id);
                      closeDetails();
                    }}>
                      <Trash2 color="#ff4d4d" size={20} style={{ marginRight: 8 }} />
                      <Text style={{ color: '#ff4d4d', fontFamily: 'NunitoSans_700Bold' }}>Eliminar Mesa del Sistema</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe9',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    color: '#231e1a',
    fontSize: 18,
    textTransform: 'uppercase',
    fontFamily: 'NunitoSans_700Bold',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#686a54',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  form: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#d9d1c0',
    borderWidth: 1,
    borderColor: '#bdb39b',
    borderRadius: 8,
    color: '#231e1a',
    paddingHorizontal: 16,
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridItemTitle: {
    color: '#231e1a',
    fontSize: 14,
    fontFamily: 'NunitoSans_700Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  gridItemMeta: {
    color: 'rgba(35, 30, 26, 0.7)',
    fontSize: 12,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#f4efe9',
    width: '90%',
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    color: '#231e1a',
    fontFamily: 'NunitoSans_700Bold',
  },
  infoLabel: {
    fontSize: 12,
    color: '#686a54',
    fontFamily: 'NunitoSans_400Regular',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#231e1a',
    fontFamily: 'NunitoSans_700Bold',
  },
  ticketBox: {
    backgroundColor: '#e8e3d5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  ticketBoxTitle: {
    fontSize: 16,
    color: '#231e1a',
    fontFamily: 'NunitoSans_700Bold',
    marginBottom: 12,
  },
  capacityProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d9d1c0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  progressText: {
    color: '#231e1a',
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 14,
  },
  revokeBtn: {
    backgroundColor: '#ff4d4d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  revokeBtnText: {
    color: '#fff',
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 14,
  },
  deleteTableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffdbdb',
    borderRadius: 8,
    backgroundColor: '#fff',
  }
});
