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

    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestión de Personal</Text>
        <Text style={styles.headerSubtitle}>Administra porteros y espectadores</Text>
      </View>
      
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Añadir Miembro</Text>
        <TextInput style={styles.input} placeholder="Nombre Completo" placeholderTextColor="#8b8378" value={newName} onChangeText={setNewName} />
        <View style={[styles.row, { gap: 12, alignItems: 'center' }]}>
          <View style={{ flex: 1 }}>
            <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="Usuario (Login)" placeholderTextColor="#8b8378" autoCapitalize="none" value={newUsername} onChangeText={setNewUsername} />
          </View>
          <View style={{ flex: 1 }}>
            <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="PIN (Password)" placeholderTextColor="#8b8378" keyboardType="numeric" value={newPin} onChangeText={setNewPin} />
          </View>
        </View>
        
        <Text style={styles.label}>Asignar Rol:</Text>
        <View style={[styles.row, { gap: 12, alignItems: 'center' }]}>
          <TouchableOpacity style={[styles.roleBtn, newRole === 'bouncer' && styles.roleBtnActive]} onPress={() => setNewRole('bouncer')}>
            <Text style={[styles.roleText, newRole === 'bouncer' && styles.roleTextActive]}>Portero</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roleBtn, newRole === 'viewer' && styles.roleBtnActive]} onPress={() => setNewRole('viewer')}>
            <Text style={[styles.roleText, newRole === 'viewer' && styles.roleTextActive]}>Espectador</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <UserPlus color="#fff" size={20} />
          <Text style={styles.addBtnText}>Añadir al Equipo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Equipo Actual ({staff.length})</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1a1614" style={{ marginTop: 20 }} />
      ) : (
        <View style={styles.listContainer}>
          {staff.length === 0 ? (
            <Text style={styles.emptyText}>No hay personal registrado.</Text>
          ) : (
            staff.map((member: StaffMember, idx) => (
              <View key={member.id} style={[styles.listItem, idx === staff.length - 1 && { borderBottomWidth: 0 }, !member.is_active && { opacity: 0.5 }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={styles.listItemName}>{member.name}</Text>
                    <View style={[styles.badge, { backgroundColor: member.role === 'bouncer' ? '#1a1614' : '#8b8378' }]}>
                      <Text style={styles.badgeText}>
                        {member.role === 'bouncer' ? 'PORTERO' : 'VIEWER'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <KeyRound color="#8b8378" size={14} />
                    <Text style={styles.listItemMeta}> {member.username} (PIN: {member.pin_hash})</Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Switch
                    value={member.is_active}
                    onValueChange={() => {}}
                    trackColor={{ false: '#f0ebe1', true: '#1a1614' }}
                    thumbColor="#ffffff"
                  />
                  <TouchableOpacity style={styles.actionBtnIcon} onPress={() => {
                    setSelectedStaffForPin(member);
                    setUpdatePinValue('');
                    setPinModalVisible(true);
                  }}>
                    <Edit2 color="#1a1614" size={18} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtnIcon} onPress={() => removeStaff(member)}>
                    <Trash2 color="#ff4d4d" size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* CHANGE PIN MODAL */}
      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
              <TouchableOpacity onPress={() => setPinModalVisible(false)}>
                <X color="#1a1614" size={24} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Nueva contraseña para: {selectedStaffForPin?.name}</Text>
            <TextInput
              style={styles.input}
              placeholder="Nuevo PIN numérico"
              placeholderTextColor="#8b8378"
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
  container: { flex: 1, backgroundColor: '#f8f5f1', paddingHorizontal: 20 },
  header: { marginBottom: 24, marginTop: 8 },
  headerTitle: { color: '#1a1614', fontSize: 28, fontFamily: 'NunitoSans_800ExtraBold', letterSpacing: -0.5 },
  headerSubtitle: { color: '#8b8378', fontSize: 15, fontFamily: 'NunitoSans_600SemiBold', marginTop: 4 },
  sectionHeader: { marginTop: 16, marginBottom: 16 },
  sectionTitle: { color: '#1a1614', fontSize: 18, fontFamily: 'NunitoSans_700Bold', marginBottom: 16 },
  
  formCard: { 
    backgroundColor: '#ffffff', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 24, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.03, 
    shadowRadius: 10, 
    elevation: 2, 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.03)' 
  },
  input: { 
    backgroundColor: '#f8f5f1', 
    borderWidth: 1, 
    borderColor: '#f0ebe1', 
    borderRadius: 12, 
    color: '#1a1614', 
    paddingHorizontal: 16, 
    height: 48, 
    marginBottom: 16, 
    fontFamily: 'NunitoSans_600SemiBold' 
  },
  row: { flexDirection: 'row', marginBottom: 16 },
  label: { color: '#8b8378', fontSize: 13, marginBottom: 8, fontFamily: 'NunitoSans_700Bold' },
  
  roleBtn: { flex: 1, backgroundColor: '#f8f5f1', borderWidth: 1, borderColor: '#f0ebe1', borderRadius: 12, padding: 14, alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#1a1614', borderColor: '#1a1614' },
  roleText: { color: '#8b8378', fontFamily: 'NunitoSans_700Bold' },
  roleTextActive: { color: '#ffffff' },
  
  addBtn: { backgroundColor: '#1a1614', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginTop: 8 },
  addBtnText: { color: '#ffffff', fontFamily: 'NunitoSans_700Bold', marginLeft: 8 },
  
  listContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ebe1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listItemName: { color: '#1a1614', fontSize: 16, fontFamily: 'NunitoSans_700Bold' },
  listItemMeta: { color: '#8b8378', fontSize: 13, fontFamily: 'NunitoSans_600SemiBold' },
  
  badge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontFamily: 'NunitoSans_800ExtraBold', color: '#fff', letterSpacing: 0.5 },
  
  actionBtnIcon: { padding: 10, borderRadius: 10, backgroundColor: '#f8f5f1' },
  deleteBtnIcon: { padding: 10, borderRadius: 10, backgroundColor: '#fff0f0' },
  emptyText: { color: '#8b8378', fontSize: 15, fontFamily: 'NunitoSans_600SemiBold', textAlign: 'center', padding: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#f8f5f1', width: '90%', padding: 24, borderRadius: 24 },
  modalTitle: { fontSize: 22, color: '#1a1614', fontFamily: 'NunitoSans_800ExtraBold', letterSpacing: -0.5 },
});
