import { createContext, useContext } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserTicket {
  stadium: string;
  block: string;
  gate: string;
  row: string;
  seat: string;
  ticket_id: string;
  date: string;
  time: string;
  section?: string;
}

export interface MatchData {
  stadium: string;
  date: string;
  time: string;
  status: string;
  timer: string;
  [key: string]: any;
}

export interface OrderNotification {
  id: string;
  items: { name: string; qty: number }[];
  total: number;
  deliveryMode: 'pickup' | 'delivery';
  seat: string;
  timestamp: number;
}

interface AppContextType {
  navigateTo: (tab: string) => void;
  isGuest: boolean;
  guestTicketData: UserTicket | null;
  setGuestTicketData: (data: UserTicket | null) => void;
  userTicket: UserTicket | null;
  matchData: MatchData | null;
  homeLocation: string | null;
  alerts: any[];
  unreadAlerts: number;
  isCheckingAuth: boolean;
  session: SupabaseUser | null;
  showOrderNotification: (order: OrderNotification) => void;
  requestPushPermission: () => void;
}

export const AppContext = createContext<AppContextType>({
  navigateTo: () => {},
  isGuest: false,
  guestTicketData: null,
  setGuestTicketData: () => {},
  userTicket: null,
  matchData: null,
  homeLocation: null,
  alerts: [],
  unreadAlerts: 0,
  isCheckingAuth: true,
  session: null,
  showOrderNotification: () => {},
  requestPushPermission: () => {},
});


export const useApp = () => useContext(AppContext);


