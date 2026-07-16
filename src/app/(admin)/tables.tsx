import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Trash2, Plus, X, Users, RotateCcw } from 'lucide-react-native';
import { Table } from '../../types';

export default function TablesManagerScreen() {
  const { user } = useAuthStore();
  const isViewer = user?.role === 'viewer';
  const { tables, tickets, revokeTableReservation } = useDatabaseStore();
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const getTableStatus = (table: Table) => {
    if (table.available) return 'available'; // Libre
    const ticket = Object.values(tickets).find(t => t.ticket_id === table.id);
    if (!ticket) return 'blocked'; // Sold/Blocked but no ticket found
    
    if (ticket.accesos_restantes === ticket.total_accesos) {
      return 'reserved';
    }
    return 'occupied';
  };

  const getTableColor = (status: string) => {
    switch (status) {
      case 'available': return '#a3c293'; // Greenish
      case 'reserved': return '#e6c77a'; // Yellowish
      case 'blocked': return '#e6c77a'; // Yellowish as well (reserved manually)
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
      if (Platform.OS === 'web') {
        const confirmed = window.confirm('¿Estás seguro de que quieres liberar esta mesa? El código QR asociado quedará invalidado y la mesa se podrá revender.');
        if (confirmed) {
          revokeTableReservation(selectedTable.id);
          closeDetails();
        }
      } else {
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
    }
  };

  const getTicketForTable = (tableId: string) => {
    return Object.values(tickets).find(t => t.ticket_id === tableId) || null;
  };

  // Sort tables by zone and then number for a cleaner UI grid
  const sortedTables = [...tables].sort((a, b) => {
    if (a.zone !== b.zone) {
      return (a.zone || '').localeCompare(b.zone || '');
    }
    // Extract number from id (e.g. oasis-10 vs oasis-2)
    const numA = parseInt(a.id.split('-').pop() || '0', 10);
    const numB = parseInt(b.id.split('-').pop() || '0', 10);
    return numA - numB;
  });
  // Group tables by zone
  const groupedTables = sortedTables.reduce((acc, table) => {
    const zone = table.zone || 'Otros';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(table);
    return acc;
  }, {} as Record<string, Table[]>);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mapa de Mesas</Text>
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: '#a3c293' }]} /><Text style={styles.legendText}>Libre</Text>
            <View style={[styles.legendDot, { backgroundColor: '#e6c77a', marginLeft: 8 }]} /><Text style={styles.legendText}>Res.</Text>
            <View style={[styles.legendDot, { backgroundColor: '#ff8585', marginLeft: 8 }]} /><Text style={styles.legendText}>Ocup.</Text>
          </View>
        </View>

        {Object.entries(groupedTables).map(([zone, zoneTables]) => (
          <View key={zone} style={styles.zoneSection}>
            <Text style={styles.zoneTitle}>{zone.toUpperCase()} ({zoneTables.length})</Text>
            <View style={styles.gridContainer}>
              {zoneTables.map(table => (
                <TouchableOpacity 
                  key={table.id} 
                  style={styles.gridItem}
                  onPress={() => openTableDetails(table)}
                >
                  <View style={[styles.statusIndicator, { backgroundColor: getTableColor(getTableStatus(table)) }]} />
                  <Text style={styles.gridItemTitle} numberOfLines={1}>{table.name} {table.id.split('-').pop()}</Text>
                  <Text style={styles.gridItemMeta}>{table.persons} pax</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* TABLE DETAILS MODAL */}
      <Modal visible={!!selectedTable} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTable && (() => {
              const ticket = getTicketForTable(selectedTable.id);
              
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
                    <Text style={[styles.infoValue, { color: getTableColor(getTableStatus(selectedTable)) }]}>
                      {getTableStatus(selectedTable) === 'available' ? 'LIBRE (PARA VENTA)' : getTableStatus(selectedTable) === 'reserved' ? 'RESERVADA (ESPERANDO)' : getTableStatus(selectedTable) === 'blocked' ? 'RESERVADA MANUALMENTE (SIN QR)' : 'OCUPADA (EN USO)'}
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
                    </View>
                  )}

                  {!ticket && (
                    <Text style={{ textAlign: 'center', color: '#686a54', marginTop: 20, marginBottom: 16 }}>
                      No hay datos de comprador. Probablemente fue bloqueada manualmente desde la web.
                    </Text>
                  )}

                  {(!isViewer && (getTableStatus(selectedTable) === 'reserved' || getTableStatus(selectedTable) === 'blocked')) && (
                    <TouchableOpacity style={styles.revokeBtn} onPress={handleRevoke}>
                      <RotateCcw color="#fff" size={20} style={{ marginRight: 8 }} />
                      <Text style={styles.revokeBtnText}>Liberar Mesa (Volver a Vender)</Text>
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
    backgroundColor: '#f8f5f1',
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 24,
  },
  title: {
    color: '#1a1614',
    fontSize: 20,
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: -0.5,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    marginLeft: 6,
    color: '#8b8378',
    fontFamily: 'NunitoSans_700Bold',
  },
  zoneSection: {
    marginBottom: 24,
  },
  zoneTitle: {
    fontSize: 16,
    fontFamily: 'NunitoSans_800ExtraBold',
    color: '#8b8378',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  form: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    marginTop: 16,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  input: {
    backgroundColor: '#f8f5f1',
    borderWidth: 1,
    borderColor: '#f0ebe1',
    borderRadius: 10,
    color: '#1a1614',
    paddingHorizontal: 12,
    height: 44,
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: '#1a1614',
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  statusIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gridItemTitle: {
    color: '#1a1614',
    fontSize: 16,
    fontFamily: 'NunitoSans_800ExtraBold',
    textAlign: 'left',
    marginBottom: 4,
    marginTop: 4,
  },
  gridItemMeta: {
    color: '#8b8378',
    fontSize: 13,
    fontFamily: 'NunitoSans_600SemiBold',
    textAlign: 'left',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#f8f5f1',
    width: '90%',
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    color: '#1a1614',
    fontFamily: 'NunitoSans_800ExtraBold',
    letterSpacing: -0.5,
  },
  infoLabel: {
    fontSize: 13,
    color: '#8b8378',
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1614',
    fontFamily: 'NunitoSans_800ExtraBold',
  },
  ticketBox: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f0ebe1',
  },
  ticketBoxTitle: {
    fontSize: 16,
    color: '#1a1614',
    fontFamily: 'NunitoSans_800ExtraBold',
    marginBottom: 16,
  },
  capacityProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f5f1',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  progressText: {
    color: '#1a1614',
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 14,
  },
  revokeBtn: {
    backgroundColor: '#ff4d4d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
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
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff0f0',
  }
});
