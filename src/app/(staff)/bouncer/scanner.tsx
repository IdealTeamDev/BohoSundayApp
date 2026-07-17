import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { api } from '../../../services/api';
import { Users, CheckCircle, XCircle, WifiOff, Wifi } from 'lucide-react-native';
import { useDatabaseStore } from '../../../store/useDatabaseStore';
import { useAuthStore } from '../../../store/useAuthStore';

const { width, height } = Dimensions.get('window');

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState('');
  
  const { user } = useAuthStore();
  const { tickets, processScan, isOnline, offlineQueue } = useDatabaseStore();

  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const prevIsOnline = useRef(isOnline);

  useEffect(() => {
    if (prevIsOnline.current === false && isOnline === true) {
      setShowOnlineBanner(true);
      setTimeout(() => setShowOnlineBanner(false), 4000);
    }
    prevIsOnline.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading || showPartialModal) return;
    setScanned(true);

    let orderId = data;
    // Extract orderId if it's a URL
    if (data.includes('/api/qrs/')) {
      const parts = data.split('/api/qrs/');
      orderId = parts[1].split('?')[0]; // fallback to safely get ID
    }

    setCurrentOrderId(orderId);
    await fetchOrderInfo(orderId);
  };

  const fetchOrderInfo = async (orderId: string) => {
    setLoading(true);
    try {
      const info = tickets[orderId];
      if (!info) {
        showFeedback('error', 'El código QR no existe o es falso.');
        return;
      }
      setOrderInfo(info);
      
      if (info.status !== 'paid') {
        showFeedback('error', 'La orden no está pagada o fue rechazada.');
        return;
      }
      
      if (info.accesos_restantes <= 0) {
        showFeedback('error', 'El ticket ya fue usado o no tiene accesos restantes.');
        return;
      }

      // Show modal to confirm how many people are entering
      setShowPartialModal(true);
      
    } catch (err: any) {
      showFeedback('error', err.message || 'Error al obtener ticket.');
    } finally {
      setLoading(false);
    }
  };

  const processScanTicket = async (count: number) => {
    setShowPartialModal(false);
    setLoading(true);
    try {
      const staffUsername = user?.name || 'Desconocido';
      const res = await processScan(currentOrderId, count, staffUsername);
      if (res.success) {
        const remaining = (orderInfo?.accesos_restantes || count) - count;
        showFeedback('success', `${count} acceso(s) confirmado(s).\nQuedan ${remaining}.`);
      } else {
        showFeedback('error', res.message || 'Error al validar.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error de sistema.');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback(type);
    setMessage(text);
    if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    setTimeout(() => {
      setFeedback(null);
      setScanned(false);
      setOrderInfo(null);
      setCurrentOrderId('');
    }, 3000);
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
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <WifiOff color="#fff" size={16} style={{ marginRight: 8 }} />
          <Text style={styles.offlineText}>
            Sin conexión. {offlineQueue.length > 0 ? `(${offlineQueue.length} escaneos en cola)` : 'Escaneos se guardarán localmente.'}
          </Text>
        </View>
      )}
      {showOnlineBanner && (
        <View style={[styles.offlineBanner, { backgroundColor: '#22c55e' }]}>
          <Wifi color="#fff" size={16} style={{ marginRight: 8 }} />
          <Text style={styles.offlineText}>¡Conexión restaurada! Sincronizando...</Text>
        </View>
      )}
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
        {loading && <ActivityIndicator size="large" color="#eab308" style={{ marginTop: 20 }} />}
      </View>

      {feedback && (
        <View style={[styles.feedbackOverlay, feedback === 'success' ? { backgroundColor: 'rgba(34, 197, 94, 0.95)' } : { backgroundColor: 'rgba(239, 68, 68, 0.95)' }]}>
          {feedback === 'success' ? <CheckCircle color="#fff" size={80} /> : <XCircle color="#fff" size={80} />}
          <Text style={styles.feedbackText}>{message}</Text>
        </View>
      )}

      <Modal visible={showPartialModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Users color="#eab308" size={32} />
              <Text style={styles.modalTitle}>Validar Ingreso</Text>
            </View>
            
            {orderInfo && (
              <View style={styles.infoBox}>
                <Text style={styles.infoName}>{orderInfo.buyer_name}</Text>
                <Text style={styles.infoDesc}>{orderInfo.ticket_name} - {orderInfo.zone}</Text>
                <Text style={styles.modalText}>
                  Capacidad Total: {orderInfo.total_accesos} | Ya ingresaron: {orderInfo.total_accesos - orderInfo.accesos_restantes}
                </Text>
              </View>
            )}

            <Text style={styles.modalHighlight}>¿Cuántos ingresan ahora?</Text>
            
            <View style={styles.numberGrid}>
              {[1,2,3,4,5,6,7,8,9,10].map(num => (
                <TouchableOpacity 
                  key={num} 
                  style={[
                    styles.numBtn,
                    (!orderInfo || num > orderInfo.accesos_restantes) && { opacity: 0.3 }
                  ]}
                  disabled={!orderInfo || num > orderInfo.accesos_restantes}
                  onPress={() => processScanTicket(num)}
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
                setOrderInfo(null);
              }}
            >
              <Text style={styles.cancelText}>Cancelar / Escanear de nuevo</Text>
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
    alignSelf: 'center',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 500 : '100%',
  },
  offlineBanner: {
    backgroundColor: '#ef4444',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    marginTop: 40,
  },
  offlineText: {
    color: '#fff',
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 14,
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
    color: '#f4efe9',
    fontSize: 20,
    fontFamily: 'NunitoSans_600SemiBold',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
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
    paddingBottom: 32,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: '#231e1a', fontSize: 24, fontFamily: 'NunitoSans_600SemiBold', marginBottom: 8 },
  infoBox: {
    backgroundColor: '#f4efe9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoName: {
    fontSize: 18,
    fontFamily: 'NunitoSans_700Bold',
    color: '#231e1a',
  },
  infoDesc: {
    fontSize: 14,
    color: '#686a54',
    marginBottom: 4,
  },
  modalText: {
    color: '#686a54',
    fontSize: 14,
  },
  modalHighlight: {
    color: '#47311f',
    fontSize: 18,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 12,
    textAlign: 'center',
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  numBtn: {
    width: '30%',
    height: 60,
    backgroundColor: '#f4efe9',
    borderRadius: 12,
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
