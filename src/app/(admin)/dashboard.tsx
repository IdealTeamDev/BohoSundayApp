import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { Redirect } from 'expo-router';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Trash2, Plus, QrCode, Edit2, Save, Send } from 'lucide-react-native';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  if (user?.role === 'viewer') return <Redirect href="/(admin)/tables" />;
  
  const { tiers, addTier, removeTier, editTier } = useDatabaseStore();
  const [newTierName, setNewTierName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCapacity, setNewCapacity] = useState('100');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  const handleAddOrEdit = () => {
    if (newTierName.trim() !== '' && newPrice.trim() !== '') {
      if (editingId) {
        editTier(editingId, newTierName, parseFloat(newPrice) || 0, parseInt(newCapacity) || 100);
        setEditingId(null);
      } else {
        addTier(newTierName, parseFloat(newPrice) || 0, parseInt(newCapacity) || 100);
      }
      setNewTierName('');
      setNewPrice('');
      setNewCapacity('100');
    }
  };

  const startEdit = (tier: any) => {
    setEditingId(tier.id);
    setNewTierName(tier.name);
    setNewPrice(tier.price.toString());
    setNewCapacity(tier.capacity.toString());
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastBody) return;
    const { staff, sendPushNotification } = useDatabaseStore.getState();
    const tokens = staff.map(s => s.pushToken).filter(t => t) as string[];
    if (tokens.length > 0) {
      await sendPushNotification(tokens, broadcastTitle, broadcastBody);
      alert('Notificación enviada a ' + tokens.length + ' dispositivo(s)!');
    } else {
      alert('No hay personal con notificaciones activas en este momento.');
    }
    setBroadcastTitle('');
    setBroadcastBody('');
  };

  return (
    <ScrollView ref={scrollViewRef} style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.title}>{editingId ? 'Editando Etapa' : 'Crear Etapa de Venta (Tier)'}</Text>
        
        <View style={styles.form}>
          <TextInput 
            style={styles.input} 
            placeholder="Nombre (Ej. Preventa 1)" 
            placeholderTextColor="#bdb39b" 
            value={newTierName} 
            onChangeText={setNewTierName} 
          />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <TextInput 
                style={styles.input} 
                placeholder="Precio $" 
                placeholderTextColor="#bdb39b" 
                keyboardType="numeric" 
                value={newPrice} 
                onChangeText={setNewPrice} 
              />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <TextInput 
                style={styles.input} 
                placeholder="Aforo" 
                placeholderTextColor="#bdb39b" 
                keyboardType="numeric" 
                value={newCapacity} 
                onChangeText={setNewCapacity} 
              />
            </View>
            <TouchableOpacity style={[styles.addBtn, editingId && { backgroundColor: '#47311f' }]} onPress={handleAddOrEdit}>
              {editingId ? <Save color="#f4efe9" size={24} /> : <Plus color="#f4efe9" size={24} />}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title}>Etapas Existentes ({tiers.length})</Text>

        {tiers.map(item => (
          <View key={item.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tableName}>{item.name}</Text>
              <Text style={styles.tableMeta}>Precio: ${item.price} | Aforo Límite: {item.capacity} personas</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => startEdit(item)} style={[styles.deleteBtn, { backgroundColor: '#686a54' }]}>
                <Edit2 color="#f4efe9" size={20} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeTier(item.id)} style={[styles.deleteBtn, { backgroundColor: '#47311f' }]}>
                <Trash2 color="#f4efe9" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={[styles.mockSection, { marginTop: 10, borderTopWidth: 0 }]}>
          <Text style={styles.title}>Centro de Comunicaciones</Text>
          <View style={styles.form}>
            <TextInput 
              style={styles.input} 
              placeholder="Título (Ej. Atención Porteros)" 
              placeholderTextColor="#bdb39b" 
              value={broadcastTitle} 
              onChangeText={setBroadcastTitle} 
            />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Mensaje a transmitir..." 
                  placeholderTextColor="#bdb39b" 
                  value={broadcastBody} 
                  onChangeText={setBroadcastBody} 
                />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={handleBroadcast}>
                <Send color="#f4efe9" size={24} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.mockSection}>
          <Text style={styles.title}>Códigos de Prueba</Text>
          <Text style={styles.tableMeta}>Usa estos códigos para apuntar con la cámara del teléfono del portero.</Text>
          
          <View style={styles.qrRow}>
            <View style={styles.qrItem}>
              <Image source={{ uri: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=tick_group_1' }} style={{ width: 100, height: 100, marginBottom: 8 }} />
              <Text style={styles.qrText}>tick_group_1</Text>
            </View>
            <View style={styles.qrItem}>
              <Image source={{ uri: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=tick_single_1' }} style={{ width: 100, height: 100, marginBottom: 8 }} />
              <Text style={styles.qrText}>tick_single_1</Text>
            </View>
            <View style={styles.qrItem}>
              <Image source={{ uri: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=tick_vip_1' }} style={{ width: 100, height: 100, marginBottom: 8 }} />
              <Text style={styles.qrText}>tick_vip_1</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe9',
  },
  content: {
    padding: 24,
  },
  title: {
    color: '#231e1a',
    fontSize: 18,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 16,
    marginTop: 8,
    textTransform: 'uppercase',
    fontFamily: 'NunitoSans_400Regular',
  },
  form: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#d9d1c0',
    borderWidth: 1,
    borderColor: '#bdb39b',
    borderRadius: 8,
    color: '#231e1a',
    paddingHorizontal: 8,
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
  card: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#bdb39b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableName: {
    color: '#231e1a',
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
    marginBottom: 4,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  tableMeta: {
    color: '#686a54',
    fontSize: 12,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
  },
  mockSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: '#bdb39b',
  },
  qrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 40,
  },
  qrItem: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#bdb39b',
  },
  qrText: {
    color: '#686a54',
    fontSize: 10,
    marginTop: 8,
    fontFamily: 'NunitoSans_600SemiBold',
    fontFamily: 'NunitoSans_400Regular',
  }
});
