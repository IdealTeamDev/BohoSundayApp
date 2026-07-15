import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StaffMember, Table, Ticket, Tier, Product } from '../types';
import { supabase } from '../services/supabase';

interface DatabaseState {
  tables: Table[];
  tickets: Record<string, Ticket>;
  products: Product[];
  tiers: Tier[];
  staff: StaffMember[];

  isAirplaneMode: boolean;
  offlineQueue: { order_id: string; count: number }[];
  activeDeviceIds: Record<string, string>;

  // Sync actions
  syncAll: () => Promise<void>;
  subscribeToRealtime: () => void;
  flushOfflineQueue: () => Promise<void>;

  setAirplaneMode: (mode: boolean) => Promise<void>;
  processScan: (qrCode: string, count: number) => Promise<{ success: boolean; message: string }>;
  registerSession: (userId: string, deviceId: string) => void;
  checkSessionValidity: (userId: string, deviceId: string) => boolean;

  // Admin functions
  addTable: (name: string, capacity: number, price?: string) => void;
  removeTable: (id: string) => void;
  addTier: (name: string, endDate: string, priceOverrides: Record<string, number>) => void;
  removeTier: (id: string) => void;
  editTier: (id: string, name: string, endDate: string, priceOverrides: Record<string, number>) => void;
  revokeTableReservation: (tableId: string) => void;

  // Products
  addProduct: (name: string, type: 'ticket' | 'bed' | 'table', basePrice: number) => void;
  removeProduct: (id: string) => void;

  // Staff functions
  addStaff: (name: string, username: string, pin: string, role: 'bouncer' | 'viewer' | 'admin') => void;
  toggleStaffStatus: (id: string) => void;
  removeStaff: (id: string) => void;

  // Walk-ins
  sellWalkInTicket: (tierId: string, capacity: number) => void;

  // Active Stage
  getActiveTier: () => Tier | undefined;
  getFusedProductsForActiveTier: () => (Product & { currentPrice: number })[];

  // Push Notifications
  updateStaffPushToken: (id: string, pushToken?: string) => void;
  sendPushNotification: (tokens: string[], title: string, body: string) => Promise<void>;
}

