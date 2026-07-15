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
      acc[ticket.order_id] = ticket;
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

    if (ticket.status === 'used' || ticket.accesos_restantes <= 0) {
      return { success: false, message: 'Ya ingresó' };
    }

    if (count > ticket.accesos_restantes) {
      return { success: false, message: `Solo quedan ${ticket.accesos_restantes} cupos` };
    }

    const updatedTicket: Ticket = {
      ...ticket,
      accesos_restantes: ticket.accesos_restantes - count,
      status: ((ticket.accesos_restantes - count) <= 0 ? 'used' : 'paid')
    };

    const newTickets = { ...tickets, [qrCode]: updatedTicket };
    set({ tickets: newTickets });
    await AsyncStorage.setItem('@offline_tickets', JSON.stringify(newTickets));

    // Here we would also queue a sync action for when internet is back
    return { success: true, message: 'SIGA' };
  }
}));
