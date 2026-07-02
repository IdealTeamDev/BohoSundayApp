import { create } from 'zustand';
import { Table, Ticket, Tier, StaffMember } from '../types';

const mockTables: Table[] = [
  { id: 't1', zoneId: 'z1', name: 'Oasis 1', capacity: 10, status: 'available' }, 
  { id: 't2', zoneId: 'z1', name: 'Oasis 2', capacity: 10, status: 'available' }, 
  { id: 't3', zoneId: 'z1', name: 'Oasis 3', capacity: 10, status: 'reserved', ticketId: 'tick_group_1' }, 
  { id: 't4', zoneId: 'z1', name: 'Oasis 4', capacity: 10, status: 'reserved', ticketId: 'tick_single_1' },
  { id: 't5', zoneId: 'z1', name: 'Oasis VIP', capacity: 15, status: 'reserved', ticketId: 'tick_vip_1' },
];

const mockTickets: Record<string, Ticket> = {
  'tick_group_1': { id: 't_1', qrCode: 'tick_group_1', buyerName: 'Juan C.', capacity: 10, used: 0, tableId: 't3', tierId: 'tier_2', status: 'valid' },
  'tick_single_1': { id: 't_2', qrCode: 'tick_single_1', buyerName: 'Maria G.', capacity: 1, used: 0, tableId: 't4', tierId: 'tier_1', status: 'valid' },
  'tick_vip_1': { id: 't_3', qrCode: 'tick_vip_1', buyerName: 'Carlos P.', capacity: 15, used: 0, tableId: 't5', tierId: 'tier_2', status: 'valid' },
};

const mockTiers: Tier[] = [
  { id: 'tier_1', name: 'Preventa 1', price: 25, capacity: 100 },
  { id: 'tier_2', name: 'General', price: 40, capacity: 300 },
];

const mockStaff: StaffMember[] = [
  { id: 'staff_1', name: 'Portero Demo', username: 'portero', pin: '1234', role: 'bouncer', isActive: true },
  { id: 'staff_2', name: 'Viewer 1 (Completo)', username: 'viewer1', pin: '1234', role: 'viewer1', isActive: true },
  { id: 'staff_3', name: 'Viewer 2 (Parcial)', username: 'viewer2', pin: '1234', role: 'viewer2', isActive: true },
];

interface DatabaseState {
  tables: Table[];
  tickets: Record<string, Ticket>;
  tiers: Tier[];
  staff: StaffMember[];
  
  // Phase 4: Security and Offline Engine
  isAirplaneMode: boolean;
  offlineQueue: { qrCode: string; count: number }[];
  activeDeviceIds: Record<string, string>; // Maps userId -> deviceId

  setAirplaneMode: (mode: boolean) => Promise<void>;
  processScan: (qrCode: string, count: number) => Promise<{ success: boolean; message: string }>;
  registerSession: (userId: string, deviceId: string) => void;
  checkSessionValidity: (userId: string, deviceId: string) => boolean;
  
  // Admin functions
  addTable: (name: string, capacity: number) => void;
  removeTable: (id: string) => void;
  addTier: (name: string, price: number, capacity: number) => void;
  removeTier: (id: string) => void;
  editTier: (id: string, name: string, price: number, capacity: number) => void;
  adminCreateTicket: (buyerName: string, phone: string, tierId: string, capacity: number, tableId?: string) => void;
  
  // Staff functions
  addStaff: (name: string, username: string, pin: string, role: 'bouncer' | 'viewer1' | 'viewer2') => void;
  toggleStaffStatus: (id: string) => void;
  removeStaff: (id: string) => void;

  // Walk-ins
  sellWalkInTicket: (tierId: string, capacity: number) => void;

  // Push Notifications
  updateStaffPushToken: (id: string, pushToken?: string) => void;
  sendPushNotification: (tokens: string[], title: string, body: string) => Promise<void>;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  tables: mockTables,
  tickets: mockTickets,
  tiers: mockTiers,
  staff: mockStaff,
  isAirplaneMode: false,
  offlineQueue: [],
  activeDeviceIds: {},

  setAirplaneMode: async (mode) => {
    set({ isAirplaneMode: mode });
    
    // If we re-connect to internet, process the queue!
    if (!mode) {
      const { offlineQueue } = get();
      if (offlineQueue.length > 0) {
        console.log(`Syncing ${offlineQueue.length} offline scans...`);
        // In a real app this would be Promise.all or a batch request to backend
        for (const scan of offlineQueue) {
          await get().processScan(scan.qrCode, scan.count);
        }
        set({ offlineQueue: [] });
      }
    }
  },

