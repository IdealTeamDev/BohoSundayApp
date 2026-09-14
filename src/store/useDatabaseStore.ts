import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StaffMember, Table, Ticket, Tier, Product, EventEdition } from '../types';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

interface DatabaseState {
  tables: Table[];
  tickets: Record<string, Ticket>;
  products: Product[];
  tiers: Tier[];
  staff: StaffMember[];
  editions: EventEdition[];
  activeEdition: EventEdition | null;
  selectedEditionSlug: string;

  isOnline: boolean;
  offlineQueue: { order_id: string; count: number; staff_username: string; scanned_at: string; scan_result: string; ticket_checksum: string }[];
  activeDeviceIds: Record<string, string>;

  // Sync actions
  syncAll: () => Promise<void>;
  fetchEditions: () => Promise<void>;
  setSelectedEditionSlug: (slug: string) => void;
  switchActiveEdition: (slug: string) => Promise<boolean>;
  subscribeToRealtime: () => void;
  flushOfflineQueue: () => Promise<void>;

  setIsOnline: (status: boolean) => void;
  processScan: (qrCode: string, count: number, staffUsername: string) => Promise<{ success: boolean; message: string }>;
  registerSession: (userId: string, deviceId: string) => void;
  checkSessionValidity: (userId: string, deviceId: string) => boolean;

  // Admin functions
  addTier: (name: string, endDate: string, priceOverrides: Record<string, number>) => Promise<void>;
  removeTier: (id: string) => Promise<void>;
  editTier: (id: string, name: string, endDate: string, priceOverrides: Record<string, number>) => Promise<void>;
  revokeTableReservation: (tableId: string) => void;
  adminCreateTicket: (buyerName: string, phone: string, email: string, language: string, productId: string, capacity: number, tableId?: string) => Promise<{ success: boolean; error?: string }>;

  // Products
  addProduct: (options: { type: 'ticket'|'bed'|'table', name: string, basePrice: number, zone?: string, number?: string, persons?: number, stock?: number }) => Promise<void>;
  removeProduct: (id: string, type: 'ticket'|'bed'|'table') => Promise<void>;

  // Staff functions
  addStaff: (name: string, username: string, pin: string, role: 'bouncer' | 'viewer' | 'admin') => Promise<void>;
  toggleStaffStatus: (id: string) => Promise<void>;
  removeStaff: (id: string) => Promise<void>;
  updateStaffPin: (id: string, pin: string) => Promise<void>;

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
      editions: [],
      activeEdition: null,
      selectedEditionSlug: 'active',
      isOnline: true,
      offlineQueue: [],
      activeDeviceIds: {},

      setSelectedEditionSlug: (slug: string) => {
        set({ selectedEditionSlug: slug });
        get().syncAll();
      },

      fetchEditions: async () => {
        try {
          const { data } = await supabase
            .from('event_editions')
            .select('*')
            .order('created_at', { ascending: false });

          let list: EventEdition[] = [];
          let active: EventEdition = {
            id: 'entre-soles',
            slug: 'entre-soles',
            name: 'Entre Soles',
            is_active: true,
          };

          if (data && data.length > 0) {
            list = data.map((item: any) => ({
              id: item.id || item.slug,
              slug: item.slug || item.id,
              name: item.name,
              is_active: Boolean(item.is_active),
              start_date: item.start_date || null,
              end_date: item.end_date || null,
            }));
            const foundActive = list.find((e) => e.is_active);
            if (foundActive) {
              active = foundActive;
            }
          } else {
            list = [active];
          }

          set({ editions: list, activeEdition: active });
        } catch (e) {
          console.error('Failed to fetch editions', e);
        }
      },

      switchActiveEdition: async (slug: string) => {
        try {
          const result = await api.setActiveEdition(slug);
          if (result && result.success) {
            await get().syncAll();
            return true;
          }
          return false;
        } catch (e) {
          console.error('Failed to switch active edition', e);
          return false;
        }
      },

