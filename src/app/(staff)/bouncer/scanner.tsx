import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../../store/useAuthStore';
import { useDatabaseStore } from '../../../store/useDatabaseStore';
import { LogOut, WifiOff, Users, CheckCircle, XCircle, PlusCircle } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');
  
  const { user } = useAuthStore();
  const { processScan, isAirplaneMode, tiers, sellWalkInTicket, tickets } = useDatabaseStore();

  const [showWalkIn, setShowWalkIn] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string>('');
  const [walkInCapacity, setWalkInCapacity] = useState('1');
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [currentQr, setCurrentQr] = useState('');
  const [ticketCapacity, setTicketCapacity] = useState(0);
  const [ticketUsed, setTicketUsed] = useState(0);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setCurrentQr(data);

    const ticket = tickets[data];
    if (ticket && ticket.capacity > 1 && ticket.used < ticket.capacity) {
      setTicketCapacity(ticket.capacity);
      setTicketUsed(ticket.used);
      setShowPartialModal(true);
    } else {
      processScanTicket(data, 1);
    }
  };

  const processScanTicket = async (qrCode: string, count: number) => {
    setShowPartialModal(false);
    const result = await processScan(qrCode, count);
    
    setFeedback(result.success ? 'success' : 'error');
    setMessage(result.message);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const { tickets, tables, staff, sendPushNotification } = useDatabaseStore.getState();
      const ticket = tickets[qrCode];
      if (ticket && ticket.tableId) {
        const table = tables.find(t => t.id === ticket.tableId);
        if (table) {
          const waiterTokens = staff
            .filter(s => s.role === 'waiter' && s.pushToken)
            .map(s => s.pushToken!);
          if (waiterTokens.length > 0) {
            sendPushNotification(
              waiterTokens, 
              `¡Mesa ${table.name} en Puerta! 🍾`, 
              `El cliente ${ticket.buyerName} acaba de ingresar con ${count} personas.`
            );
          }
        }
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setTimeout(() => {
      setFeedback(null);
      setScanned(false);
    }, 2000);
  };

  const handleWalkIn = () => {
    if (selectedTierId) {
      sellWalkInTicket(selectedTierId, parseInt(walkInCapacity) || 1);
      setShowWalkIn(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFeedback('success');
      setMessage(`Venta manual: ${walkInCapacity} pase(s)`);
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'white' }}>Necesitamos acceso a la cámara</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      <View style={styles.targetContainer}>
        {!scanned && <View style={styles.targetBox} />}
      </View>

      {feedback && (
        <View style={[styles.feedbackOverlay, feedback === 'success' ? { backgroundColor: 'rgba(34, 197, 94, 0.95)' } : { backgroundColor: 'rgba(239, 68, 68, 0.95)' }]}>
          {feedback === 'success' ? <CheckCircle color="#fff" size={80} /> : <XCircle color="#fff" size={80} />}
          <Text style={styles.feedbackText}>{message}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowWalkIn(true)}>
        <PlusCircle color="#000" size={24} />
        <Text style={styles.fabText}>Venta Físicamente</Text>
      </TouchableOpacity>

      <Modal visible={showWalkIn} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Venta en Taquilla</Text>
            <Text style={styles.modalDesc}>Registra el pago físico y el ingreso inmediato.</Text>

            <View style={styles.tierSelector}>
              {tiers.map(t => (
                <TouchableOpacity 
                  key={t.id} 
                  style={[styles.tierBtn, selectedTierId === t.id && styles.tierBtnActive]}
                  onPress={() => setSelectedTierId(t.id)}
                >
                  <Text style={[styles.tierBtnText, selectedTierId === t.id && { color: '#f4efe9' }]}>{t.name} (${t.price})</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 }}>
              <Text style={{ color: '#231e1a', fontSize: 16 }}>Nº Personas:</Text>
              <TouchableOpacity onPress={() => setWalkInCapacity(String(Math.max(1, parseInt(walkInCapacity)-1)))} style={styles.qtyBtn}>
                <Text style={{ color: '#231e1a', fontSize: 20 }}>-</Text>
              </TouchableOpacity>
              <Text style={{ color: '#231e1a', fontSize: 20, fontFamily: 'NunitoSans_600SemiBold' }}>{walkInCapacity}</Text>
              <TouchableOpacity onPress={() => setWalkInCapacity(String(parseInt(walkInCapacity)+1))} style={styles.qtyBtn}>
                <Text style={{ color: '#231e1a', fontSize: 20 }}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f4efe9', borderWidth: 1, borderColor: '#bdb39b' }]} onPress={() => setShowWalkIn(false)}>
                <Text style={{ color: '#686a54', fontFamily: 'NunitoSans_600SemiBold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#686a54' }]} onPress={handleWalkIn}>
                <Text style={{ color: '#f4efe9', fontFamily: 'NunitoSans_600SemiBold' }}>Confirmar Venta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPartialModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Users color="#eab308" size={32} />
              <Text style={styles.modalTitle}>Grupo Detectado</Text>
            </View>
            <Text style={styles.modalText}>
              Capacidad: {ticketCapacity} | Ya ingresaron: {ticketUsed}
            </Text>
            <Text style={styles.modalHighlight}>¿Cuántos ingresan ahora?</Text>
            
            <View style={styles.numberGrid}>
              {[1,2,3,4,5,6,7,8,9,10].map(num => (
                <TouchableOpacity 
                  key={num} 
                  style={[
                    styles.numBtn,
                    num > ticketCapacity - ticketUsed && { opacity: 0.3 }
                  ]}
                  disabled={num > ticketCapacity - ticketUsed}
                  onPress={() => processScanTicket(currentQr, num)}
                >
                  <Text style={styles.numText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.cancelBtn}
              onPress={() => {
                setShowPartialModal(false);
                setScanned(false);
              }}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
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
  camera: {
    flex: 1,
  },
  targetContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#eab308',
    borderRadius: 24,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  feedbackText: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'NunitoSans_600SemiBold',
    marginTop: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#686a54',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  fabText: {
    color: '#f4efe9',
    fontFamily: 'NunitoSans_600SemiBold',
    marginLeft: 8,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    backgroundColor: '#d9d1c0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: '#231e1a', fontSize: 24, fontFamily: 'NunitoSans_600SemiBold', marginBottom: 8 },
  modalDesc: { color: '#686a54', fontSize: 14, marginBottom: 24 },
  modalText: {
    color: '#686a54',
    fontSize: 16,
  },
  modalHighlight: {
    color: '#47311f',
    fontSize: 24,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 24,
  },
  tierSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  tierBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#bdb39b', backgroundColor: '#f4efe9' },
  tierBtnActive: { backgroundColor: '#686a54', borderColor: '#686a54' },
  tierBtnText: { color: '#686a54', fontFamily: 'NunitoSans_600SemiBold' },
  qtyBtn: { backgroundColor: '#f4efe9', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bdb39b' },
  actionBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  numBtn: {
    width: '30%',
    backgroundColor: '#f4efe9',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bdb39b',
  },
  numText: {
    color: '#231e1a',
    fontSize: 24,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  cancelBtn: {
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: '#ef4444',
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
  }
});
