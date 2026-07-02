export type Role = 'bouncer' | 'admin' | 'viewer1' | 'viewer2';

export interface User {
  id: string;
  name: string;
  role: 'bouncer' | 'admin' | 'viewer1' | 'viewer2';
  pushToken?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: 'bouncer' | 'viewer1' | 'viewer2';
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
  status: 'available' | 'reserved' | 'occupied';
  ticketId?: string;
}
