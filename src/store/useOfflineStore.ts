import { create } from 'zustand';
import { Ticket } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OfflineState {
  tickets: Record<string, Ticket>;
  isOfflineMode: boolean;
  setOfflineMode: (status: boolean) => void;
  syncTickets: (tickets: Ticket[]) => Promise<void>;
  scanTicketLocally: (qrCode: string, count: number) => Promise<{ success: boolean; message: string }>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  tickets: {},
  isOfflineMode: false,

  setOfflineMode: (status) => set({ isOfflineMode: status }),

  syncTickets: async (ticketsArray) => {
    const ticketsMap = ticketsArray.reduce((acc, ticket) => {
      acc[ticket.qrCode] = ticket;
      return acc;
    }, {} as Record<string, Ticket>);
    
    set({ tickets: ticketsMap });
    await AsyncStorage.setItem('@offline_tickets', JSON.stringify(ticketsMap));
  },

  scanTicketLocally: async (qrCode, count) => {
    const { tickets } = get();
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

    const updatedTicket: Ticket = {
      ...ticket,
      used: ticket.used + count,
      status: ((ticket.used + count) >= ticket.capacity ? 'used' : 'valid') as 'used' | 'valid'
    };

    const newTickets = { ...tickets, [qrCode]: updatedTicket };
    set({ tickets: newTickets });
    await AsyncStorage.setItem('@offline_tickets', JSON.stringify(newTickets));

    // Here we would also queue a sync action for when internet is back
    return { success: true, message: 'SIGA' };
  }
}));
