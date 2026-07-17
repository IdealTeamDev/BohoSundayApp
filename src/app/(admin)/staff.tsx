import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, ActivityIndicator, Alert, Modal, Platform, useWindowDimensions } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { Redirect } from 'expo-router';
import { UserPlus, Trash2, KeyRound, Edit2, X } from 'lucide-react-native';
import { StaffMember } from '../../types';
import { useDatabaseStore } from '../../store/useDatabaseStore';

export default function StaffManagerScreen() {
  const { user } = useAuthStore();
  const { staff, syncAll, addStaff, removeStaff, updateStaffPin, toggleStaffStatus } = useDatabaseStore();
  
  const [loading, setLoading] = useState(false);
  const [filterRole, setFilterRole] = useState<'all' | 'bouncer' | 'viewer'>('all');
  
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  
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
      await syncAll();
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
        await addStaff(newName, newUsername, newPin, newRole);
        setNewName('');
        setNewUsername('');
        setNewPin('');
        Alert.alert('Éxito', 'Usuario creado correctamente');
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    } else {
      Alert.alert('Error', 'Todos los campos son obligatorios');
    }
  };

  const handleRemoveStaff = async (member: StaffMember) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`¿Estás seguro de que deseas eliminar a ${member.name}?`);
      if (confirm) {
        try {
          await removeStaff(member.id);
          window.alert('Éxito: Usuario eliminado correctamente');
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
              await removeStaff(member.id);
              Alert.alert('Éxito', 'Usuario eliminado correctamente');
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
            await updateStaffPin(selectedStaffForPin.id, updatePinValue);
            setPinModalVisible(false);
            setUpdatePinValue('');
            setSelectedStaffForPin(null);
            window.alert('Éxito: Contraseña actualizada correctamente');
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
                await updateStaffPin(selectedStaffForPin.id, updatePinValue);
                setPinModalVisible(false);
                setUpdatePinValue('');
                setSelectedStaffForPin(null);
                Alert.alert('Éxito', 'Contraseña actualizada correctamente');
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40, paddingTop: 10, maxWidth: isDesktop ? 1200 : '100%', alignSelf: 'center', width: '100%' }}>
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

      <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }]}>
        <Text style={styles.sectionTitle}>Equipo Actual ({staff.length})</Text>
        <View style={{ flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: '#f0ebe1' }}>
          <TouchableOpacity 
            style={[styles.filterTab, filterRole === 'all' && styles.filterTabActive]}
            onPress={() => setFilterRole('all')}
          >
            <Text style={[styles.filterTabText, filterRole === 'all' && styles.filterTabTextActive]}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterTab, filterRole === 'bouncer' && styles.filterTabActive]}
            onPress={() => setFilterRole('bouncer')}
          >
            <Text style={[styles.filterTabText, filterRole === 'bouncer' && styles.filterTabTextActive]}>Porteros</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterTab, filterRole === 'viewer' && styles.filterTabActive]}
            onPress={() => setFilterRole('viewer')}
          >
            <Text style={[styles.filterTabText, filterRole === 'viewer' && styles.filterTabTextActive]}>Viewers</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1a1614" style={{ marginTop: 20 }} />
      ) : (
        <View style={[styles.listContainer, isDesktop && { flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 0, backgroundColor: 'transparent', borderWidth: 0, elevation: 0 }]}>
          {staff.length === 0 ? (
            <Text style={styles.emptyText}>No hay personal registrado.</Text>
          ) : (
            staff.filter(member => filterRole === 'all' || member.role === filterRole).map((member: StaffMember, idx) => (
              <View 
                key={member.id} 
                style={[
                  styles.listItem, 
                  idx === staff.length - 1 && !isDesktop && { borderBottomWidth: 0 }, 
                  !member.is_active && { opacity: 0.5 },
                  isDesktop && { width: '31%', borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)' }
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listItemName, { fontSize: 18, marginBottom: 4 }]}>{member.username}</Text>
                  <View style={{ marginBottom: 6, flexDirection: 'row' }}>
                    <View style={[styles.badge, { marginLeft: 0, backgroundColor: member.role === 'admin' ? '#c89d71' : member.role === 'bouncer' ? '#1a1614' : '#8b8378' }]}>
                      <Text style={styles.badgeText}>
                        {member.role === 'admin' ? 'ADMIN' : member.role === 'bouncer' ? 'PORTERO' : 'VIEWER'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.listItemMeta, { fontSize: 14 }]}>{member.name}</Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                  <Switch
                    value={member.is_active}
                    onValueChange={() => toggleStaffStatus(member.id)}
                    trackColor={{ false: '#f0ebe1', true: '#1a1614' }}
                    thumbColor="#ffffff"
                    style={{ transform: [{ scale: 0.8 }] }}
                  />
                  <TouchableOpacity style={[styles.actionBtnIcon, { marginLeft: 8 }]} onPress={() => {
                    setSelectedStaffForPin(member);
                    setUpdatePinValue('');
                    setPinModalVisible(true);
                  }}>
                    <Edit2 color="#1a1614" size={18} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.deleteBtnIcon, { marginLeft: 8 }]} onPress={() => handleRemoveStaff(member)}>
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
  container: { flex: 1, backgroundColor: '#f4efe9', paddingHorizontal: 20 },
  header: { marginBottom: 24, marginTop: 16 },
  headerTitle: { color: '#231e1a', fontSize: 28, fontFamily: 'NunitoSans_700Bold', letterSpacing: -0.5 },
  headerSubtitle: { color: '#bdb39b', fontSize: 15, fontFamily: 'NunitoSans_600SemiBold', marginTop: 4 },
  sectionHeader: { marginTop: 16, marginBottom: 16 },
  sectionTitle: { color: '#231e1a', fontSize: 18, fontFamily: 'NunitoSans_700Bold', marginBottom: 0 },
  
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  filterTabActive: { backgroundColor: '#686a54' },
  filterTabText: { color: '#bdb39b', fontSize: 13, fontFamily: 'NunitoSans_700Bold' },
  filterTabTextActive: { color: '#f4efe9' },
  
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
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#f0ebe1', 
    borderRadius: 12, 
    color: '#231e1a', 
    paddingHorizontal: 16, 
    height: 48, 
    marginBottom: 16, 
    fontFamily: 'NunitoSans_600SemiBold' 
  },
  row: { flexDirection: 'row', marginBottom: 16 },
  label: { color: '#bdb39b', fontSize: 13, marginBottom: 8, fontFamily: 'NunitoSans_700Bold' },
  
  roleBtn: { flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#f0ebe1', borderRadius: 12, padding: 14, alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#686a54', borderColor: '#1a1614' },
  roleText: { color: '#bdb39b', fontFamily: 'NunitoSans_700Bold' },
  roleTextActive: { color: '#f4efe9' },
  
  addBtn: { backgroundColor: '#686a54', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginTop: 8 },
  addBtnText: { color: '#f4efe9', fontFamily: 'NunitoSans_700Bold', marginLeft: 8 },
  
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
  listItemName: { color: '#231e1a', fontSize: 16, fontFamily: 'NunitoSans_700Bold' },
  listItemMeta: { color: '#bdb39b', fontSize: 13, fontFamily: 'NunitoSans_600SemiBold' },
  
  badge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontFamily: 'NunitoSans_700Bold', color: '#f4efe9', letterSpacing: 0.5 },
  
  actionBtnIcon: { padding: 10, borderRadius: 10, backgroundColor: '#ffffff' },
  deleteBtnIcon: { padding: 10, borderRadius: 10, backgroundColor: '#fff0f0' },
  emptyText: { color: '#bdb39b', fontSize: 15, fontFamily: 'NunitoSans_600SemiBold', textAlign: 'center', padding: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#ffffff', width: '90%', padding: 24, borderRadius: 24 },
  modalTitle: { fontSize: 22, color: '#231e1a', fontFamily: 'NunitoSans_700Bold', letterSpacing: -0.5 },
});
