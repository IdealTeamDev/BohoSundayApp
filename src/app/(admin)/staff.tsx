import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Redirect } from 'expo-router';
import { UserPlus, Trash2, KeyRound } from 'lucide-react-native';
import { StaffMember } from '../../types';

export default function StaffManagerScreen() {
  const { user } = useAuthStore();
  if (user?.role === 'viewer') return <Redirect href="/(admin)/tables" />;

  const { staff, addStaff, toggleStaffStatus, removeStaff } = useDatabaseStore();
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<'bouncer' | 'waiter' | 'viewer'>('bouncer');

  const handleAdd = () => {
    if (newName.trim() !== '' && newUsername.trim() !== '' && newPin.trim() !== '') {
      addStaff(newName, newUsername, newPin, newRole);
      setNewName('');
      setNewUsername('');
      setNewPin('');
    }
  };

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
          <TouchableOpacity style={[styles.roleBtn, { marginRight: 12 }, newRole === 'waiter' && styles.roleBtnActive]} onPress={() => setNewRole('waiter')}>
            <Text style={[styles.roleText, newRole === 'waiter' && styles.roleTextActive]}>Mesero</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roleBtn, newRole === 'viewer' && styles.roleBtnActive]} onPress={() => setNewRole('viewer')}>
            <Text style={[styles.roleText, newRole === 'viewer' && styles.roleTextActive]}>Visualizador</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <UserPlus color="#f4efe9" size={20} />
          <Text style={styles.addBtnText}>Añadir al Equipo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Equipo Actual ({staff.length})</Text>

      {staff.map((member: StaffMember) => (
        <View key={member.id} style={[styles.card, !member.isActive && { opacity: 0.5 }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.name}>{member.name}</Text>
              <View style={[styles.badge, { backgroundColor: member.role === 'bouncer' ? '#686a54' : member.role === 'viewer' ? '#4a5568' : '#47311f' }]}>
                <Text style={styles.badgeText}>
                  {member.role === 'bouncer' ? 'PORTERO' : member.role === 'viewer' ? 'VISUALIZADOR' : 'MESERO'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <KeyRound color="#686a54" size={14} />
              <Text style={styles.meta}> {member.username} (PIN: {member.pin})</Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Switch
              value={member.isActive}
              onValueChange={() => toggleStaffStatus(member.id)}
              trackColor={{ false: '#bdb39b', true: '#47311f' }}
              thumbColor="#f4efe9"
            />
            <TouchableOpacity onPress={() => removeStaff(member.id)}>
              <Trash2 color="#47311f" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4efe9', padding: 16 },
  title: { color: '#231e1a', fontSize: 18, fontFamily: 'NunitoSans_600SemiBold', marginBottom: 16, marginTop: 8, textTransform: 'uppercase', fontFamily: 'NunitoSans_400Regular' },
  formCard: { backgroundColor: 'transparent', borderRadius: 8, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: '#bdb39b' },
  input: { backgroundColor: '#f4efe9', borderWidth: 1, borderColor: '#bdb39b', borderRadius: 8, color: '#231e1a', paddingHorizontal: 16, height: 50, marginBottom: 12, fontFamily: 'NunitoSans_400Regular' },
  row: { flexDirection: 'row', marginBottom: 12, gap: 12 },
  label: { color: '#686a54', fontSize: 12, marginBottom: 8, fontFamily: 'NunitoSans_600SemiBold' },
  roleBtn: { flex: 1, backgroundColor: '#f4efe9', borderWidth: 1, borderColor: '#bdb39b', borderRadius: 8, padding: 12, alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#686a54', borderColor: '#686a54' },
  roleText: { color: '#686a54', fontFamily: 'NunitoSans_600SemiBold' },
  roleTextActive: { color: '#f4efe9' },
  addBtn: { backgroundColor: '#47311f', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 8, marginTop: 8 },
  addBtnText: { color: '#f4efe9', fontFamily: 'NunitoSans_600SemiBold', marginLeft: 8, fontFamily: 'NunitoSans_600SemiBold' },
  card: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#bdb39b', borderRadius: 8, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#231e1a', fontSize: 16, fontFamily: 'NunitoSans_600SemiBold', fontFamily: 'NunitoSans_600SemiBold' },
  badge: { marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontFamily: 'NunitoSans_600SemiBold' },
  meta: { color: '#686a54', fontSize: 12 }
});
