import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, Lock, ArrowRight, Fingerprint } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import * as LocalAuthentication from 'expo-local-authentication';
import { User as UserType } from '../../types';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { api } from '../../services/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const { login, deviceId, user } = useAuthStore();
  const router = useRouter();
  const { expoPushToken } = usePushNotifications();

  useEffect(() => {
    checkBiometrics();
    // Auto redirect if already logged in
    if (user) {
      if (user.role === 'admin') router.replace('/(admin)/dashboard');
      else if (user.role === 'bouncer') router.replace('/(staff)/bouncer/scanner');
      else if (user.role === 'viewer1' || user.role === 'viewer2') router.replace('/(admin)/tables');
    }
  }, [user]);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(hasHardware && isEnrolled);
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Ingreso Rápido Boho',
        fallbackLabel: 'Usar PIN',
      });
      if (result.success) {
        // En un entorno real, la biometría estaría ligada a un token seguro
        // Aquí simulamos que el admin entra directamente si su huella pasa
        await executeLogin('admin', '123');
      }
    } catch (e) {
      console.log(e);
    }
  };

  const executeLogin = async (usr: string, pin: string) => {
    setLoading(true);
    setError('');
    
    try {
      const result = await api.login(usr, pin);
      const validUser: UserType = {
        id: result.user.id,
        name: result.user.username,
        role: result.user.role
      };
      
      await login(validUser, result.token, expoPushToken?.data);
      // The useEffect will catch the user state change and redirect
      
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas o acceso revocado.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!username || !password) {
      setError('Por favor, ingresa tu usuario y PIN.');
      return;
    }
    executeLogin(username, password);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Image 
          source={require('../../../assets/images/logo.png')} 
          style={styles.logo} 
        />
        <Text style={styles.subtitle}>STAFF ACCESS</Text>
      </View>

      <View style={styles.form}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <User color="#686a54" size={20} />
          <TextInput
            style={styles.input}
            placeholder="Usuario"
            placeholderTextColor="#bdb39b"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Lock color="#686a54" size={20} />
          <TextInput
            style={styles.input}
            placeholder="PIN"
            placeholderTextColor="#bdb39b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#f4efe9" />
          ) : (
            <Text style={styles.buttonText}>Ingresar</Text>
          )}
          {!loading && <ArrowRight color="#f4efe9" size={20} />}
        </TouchableOpacity>

        {biometricAvailable && (
          <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }} onPress={handleBiometricAuth}>
            <Fingerprint color="#686a54" size={32} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.footer} onPress={() => router.push('/(admin)/dashboard')}>
          <Text style={styles.footerText}>Abrir Panel de Generación de QR (Test)</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4efe9',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#686a54',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#d9d1c0',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#bdb39b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4efe9',
    borderWidth: 1,
    borderColor: '#bdb39b',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    color: '#231e1a',
    marginLeft: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#686a54',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: '#f4efe9',
    fontSize: 16,
    fontFamily: 'NunitoSans_600SemiBold',
    marginRight: 8,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#686a54',
    fontSize: 12,
  }
});
