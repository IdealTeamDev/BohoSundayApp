import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  deviceId: string | null;
  loginTime: number | null;
  isBiometricEnabled: boolean;
  login: (user: User, token: string, pushToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  checkSession: () => boolean;
}

const SESSION_TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  deviceId: null,
  loginTime: null,
  isBiometricEnabled: false,

  login: async (user, token, pushToken) => {
    const loginTime = Date.now();
    // Simulate unique device generation per install
    const deviceId = Math.random().toString(36).substring(2, 15);
    const updatedUser = { ...user, pushToken };
    set({ user: updatedUser, token, deviceId, loginTime });
    await AsyncStorage.multiSet([
      ['@auth_user', JSON.stringify(updatedUser)],
      ['@auth_token', token],
      ['@auth_device', deviceId],
      ['@auth_time', loginTime.toString()],
    ]);
  },

  logout: async () => {
    set({ user: null, token: null, deviceId: null, loginTime: null });
    await AsyncStorage.multiRemove(['@auth_user', '@auth_token', '@auth_device', '@auth_time']);
  },

  enableBiometric: async () => {
    set({ isBiometricEnabled: true });
    await AsyncStorage.setItem('@auth_biometric', 'true');
  },

  checkSession: () => {
    const { loginTime } = get();
    if (!loginTime) return false;
    
    const now = Date.now();
    if (now - loginTime > SESSION_TIMEOUT) {
      get().logout();
      return false;
    }
    return true;
  }
}));