  registerSession: (userId, deviceId) => {
    set((state) => ({
      activeDeviceIds: { ...state.activeDeviceIds, [userId]: deviceId }
    }));
  },

  checkSessionValidity: (userId, deviceId) => {
    const activeId = get().activeDeviceIds[userId];
    // If not registered yet or matches, it's valid. If registered to another, it's invalid.
    return !activeId || activeId === deviceId;
  },

  processScan: async (qrCode, count) => {
    const { tickets, tables, isAirplaneMode, offlineQueue } = get();
    
    // OFFLINE QUEUEING
    if (isAirplaneMode) {
      set({ offlineQueue: [...offlineQueue, { qrCode, count }] });
      // We will perform local optimistic update so the bouncer sees the success immediately
    }

    const ticket = tickets[qrCode];

    if (!ticket) {
      return { success: false, message: 'Falso o no encontrado' };
    }

    if (ticket.status === 'used' || ticket.used >= ticket.capacity) {
      return { success: false, message: 'Ya ingresó' };
    }

    if (ticket.used + count > ticket.capacity) {
      return { success: false, message: `Solo quedan ${ticket.capacity - ticket.used} cupos` };
    }

    const isFullyUsed = (ticket.used + count) >= ticket.capacity;
    
    const updatedTicket: Ticket = {
      ...ticket,
      used: ticket.used + count,
      status: isFullyUsed ? 'used' : 'valid'
    };

    const newTickets = { ...tickets, [qrCode]: updatedTicket };

    // Update table status if associated
    let newTables = [...tables];
    if (ticket.tableId) {
      newTables = tables.map(t => {
        if (t.id === ticket.tableId) {
          // If anyone arrived, mark as occupied
          return { ...t, status: 'occupied' as const };
        }
        return t;
      });
    }

    set({ tickets: newTickets, tables: newTables });
    return { success: true, message: 'SIGA' };
  },

  addTable: (name, capacity) => {
    const newId = `t${Date.now()}`;
    const newTable: Table = { id: newId, zoneId: 'z1', name, capacity, status: 'available' };
    set((state) => ({ tables: [...state.tables, newTable] }));
  },

  removeTable: (id) => {
    set((state) => ({ tables: state.tables.filter(t => t.id !== id) }));
  },

  addTier: (name, price, capacity) => {
    const newId = `tier_${Date.now()}`;
    const newTier: Tier = { id: newId, name, price, capacity };
    set((state) => ({ tiers: [...state.tiers, newTier] }));
  },

  removeTier: (id) => {
    set((state) => ({ tiers: state.tiers.filter(t => t.id !== id) }));
  },

  editTier: (id, name, price, capacity) => {
    set((state) => ({
      tiers: state.tiers.map(t => t.id === id ? { ...t, name, price, capacity } : t)
    }));
  },

  adminCreateTicket: (buyerName, phone, tierId, capacity, tableId) => {
    const newId = `qr_${Date.now()}`;
    const newTicket: Ticket = {
      id: newId,
      qrCode: newId,
      buyerName,
      phone,
      capacity,
      used: 0,
      tierId,
      tableId,
      status: 'valid',
      createdAt: Date.now()
    };
    set(state => ({ tickets: { ...state.tickets, [newId]: newTicket } }));
  },

  addStaff: (name, username, pin, role) => {
    const newStaff: StaffMember = { id: `staff_${Date.now()}`, name, username, pin, role, isActive: true };
    set(state => ({ staff: [...state.staff, newStaff] }));
  },

  toggleStaffStatus: (id) => {
    set(state => ({
      staff: state.staff.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s)
    }));
  },

  removeStaff: (id) => {
    set(state => ({ staff: state.staff.filter(s => s.id !== id) }));
  },

  sellWalkInTicket: (tierId, capacity) => {
    const newId = `walkin_${Date.now()}`;
    const newTicket: Ticket = {
      id: newId,
      qrCode: newId,
      buyerName: 'Taquilla Puerta',
      capacity: capacity,
      used: capacity, // Automatically used because they enter immediately
      tierId: tierId,
      status: 'used'
    };
    set(state => ({ tickets: { ...state.tickets, [newId]: newTicket } }));
  },

  updateStaffPushToken: (id, pushToken) => {
    set(state => ({
      staff: state.staff.map(s => s.id === id ? { ...s, pushToken } : s)
    }));
  },

  sendPushNotification: async (tokens, title, body) => {
    const validTokens = tokens.filter(t => t);
    if (validTokens.length === 0) return;
    
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: { },
    }));

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      console.log('Push notifications sent successfully to', validTokens);
    } catch (e) {
      console.error('Error sending push notification', e);
    }
  }
}));
