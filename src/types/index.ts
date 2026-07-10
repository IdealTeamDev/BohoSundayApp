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

export interface Tier {
  id: string;
  name: string;
  price: number;
  capacity: number;
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
  tierId?: string;
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
