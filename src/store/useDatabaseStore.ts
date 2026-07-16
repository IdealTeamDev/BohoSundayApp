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
  addTier: (name: string, endDate: string, priceOverrides: Record<string, number>) => Promise<void>;
  removeTier: (id: string) => Promise<void>;
  editTier: (id: string, name: string, endDate: string, priceOverrides: Record<string, number>) => Promise<void>;
  revokeTableReservation: (tableId: string) => void;
  adminCreateTicket: (buyerName: string, phone: string, email: string, productId: string, capacity: number, tableId?: string) => Promise<{ success: boolean; error?: string }>;

  // Products
  addProduct: (options: { type: 'ticket'|'bed'|'table', name: string, basePrice: number, zone?: string, number?: string, persons?: number, stock?: number }) => Promise<void>;
  removeProduct: (id: string, type: 'ticket'|'bed'|'table') => Promise<void>;

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
            const mappedTables: Table[] = tablesData.map(t => ({
              id: t.id,
              zone: t.zona || t.zone || 'VIP',
              name: t.mesa || t.name || t.id,
              number: t.numero || t.number || '1',
              persons: t.aforo || t.persons || 10,
              price: t.precio?.toString() || t.price?.toString() || '0',
              available: t.disponible ?? t.available ?? true,
              order_id: t.order_id
            }));
            set({ tables: mappedTables });
          }

          // Fetch products (individual tickets + tables as products)
          const { data: prods } = await supabase.from('boleteria_individual').select('*');
          let combinedProducts: Product[] = [];
          if (prods) {
            combinedProducts = prods.map(p => ({
              id: p.id,
              name: p.name,
              type: 'ticket' as const,
              basePrice: parseFloat(p.price || '0')
            }));
          }
          if (tablesData) {
            const tablesAsProducts = tablesData.map(t => ({
              id: t.id,
              name: t.name,
              type: (t.name.toLowerCase().includes('cama') ? 'bed' : 'table') as 'bed' | 'table',
              basePrice: parseFloat(t.price || '0')
            }));
            combinedProducts = [...combinedProducts, ...tablesAsProducts];
          }
          set({ products: combinedProducts });

          // Fetch staff
          const { data: staffData } = await supabase.from('staff_users').select('*');
          if (staffData) {
            set({ staff: staffData as StaffMember[] });
          }

          // Fetch event stages (tiers)
          const { data: stagesData } = await supabase.from('event_stages').select('*');
          if (stagesData) {
            const mappedTiers = stagesData.map(s => ({
              id: s.id,
              name: s.name,
              endDate: s.end_date,
              priceOverrides: typeof s.prices === 'string' ? JSON.parse(s.prices) : (s.prices || {})
            }));
            set({ tiers: mappedTiers });
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

      revokeTableReservation: async (tableId) => {
        try {
          const { tickets } = get();
          const ticket = Object.values(tickets).find(t => t.ticket_id === tableId);
          if (ticket) {
            await supabase.from('purchased_tickets').update({ status: 'invalid' }).eq('order_id', ticket.order_id);
          }
          await supabase.from('boleteria_mesas').update({ available: true }).eq('id', tableId);
          get().syncAll();
        } catch (e) {
          console.error('Revoke failed', e);
        }
      },

      adminCreateTicket: async (buyerName, phone, email, productId, capacity, tableId) => {
        try {
          // Generate unique ID like MANUAL-12345
          const orderId = `MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          
          // Get product name (ticket_name) from tiers/products
          const { getFusedProductsForActiveTier } = get();
          const product = getFusedProductsForActiveTier().find(p => p.id === productId);
          const ticketName = product ? product.name : productId;

          // Insert into purchased_tickets
          const { error: insertError } = await supabase.from('purchased_tickets').insert({
            order_id: orderId,
            ticket_id: productId,
            buyer_name: buyerName,
            buyer_phone: phone,
            buyer_email: email,
            ticket_name: ticketName,
            ticket_price: 0, // Manual creation = 0
            total_accesos: capacity,
            accesos_restantes: capacity,
            status: 'paid'
          });

          if (insertError) throw insertError;

          // Block the table if tableId was provided
          if (tableId) {
            const { error: tableError } = await supabase.from('boleteria_mesas').update({ available: false }).eq('id', tableId);
            if (tableError) console.error("Warning: Could not block table", tableError);
          }

          // Sync data to update UI
          await get().syncAll();

          return { success: true };
        } catch (e: any) {
          console.error('Error in adminCreateTicket:', e);
          return { success: false, error: e.message || 'Error desconocido' };
        }
      },
      addProduct: async (options) => {
        try {
          if (options.type === 'ticket') {
            const idSlug = options.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const { data, error } = await supabase.from('boleteria_individual').insert({
              id: idSlug,
              name: options.name,
              price: options.basePrice,
              stock: options.stock || 100,
            }).select();
            
            if (error) throw error;
            if (data && data[0]) {
              const newProd: Product = { id: data[0].id, name: data[0].name, type: 'ticket', basePrice: parseFloat(data[0].price || '0') };
              set({ products: [...get().products, newProd] });
            }
          } else {
            // Table or bed
            const idStr = `${options.zone || 'mesa'}-${options.number || '1'}`;
            const { data, error } = await supabase.from('boleteria_mesas').insert({
              id: idStr,
              name: options.name,
              zone: options.zone,
              number: parseInt(options.number || '1', 10),
              persons: options.persons || 10,
              price: options.basePrice,
              available: true,
              currency: 'COP',
              x: 0,
              y: 0
            }).select();
            
            if (error) throw error;
            if (data && data[0]) {
              const t = data[0];
              const newProd: Product = { 
                id: t.id, 
                name: t.name, 
                type: t.name.toLowerCase().includes('cama') ? 'bed' : 'table',
                basePrice: parseFloat(t.price || '0') 
              };
              set({ products: [...get().products, newProd] });
            }
          }
        } catch (e) {
          console.error("Failed to add product", e);
          throw e;
        }
      },
      
      removeProduct: async (id, type) => {
        try {
          if (type === 'ticket') {
            await supabase.from('boleteria_individual').delete().eq('id', id);
          } else {
            await supabase.from('boleteria_mesas').delete().eq('id', id);
          }
          set({ products: get().products.filter(p => p.id !== id) });
        } catch (e) {
          console.error("Failed to remove product", e);
          throw e;
        }
      },
      addTier: async (name, endDate, priceOverrides) => {
        try {
          const { data, error } = await supabase
            .from('event_stages')
            .insert({ name, end_date: endDate, prices: priceOverrides })
            .select();
          if (error) throw error;
          if (data && data[0]) {
            const s = data[0];
            const newTier = {
              id: s.id,
              name: s.name,
              endDate: s.end_date,
              priceOverrides: typeof s.prices === 'string' ? JSON.parse(s.prices) : (s.prices || {})
            };
            set({ tiers: [...get().tiers, newTier] });
          }
        } catch(e) {
          console.error("Failed to add tier", e);
        }
      },
      removeTier: async (id) => {
        try {
           const { error } = await supabase.from('event_stages').delete().eq('id', id);
           if (error) throw error;
           const tiers = get().tiers.filter(t => t.id !== id);
           set({ tiers });
        } catch(e) {
           console.error("Failed to remove tier", e);
        }
      },
      editTier: async (id, name, endDate, priceOverrides) => {
        try {
          const { data, error } = await supabase
            .from('event_stages')
            .update({ name, end_date: endDate, prices: priceOverrides })
            .eq('id', id)
            .select();
          if (error) throw error;
          if (data && data[0]) {
             const s = data[0];
             const newTier = {
              id: s.id,
              name: s.name,
              endDate: s.end_date,
              priceOverrides: typeof s.prices === 'string' ? JSON.parse(s.prices) : (s.prices || {})
            };
            const tiers = get().tiers.map(t => t.id === id ? newTier : t);
            set({ tiers });
          }
        } catch(e) {
          console.error("Failed to edit tier", e);
        }
      },


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
