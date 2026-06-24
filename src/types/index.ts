export type Role = 'bouncer' | 'waiter' | 'admin';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'bouncer' | 'waiter';
  pushToken?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  pin: string;
  role: 'bouncer' | 'waiter';
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
  capacity: number;
  used: number;
  zoneId?: string;
  tableId?: string;
  tierId?: string;
  status: 'valid' | 'used' | 'invalid';
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
