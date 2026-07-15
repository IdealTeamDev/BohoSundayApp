export type Role = 'bouncer' | 'admin' | 'viewer';

export interface User {
  id: string;
  name: string;
  role: 'bouncer' | 'admin' | 'viewer';
  pushToken?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  pin_hash?: string;
  role: 'bouncer' | 'admin' | 'viewer';
  is_active: boolean;
  pushToken?: string;
}

export interface Product {
  id: string;
  name: string;
  type: 'ticket' | 'bed' | 'table';
  basePrice: number;
}

export interface Tier {
  id: string;
  name: string;
  endDate: string;
  priceOverrides: Record<string, number>;
}

export interface Ticket {
  id: string;
  order_id: string;
  ticket_id: string;
  ticket_name: string;
  ticket_number: number;
  zone: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  total_accesos: number;
  accesos_restantes: number;
  status: 'paid' | 'used' | 'invalid';
  checksum: string;
  payment_ref: string;
  created_at: string;
  ticket_price: string;
}

export interface Table {
  id: string;
  zone: string;
  name: string;
  persons: number;
  price: string;
  available: boolean;
  order_id?: string; // Links to the purchased ticket if occupied
}

export interface Zone {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
}
