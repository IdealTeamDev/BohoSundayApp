import os

file_path = "src/app/(staff)/bouncer/attendees.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add imports
imports_to_add = """import { Search, CheckCircle, MessageCircle, Share2, X } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Linking, Platform, Image } from 'react-native';"""

content = content.replace("import { Search, CheckCircle } from 'lucide-react-native';", imports_to_add)

# Add states
states_to_add = """  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [editPhone, setEditPhone] = useState('');"""

content = content.replace("const [checkInQty, setCheckInQty] = useState(1);", "const [checkInQty, setCheckInQty] = useState(1);\n" + states_to_add)

# Add functions
functions_to_add = """
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
        await Sharing.shareAsync(uri, { dialogTitle: 'Compartir Código QR', mimeType: 'image/png', UTI: 'public.png' });
      } else {
        Alert.alert('Error', 'No se puede compartir en este dispositivo');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Hubo un problema al compartir el QR: ' + e.message);
    }
  };
"""

content = content.replace("const confirmCheckIn = async () => {", functions_to_add + "\n  const confirmCheckIn = async () => {")

# Make card clickable
content = content.replace("<View style={[styles.card,", "<TouchableOpacity onPress={() => openQrModal(item)} style={[styles.card,")
content = content.replace("</View>\n          );\n        }}\n      />", "</TouchableOpacity>\n          );\n        }}\n      />")


# Add modal JSX
modal_jsx = """
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
"""

content = content.replace("{/* Modal Check-in Manual */}", modal_jsx + "\n      {/* Modal Check-in Manual */}")

# Add modal styles
styles_to_add = """
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
"""

content = content.replace("modalContent: {", styles_to_add + "  modalContent: {")

with open(file_path, "w") as f:
    f.write(content)
