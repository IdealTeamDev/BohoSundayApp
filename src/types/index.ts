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
  pin: string;
  role: 'bouncer' | 'viewer';
  isActive: boolean;
  pushToken?: string;
}

export interface Product {
  id: string; // e.g., 'early', 'b_vip', 't_diamante'
  name: string; // e.g., 'Early Bird', 'Cama VIP'
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
  qrCode: string;
  buyerName: string;
  phone?: string;
  capacity: number;
  used: number;
  zoneId?: string;
  tableId?: string;
  ticketType: string;
  tierId?: string; // The stage when it was bought
  status: 'valid' | 'used' | 'invalid';
  createdAt?: number;
}

export interface Zone {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
}

export interface Table {
  id: string;
  zoneId: string;
  name: string;
  capacity: number;
  price?: number;
  status: 'available' | 'reserved' | 'occupied';
  ticketId?: string;
}
