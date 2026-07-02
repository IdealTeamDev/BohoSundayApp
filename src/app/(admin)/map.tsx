import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapComponent from '../../components/MapComponent';

export default function AdminMapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapa de Mesas</Text>
      <MapComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe9',
  },
  title: {
    color: '#231e1a',
    fontSize: 18,
    fontFamily: 'NunitoSans_600SemiBold',
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
  }
});
