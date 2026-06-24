import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { Trash2, Plus } from 'lucide-react-native';

export default function TablesManagerScreen() {
  const { tables, addTable, removeTable } = useDatabaseStore();
  const [newTableName, setNewTableName] = useState('');
  const [newCapacity, setNewCapacity] = useState('10');

  const handleAdd = () => {
    if (newTableName.trim() !== '') {
      addTable(newTableName, parseInt(newCapacity) || 10);
      setNewTableName('');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
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
        <View style={{ width: 80, marginRight: 8 }}>
          <TextInput 
            style={styles.input} 
            placeholder="Aforo" 
            placeholderTextColor="#bdb39b" 
            keyboardType="numeric" 
            value={newCapacity} 
            onChangeText={setNewCapacity} 
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Plus color="#f4efe9" size={24} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Mesas Existentes ({tables.length})</Text>

      <FlatList
        data={tables}
        keyExtractor={t => t.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.tableName}>{item.name}</Text>
              <Text style={styles.tableMeta}>Aforo total: {item.capacity} personas</Text>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'available' ? 'rgba(104, 106, 84, 0.2)' : 'rgba(71, 49, 31, 0.2)' }]}>
                 <Text style={[styles.statusText, { color: item.status === 'available' ? '#686a54' : '#47311f' }]}>
                   {item.status.toUpperCase()}
                 </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => removeTable(item.id)} style={styles.deleteBtn}>
              <Trash2 color="#f4efe9" size={20} />
            </TouchableOpacity>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe9',
    padding: 16,
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
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
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
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: '#47311f',
    borderRadius: 8,
  }
});