      syncAll: async () => {
        try {
          // 1. Fetch editions from Supabase
          const { data: editionsData } = await supabase
            .from('event_editions')
            .select('*')
            .order('created_at', { ascending: false });

          let currentEditions: EventEdition[] = [];
          let currentActive: EventEdition = {
            id: 'entre-soles',
            slug: 'entre-soles',
            name: 'Entre Soles',
            is_active: true,
          };

          if (editionsData && editionsData.length > 0) {
            currentEditions = editionsData.map((item: any) => ({
              id: item.id || item.slug,
              slug: item.slug || item.id,
              name: item.name,
              is_active: Boolean(item.is_active),
              start_date: item.start_date || null,
              end_date: item.end_date || null,
            }));
            const found = currentEditions.find((e) => e.is_active);
            if (found) currentActive = found;
          } else {
            currentEditions = [currentActive];
          }

          set({ editions: currentEditions, activeEdition: currentActive });

          // Determine edition slug to filter tickets by
          const { selectedEditionSlug } = get();
          const targetSlug =
            !selectedEditionSlug || selectedEditionSlug === 'active'
              ? currentActive.slug
              : selectedEditionSlug;

          // 2. Fetch tickets filtered by target edition_slug
          let query = supabase.from('purchased_tickets').select('*');
          if (targetSlug !== 'all') {
            query = query.eq('edition_slug', targetSlug);
          }

          const { data: ticketsData } = await query;
          const ticketsRecord: Record<string, Ticket> = {};
          if (ticketsData) {
            ticketsData.forEach((t) => {
              ticketsRecord[t.order_id] = t as Ticket;
            });
          }
          set({ tickets: ticketsRecord });

          // 3. Fetch tables and calculate availability according to active edition
          const { data: tablesData } = await supabase.from('boleteria_mesas').select('*');
          if (tablesData) {
            const mappedTables: Table[] = tablesData.map((t) => {
              // Find if table has a paid ticket in the selected target edition
              const tableTicket = Object.values(ticketsRecord).find(
                (pt) =>
                  pt.ticket_id === t.id &&
                  (pt.status === 'paid' || pt.status === 'used')
              );

              return {
                id: t.id,
                zone: t.zona || t.zone || 'VIP',
                name: t.mesa || t.name || t.id,
                number: t.numero || t.number || '1',
                persons: t.aforo || t.persons || 10,
                price: t.precio?.toString() || t.price?.toString() || '0',
                available: tableTicket ? false : (t.disponible ?? t.available ?? true),
                order_id: tableTicket?.order_id || t.order_id,
              };
            });
            set({ tables: mappedTables });
          }

          // Fetch products (individual tickets + tables as products)
          const { data: prods } = await supabase.from('boleteria_individual').select('*');
          let combinedProducts: Product[] = [];
          if (prods) {
            combinedProducts = prods.map((p) => ({
              id: p.id,
              name: p.name,
              type: 'ticket' as const,
              basePrice: parseFloat(p.price || '0'),
            }));
          }
          if (tablesData) {
            const tablesAsProducts = tablesData.map((t) => ({
              id: t.id,
              name: t.name,
              type: (t.name.toLowerCase().includes('cama') ? 'bed' : 'table') as 'bed' | 'table',
              basePrice: parseFloat(t.price || '0'),
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
            const mappedTiers = stagesData.map((s) => ({
              id: s.id,
              name: s.name,
              endDate: s.end_date,
              priceOverrides:
                typeof s.prices === 'string' ? JSON.parse(s.prices) : s.prices || {},
            }));
            set({ tiers: mappedTiers });
          }
        } catch (e) {
          console.error('Sync failed', e);
        }
      },

      subscribeToRealtime: () => {
        supabase
          .channel('public:app_realtime_all')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'purchased_tickets' },
            () => {
              get().syncAll();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'event_editions' },
            () => {
              get().syncAll();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'boleteria_mesas' },
            () => {
              get().syncAll();
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
          
          // Log insertion
          const { error: logErr } = await supabase.from('scan_logs').insert({
            ticket_checksum: scan.ticket_checksum,
            staff_username: scan.staff_username,
            scanned_at: scan.scanned_at,
            people_entered: scan.count,
            scan_result: scan.scan_result
          });

          if (logErr) {
            console.error('Error inserting scan log', logErr);
            continue; // Keep in queue to retry later
          }

          let ticketUpdateSuccess = false;

          if (scan.scan_result === 'success') {
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

              if (!updateErr) ticketUpdateSuccess = true;
            } else {
              // Probably ticket doesn't exist anymore
              if (fetchErr?.code === 'PGRST116') {
                ticketUpdateSuccess = true;
              }
            }
          } else {
            ticketUpdateSuccess = true; // No ticket update needed for failed scans
          }

          if (ticketUpdateSuccess) {
            remainingQueue.splice(i, 1);
          }
        }

        set({ offlineQueue: remainingQueue });
      },

      setIsOnline: (status) => {
        const { isOnline } = get();
        if (isOnline !== status) {
          set({ isOnline: status });
          if (status) {
            get().flushOfflineQueue();
            get().syncAll();
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
        return !activeId || activeId === deviceId;
      },

      processScan: async (qrCode, count, staffUsername) => {
        const { tickets, isOnline, offlineQueue } = get();
        const ticket = tickets[qrCode];
        const scannedAt = new Date().toISOString();

        if (!ticket) {
          const log = { order_id: qrCode, count: 0, staff_username: staffUsername, scanned_at: scannedAt, scan_result: 'invalid_code', ticket_checksum: qrCode };
          set({ offlineQueue: [...offlineQueue, log] });
          if (get().isOnline) get().flushOfflineQueue();
          return { success: false, message: 'Código falso o no encontrado' };
        }

        if (ticket.status === 'used' || ticket.accesos_restantes <= 0) {
          const log = { order_id: qrCode, count: 0, staff_username: staffUsername, scanned_at: scannedAt, scan_result: 'already_used', ticket_checksum: ticket.checksum || qrCode };
          set({ offlineQueue: [...offlineQueue, log] });
          if (get().isOnline) get().flushOfflineQueue();
          return { success: false, message: 'Todos los accesos consumidos' };
        }

        if (count > ticket.accesos_restantes) {
          const log = { order_id: qrCode, count: 0, staff_username: staffUsername, scanned_at: scannedAt, scan_result: 'insufficient_accesses', ticket_checksum: ticket.checksum || qrCode };
          set({ offlineQueue: [...offlineQueue, log] });
          if (get().isOnline) get().flushOfflineQueue();
          return { success: false, message: `Solo quedan ${ticket.accesos_restantes} accesos` };
        }

        // Local Optimistic Update
        const newAccesos = ticket.accesos_restantes - count;
        const status = newAccesos === 0 ? 'used' : 'paid';
        const updatedTicket: Ticket = { ...ticket, accesos_restantes: newAccesos, status };
        set({ tickets: { ...tickets, [qrCode]: updatedTicket } });
        
        const successLog = { order_id: qrCode, count, staff_username: staffUsername, scanned_at: scannedAt, scan_result: 'success', ticket_checksum: ticket.checksum || qrCode };
        set({ offlineQueue: [...offlineQueue, successLog] });
        
        if (get().isOnline) {
          get().flushOfflineQueue();
        }

        return { success: true, message: 'SIGA' };
      },

      revokeTableReservation: async (tableId) => {
        try {
          const { tickets } = get();
          const ticket = Object.values(tickets).find(t => t.ticket_id === tableId);
          if (ticket) {
            await supabase.from('purchased_tickets').delete().eq('order_id', ticket.order_id);
          }
          await supabase.from('boleteria_mesas').update({ available: true }).eq('id', tableId);
          get().syncAll();
        } catch (e) {
          console.error('Revoke failed', e);
        }
      },

      adminCreateTicket: async (buyerName, phone, email, language, productId, capacity, tableId) => {
        try {
          // Generate unique ID like MANUAL-12345
          const orderId = `MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          
          // Get product name (ticket_name) from tiers/products
          const { getFusedProductsForActiveTier } = get();
          const product = getFusedProductsForActiveTier().find(p => p.id === productId);
          const ticketName = product ? product.name : productId;

          // Generar checksum aleatorio
          const checksum = Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);

          let zone = null;
          let ticketNumber = null;
          
          const table = get().tables.find(t => t.id === tableId || t.id === productId);
          if (table) {
             zone = table.zone;
             ticketNumber = table.number;
          }

          const activeEd = get().activeEdition;
          const editionSlug = activeEd?.slug || 'entre-soles';
          const editionName = activeEd?.name || 'Entre Soles';

          // Insert into purchased_tickets
          const { error: insertError } = await supabase.from('purchased_tickets').insert({
            order_id: orderId,
            ticket_id: productId,
            buyer_name: buyerName,
            buyer_phone: phone,
            buyer_email: email,
            language: language || 'ES',
            ticket_name: ticketName,
            ticket_price: product ? product.currentPrice : 0,
            total_accesos: capacity,
            accesos_restantes: capacity,
            status: 'paid',
            zone: zone,
            ticket_number: ticketNumber ? parseInt(String(ticketNumber)) : null,
            checksum: checksum,
            payment_ref: 'manual-sale',
            edition_slug: editionSlug,
            edition_name: editionName,
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


       addStaff: async (name, username, pin, role) => {
         const res = await api.addStaff({ name, username, pin, role });
         if (res) {
             set({ staff: [...get().staff, res as StaffMember] });
         }
      },
      toggleStaffStatus: async (id) => {
         const staff = get().staff.find(s => s.id === id);
         if (!staff) return;
         const newStatus = !staff.is_active;
         const res = await api.updateStaff(id, { is_active: newStatus });
         if (res && res.data) {
             set({ staff: get().staff.map(s => s.id === id ? (res.data as StaffMember) : s) });
         }
      },
      removeStaff: async (id) => {
         await api.deleteStaff(id);
         set({ staff: get().staff.filter(s => s.id !== id) });
      },
      updateStaffPin: async (id, pin) => {
         const res = await api.updateStaff(id, { pin });
         if (res && res.data) {
             set({ staff: get().staff.map(s => s.id === id ? (res.data as StaffMember) : s) });
         }
      },


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
        const isBelieversStage = tier
          ? (tier.name || '').toLowerCase().includes('believer') || (tier.id || '').toLowerCase().includes('believer')
          : false;

        const filteredProducts = products.filter(p => {
          if (p.id === 'general') {
            return isBelieversStage;
          }
          return true;
        });

        if (!tier) return filteredProducts.map(p => ({ ...p, currentPrice: p.basePrice }));

        return filteredProducts.map(p => ({
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
