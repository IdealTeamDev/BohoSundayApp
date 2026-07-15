import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, ActivityIndicator, Alert, Modal, Platform } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { Redirect } from 'expo-router';
import { UserPlus, Trash2, KeyRound, Edit2, X } from 'lucide-react-native';
import { StaffMember } from '../../types';
import { api } from '../../services/api';

export default function StaffManagerScreen() {
  const { user } = useAuthStore();
  
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<'bouncer' | 'viewer'>('bouncer');

  // Change PIN state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<StaffMember | null>(null);
  const [updatePinValue, setUpdatePinValue] = useState('');

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await api.getStaff();
      setStaff(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo cargar el equipo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleAdd = async () => {
    if (newName.trim() !== '' && newUsername.trim() !== '' && newPin.trim() !== '') {
      try {
        await api.addStaff({ name: newName, username: newUsername, pin: newPin, role: newRole });
        setNewName('');
        setNewUsername('');
        setNewPin('');
        Alert.alert('Éxito', 'Usuario creado correctamente');
        loadStaff();
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    } else {
      Alert.alert('Error', 'Todos los campos son obligatorios');
    }
  };

  const removeStaff = async (member: StaffMember) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`¿Estás seguro de que deseas eliminar a ${member.name}?`);
      if (confirm) {
        try {
          await api.deleteStaff(member.id);
          window.alert('Éxito: Usuario eliminado correctamente');
          loadStaff();
        } catch (e: any) {
          window.alert('Error: ' + e.message);
        }
      }
      return;
    }

    Alert.alert(
      'Confirmar Eliminación',
      `¿Estás seguro de que deseas eliminar a ${member.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteStaff(member.id);
              Alert.alert('Éxito', 'Usuario eliminado correctamente');
              loadStaff();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  const handleUpdatePin = async () => {
    if (selectedStaffForPin && updatePinValue.trim() !== '') {
      if (Platform.OS === 'web') {
        const confirm = window.confirm(`¿Estás seguro de que deseas cambiar la contraseña de ${selectedStaffForPin.name}?`);
        if (confirm) {
          try {
            await api.updateStaffPin(selectedStaffForPin.id, updatePinValue);
            setPinModalVisible(false);
            setUpdatePinValue('');
            setSelectedStaffForPin(null);
            window.alert('Éxito: Contraseña actualizada correctamente');
            loadStaff();
          } catch (e: any) {
            window.alert('Error: ' + e.message);
          }
        }
        return;
      }

      Alert.alert(
        'Confirmar Cambio',
        `¿Estás seguro de que deseas cambiar la contraseña de ${selectedStaffForPin.name}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cambiar',
            style: 'default',
            onPress: async () => {
              try {
                await api.updateStaffPin(selectedStaffForPin.id, updatePinValue);
                setPinModalVisible(false);
                setUpdatePinValue('');
                setSelectedStaffForPin(null);
                Alert.alert('Éxito', 'Contraseña actualizada correctamente');
                loadStaff();
              } catch (e: any) {
                Alert.alert('Error', e.message);
              }
            }
          }
        ]
      );
    } else {
      if (Platform.OS === 'web') {
        window.alert('Error: Debes ingresar una nueva contraseña');
      } else {
        Alert.alert('Error', 'Debes ingresar una nueva contraseña');
      }
    }
  };

  if (user?.role === 'viewer') return <Redirect href="/(admin)/tables" />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Crear Empleado</Text>
      
      <View style={styles.formCard}>
        <TextInput style={styles.input} placeholder="Nombre Completo" placeholderTextColor="#bdb39b" value={newName} onChangeText={setNewName} />
        <View style={[styles.row, { gap: 0, alignItems: 'center' }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="Usuario (Login)" placeholderTextColor="#bdb39b" autoCapitalize="none" value={newUsername} onChangeText={setNewUsername} />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="PIN (Password)" placeholderTextColor="#bdb39b" keyboardType="numeric" value={newPin} onChangeText={setNewPin} />
          </View>
        </View>
        
        <Text style={styles.label}>Asignar Rol:</Text>
        <View style={[styles.row, { gap: 0, alignItems: 'center' }]}>
          <TouchableOpacity style={[styles.roleBtn, { marginRight: 12 }, newRole === 'bouncer' && styles.roleBtnActive]} onPress={() => setNewRole('bouncer')}>
            <Text style={[styles.roleText, newRole === 'bouncer' && styles.roleTextActive]}>Portero</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roleBtn, { marginRight: 12 }, newRole === 'viewer' && styles.roleBtnActive]} onPress={() => setNewRole('viewer')}>
            <Text style={[styles.roleText, newRole === 'viewer' && styles.roleTextActive]}>Viewer</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <UserPlus color="#f4efe9" size={20} />
          <Text style={styles.addBtnText}>Añadir al Equipo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Equipo Actual ({staff.length})</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#47311f" />
      ) : (
        staff.map((member: StaffMember) => (
        <View key={member.id} style={[styles.card, !member.is_active && { opacity: 0.5 }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.name}>{member.name}</Text>
              <View style={[styles.badge, { backgroundColor: member.role === 'bouncer' ? '#686a54' : '#4a5568' }]}>
                <Text style={styles.badgeText}>
                  {member.role === 'bouncer' ? 'PORTERO' : 'VIEWER'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <KeyRound color="#686a54" size={14} />
              <Text style={styles.meta}> {member.username} (PIN: {member.pin_hash})</Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Switch
              value={member.is_active}
              onValueChange={() => {}}
              trackColor={{ false: '#bdb39b', true: '#47311f' }}
              thumbColor="#f4efe9"
            />
            <TouchableOpacity onPress={() => {
              setSelectedStaffForPin(member);
              setUpdatePinValue('');
              setPinModalVisible(true);
            }}>
              <Edit2 color="#686a54" size={20} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeStaff(member)}>
              <Trash2 color="#47311f" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      )))}
      <View style={{ height: 40 }} />

      {/* CHANGE PIN MODAL */}
      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.title}>Cambiar Contraseña</Text>
              <TouchableOpacity onPress={() => setPinModalVisible(false)}>
                <X color="#231e1a" size={24} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Nueva contraseña para: {selectedStaffForPin?.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Nuevo PIN numérico"
              placeholderTextColor="#bdb39b"
              keyboardType="numeric"
              value={updatePinValue}
              onChangeText={setUpdatePinValue}
              secureTextEntry
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleUpdatePin}>
              <Text style={styles.addBtnText}>Guardar Contraseña</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4efe9', padding: 16 },
  title: { color: '#231e1a', fontSize: 18, fontFamily: 'NunitoSans_600SemiBold', marginBottom: 16, marginTop: 8, textTransform: 'uppercase' },
  formCard: { backgroundColor: 'transparent', borderRadius: 8, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: '#bdb39b' },
  input: { backgroundColor: '#f4efe9', borderWidth: 1, borderColor: '#bdb39b', borderRadius: 8, color: '#231e1a', paddingHorizontal: 16, height: 50, marginBottom: 12, fontFamily: 'NunitoSans_400Regular' },
  row: { flexDirection: 'row', marginBottom: 12, gap: 12 },
  label: { color: '#686a54', fontSize: 12, marginBottom: 8, fontFamily: 'NunitoSans_600SemiBold' },
  roleBtn: { flex: 1, backgroundColor: '#f4efe9', borderWidth: 1, borderColor: '#bdb39b', borderRadius: 8, padding: 12, alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#686a54', borderColor: '#686a54' },
  roleText: { color: '#686a54', fontFamily: 'NunitoSans_600SemiBold' },
  roleTextActive: { color: '#f4efe9' },
  addBtn: { backgroundColor: '#47311f', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 8, marginTop: 8 },
  addBtnText: { color: '#f4efe9', fontFamily: 'NunitoSans_600SemiBold', marginLeft: 8 },
  card: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#bdb39b', borderRadius: 8, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#231e1a', fontSize: 16, fontFamily: 'NunitoSans_600SemiBold' },
  badge: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontFamily: 'NunitoSans_600SemiBold' },
  meta: { color: '#686a54', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#f4efe9', width: '85%', padding: 24, borderRadius: 16 }
});