export const useDatabaseStore = create<DatabaseState>()(
  persist(
    (set, get) => ({
      tables: [],
      tickets: {},
      products: [],
      tiers: [],
      staff: [],
      isAirplaneMode: false,
      offlineQueue: [],
      activeDeviceIds: {},

      syncAll: async () => {
        try {
          // Fetch tickets
          const { data: ticketsData } = await supabase.from('purchased_tickets').select('*');
          if (ticketsData) {
            const ticketsRecord: Record<string, Ticket> = {};
            ticketsData.forEach(t => { ticketsRecord[t.order_id] = t as Ticket; });
            set({ tickets: ticketsRecord });
          }

          // Fetch tables
          const { data: tablesData } = await supabase.from('boleteria_mesas').select('*');
          if (tablesData) {
            const mappedTables = tablesData.map(t => ({
              id: t.id,
              zone: t.zone,
              name: t.name,
              persons: t.persons,
              price: t.price,
              available: t.available,
              order_id: null // To be mapped if we associate them
            })) as unknown as Table[];
            set({ tables: mappedTables });
          }

          // Fetch products (individual tickets + tables as products)
          const { data: prods } = await supabase.from('boleteria_individual').select('*');
          if (prods) {
            const mappedProds = prods.map(p => ({
              id: p.id,
              name: p.name,
              type: 'ticket' as const,
              basePrice: parseFloat(p.price || '0')
            }));
            set({ products: mappedProds });
          }

          // Fetch staff
          const { data: staffData } = await supabase.from('staff_users').select('*');
          if (staffData) {
            set({ staff: staffData as StaffMember[] });
          }

        } catch (e) {
          console.error("Sync failed", e);
        }
      },

      subscribeToRealtime: () => {
        supabase
          .channel('public:purchased_tickets')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'purchased_tickets' },
            (payload) => {
              const updatedTicket = payload.new as Ticket;
              const { tickets } = get();
              if (tickets[updatedTicket.order_id]) {
                set({ tickets: { ...tickets, [updatedTicket.order_id]: updatedTicket } });
              }
            }
          )
          .subscribe();
      },

      flushOfflineQueue: async () => {
        const { offlineQueue } = get();
        if (offlineQueue.length === 0) return;

        console.log(`Syncing ${offlineQueue.length} offline scans...`);
        const remainingQueue = [...offlineQueue];

        for (let i = offlineQueue.length - 1; i >= 0; i--) {
          const scan = offlineQueue[i];
          
          // Actually hit the endpoint or Supabase
          const { data: currentTicket, error: fetchErr } = await supabase
            .from('purchased_tickets')
            .select('accesos_restantes, total_accesos')
            .eq('order_id', scan.order_id)
            .single();

          if (!fetchErr && currentTicket) {
            const newAccesos = Math.max(0, currentTicket.accesos_restantes - scan.count);
            const status = newAccesos === 0 ? 'used' : 'paid';

            const { error: updateErr } = await supabase
              .from('purchased_tickets')
              .update({ accesos_restantes: newAccesos, status })
              .eq('order_id', scan.order_id);

            if (!updateErr) {
              // Successfully synced
              remainingQueue.splice(i, 1);
            }
          } else {
            // Probably ticket doesn't exist anymore or network error, let's just remove it if it doesn't exist
            if (fetchErr?.code === 'PGRST116') { // No rows found
              remainingQueue.splice(i, 1);
            }
          }
        }

        set({ offlineQueue: remainingQueue });
      },

      setAirplaneMode: async (mode) => {
        set({ isAirplaneMode: mode });
        if (!mode) {
          await get().flushOfflineQueue();
        }
      },

      registerSession: (userId, deviceId) => {
        set((state) => ({
          activeDeviceIds: { ...state.activeDeviceIds, [userId]: deviceId }
        }));
      },

      checkSessionValidity: (userId, deviceId) => {
        const activeId = get().activeDeviceIds[userId];
        return !activeId || activeId === deviceId;
      },

      processScan: async (qrCode, count) => {
        const { tickets, isAirplaneMode, offlineQueue } = get();
        const ticket = tickets[qrCode];

        if (!ticket) {
          return { success: false, message: 'Código falso o no encontrado' };
        }

        if (ticket.status === 'used' || ticket.accesos_restantes <= 0) {
          return { success: false, message: 'Todos los accesos consumidos' };
        }

        if (count > ticket.accesos_restantes) {
          return { success: false, message: `Solo quedan ${ticket.accesos_restantes} accesos` };
        }

        // Local Optimistic Update
        const newAccesos = ticket.accesos_restantes - count;
        const status = newAccesos === 0 ? 'used' : 'paid';
        const updatedTicket: Ticket = { ...ticket, accesos_restantes: newAccesos, status };
        set({ tickets: { ...tickets, [qrCode]: updatedTicket } });

        if (isAirplaneMode) {
          set({ offlineQueue: [...offlineQueue, { order_id: qrCode, count }] });
        } else {
          // Push immediately to backend
          set({ offlineQueue: [...offlineQueue, { order_id: qrCode, count }] });
          get().flushOfflineQueue();
        }

        return { success: true, message: 'SIGA' };
      },

      addTable: (name, capacity, price) => {},
      removeTable: (id) => {},
      addProduct: (name, type, basePrice) => {},
      removeProduct: (id) => {},
      addTier: (name, endDate, priceOverrides) => {},
      removeTier: (id) => {},
      editTier: (id, name, endDate, priceOverrides) => {},
      revokeTableReservation: (tableId) => {},

      addStaff: (name, username, pin, role) => {},
      toggleStaffStatus: (id) => {},
      removeStaff: (id) => {},

      sellWalkInTicket: (tierId, capacity) => {},

      getActiveTier: () => {
        const { tiers } = get();
        if (!tiers || tiers.length === 0) return undefined;
        const now = new Date().getTime();
        const sorted = [...tiers].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
        return sorted.find(t => new Date(t.endDate).getTime() > now) || sorted[sorted.length - 1];
      },

      getFusedProductsForActiveTier: () => {
        const tier = get().getActiveTier();
        const products = get().products || [];
        if (!tier) return products.map(p => ({ ...p, currentPrice: p.basePrice }));
        
        return products.map(p => ({
          ...p,
          currentPrice: tier.priceOverrides?.[p.id] !== undefined ? tier.priceOverrides[p.id] : p.basePrice
        }));
      },

      updateStaffPushToken: (id, pushToken) => {},
      sendPushNotification: async (tokens, title, body) => {}
    }),
    {
      name: 'bohosunday-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
