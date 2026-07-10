import { useAuthStore } from '../store/useAuthStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://bohosunday.com/api';
const ADMIN_SECRET = process.env.EXPO_PUBLIC_ADMIN_SECRET || '';

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    'x-admin-token': token || ADMIN_SECRET,
    'Content-Type': 'application/json'
  };
};

export interface AdminStats {
  totalRevenue: number;
  totalSold: number;
  totalCheckIns: number;
  totalCapacity: number;
  totalOrders: number;
}

export interface OrderInfo {
  order_id: string;
  ticket_id: string;
  ticket_name: string;
  ticket_number: number;
  zone: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  total_accesos: number;
  accesos_restantes: number;
  status: string;
  checksum: string;
  payment_ref: string;
  created_at: string;
}

export interface TicketValidationResponse {
  success: boolean;
  accesos_restantes?: number;
  error?: string;
  remaining?: number;
}

export const api = {
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al iniciar sesión');
    return json; // returns { token, user }
  },

  getAdminStats: async (): Promise<AdminStats> => {
    const res = await fetch(`${API_URL}/admin/stats`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    const json = await res.json();
    return json.data as AdminStats;
  },

  getAdminOrders: async () => {
    const res = await fetch(`${API_URL}/admin/orders`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    const json = await res.json();
    return json.data;
  },

  getQrInfo: async (orderId: string): Promise<OrderInfo> => {
    const res = await fetch(`${API_URL}/qrs/${orderId}`);
    if (!res.ok) throw new Error('Failed to fetch QR info');
    return await res.json();
  },

  validateQr: async (orderId: string, count: number): Promise<TicketValidationResponse> => {
    const res = await fetch(`${API_URL}/qrs/${orderId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ count })
    });
    return await res.json();
  }
};
