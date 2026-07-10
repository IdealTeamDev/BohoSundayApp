import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LogOut } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutConfirmModal({ visible, onConfirm, onCancel }: Props) {
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const [internalVisible, setInternalVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start(() => {
        setInternalVisible(false);
      });
    }
  }, [visible]);

  return (
    <Modal transparent visible={internalVisible} animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[styles.overlay, { opacity: opacityValue }]}>
        <Animated.View style={[styles.dialog, { transform: [{ scale: scaleValue }] }]}>
          <View style={styles.iconContainer}>
            <LogOut color="#ef4444" size={32} />
          </View>
          <Text style={styles.title}>¿Cerrar Sesión?</Text>
          <Text style={styles.subtitle}>Estás a punto de salir de tu cuenta.</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={onConfirm}>
              <Text style={styles.confirmText}>Sí, salir</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(35, 30, 26, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#f4efe9',
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bdb39b',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    color: '#231e1a',
    marginBottom: 8,
    fontFamily: 'NunitoSans_600SemiBold',
  },
  subtitle: {
    fontSize: 14,
    color: '#686a54',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'NunitoSans_400Regular',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#d9d1c0',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  cancelText: {
    color: '#47311f',
    fontFamily: 'NunitoSans_600SemiBold',
  },
  confirmText: {
    color: '#ffffff',
    fontFamily: 'NunitoSans_600SemiBold',
  }
});
