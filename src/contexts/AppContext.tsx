import { createContext, useContext } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type AppTab = 'home' | 'map' | 'food' | 'tickets' | 'queues' | 'alerts' | 'profile' | 'admin';

export interface UserTicket {
  stadium: string;
  block: string;
  gate: string;
  row: string;
  seat: string;
  ticket_id?: string;
  date?: string;
  time?: string;
  section?: string;
}

export interface AlertData {
  id: string;
  title: string;
  description: string;
  type: 'emergency' | 'warning' | 'success' | 'info';
  created_at?: string;
}

export interface MatchData {
  id: string;
  stadium: string;
  date: string;
  time: string;
  status: string;
  timer: string;
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
  navigateTo: (tab: AppTab) => void;
  isGuest: boolean;
  isSupabaseEnabled: boolean;
  guestTicketData: UserTicket | null;
  setGuestTicketData: (data: UserTicket | null) => void;
  userTicket: UserTicket | null;
  matchData: MatchData | null;
  homeLocation: string | null;
  alerts: AlertData[];
  unreadAlerts: number;
  isCheckingAuth: boolean;
  session: SupabaseUser | null;
  setIsGuest: (val: boolean) => void;
  setUserTicket: (ticket: UserTicket | null) => void;
  showOrderNotification: (order: OrderNotification) => void;
  requestPushPermission: () => void;
}

export const AppContext = createContext<AppContextType>({
  navigateTo: () => {},
  isGuest: false,
  isSupabaseEnabled: false,
  guestTicketData: null,
  setGuestTicketData: () => {},
  userTicket: null,
  matchData: null,
  homeLocation: null,
  alerts: [],
  unreadAlerts: 0,
  isCheckingAuth: true,
  session: null,
  setIsGuest: () => {},
  setUserTicket: () => {},
  showOrderNotification: () => {},
  requestPushPermission: () => {},
});


export const useApp = () => useContext(AppContext);

