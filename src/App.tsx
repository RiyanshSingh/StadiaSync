import { useEffect, useRef, useState } from 'react';
import { Home, Map as MapIcon, Coffee, Ticket, User, Activity, Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RealtimeChannel, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseEnabled } from './lib/supabase';
import { ensureUserProfile, type UserProfileRow } from './lib/appData';
import {
  AppContext,
  type AlertData,
  type AppTab,
  type MatchData,
  type OrderNotification,
  type UserTicket,
} from './contexts/AppContext';
import './App.css';

import DashboardView from './components/DashboardView';
import MapView from './components/MapView';
import FoodView from './components/FoodView';
import TicketsView from './components/TicketsView';
import EntryView from './components/EntryView';
import ProfileView from './components/ProfileView';
import AlertsView from './components/AlertsView';
import QueueView from './components/QueueView';
import AuthView from './components/AuthView';
import AdminView from './components/AdminView';

const VALID_TABS: AppTab[] = ['home', 'map', 'food', 'tickets', 'queues', 'alerts', 'profile', 'admin'];

function getStoredTab(): AppTab {
  const storedTab = localStorage.getItem('last_active_tab');
  return VALID_TABS.includes(storedTab as AppTab) ? (storedTab as AppTab) : 'home';
}

function App() {
  const [hasEntered, setHasEntered] = useState(() => localStorage.getItem('has_entered') === 'true');
  const [activeTab, setActiveTab] = useState<AppTab>(getStoredTab);
  const [session, setSession] = useState<SupabaseUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const tabSyncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [guestTicketData, setGuestTicketData] = useState<UserTicket | null>(() => {
    const saved = localStorage.getItem('guest_ticket_data');
    try {
      return saved ? (JSON.parse(saved) as UserTicket) : null;
    } catch (error) {
      console.error('[App] Failed to parse guest ticket data:', error);
      return null;
    }
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(isSupabaseEnabled);
  const [userTicket, setUserTicket] = useState<UserTicket | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [homeLocation, setHomeLocation] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [orderNotification, setOrderNotification] = useState<OrderNotification | null>(null);

  const requestPushPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  };

  const showOrderNotification = (order: OrderNotification) => {
    setOrderNotification(order);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Order Placed!', {
        body: `${order.items.map((item) => `${item.qty}x ${item.name}`).join(', ')} - Rs ${order.total}`,
        icon: '/favicon.svg',
      });
    }

    window.setTimeout(() => setOrderNotification(null), 6000);
  };

  useEffect(() => {
    if (guestTicketData) {
      localStorage.setItem('guest_ticket_data', JSON.stringify(guestTicketData));
      return;
    }

    localStorage.removeItem('guest_ticket_data');
  }, [guestTicketData]);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseEnabled || !client) {
      return;
    }

    let isMounted = true;

    const syncSession = (user: SupabaseUser | null) => {
      if (!isMounted) {
        return;
      }

      setSession(user);
      setIsCheckingAuth(false);
      setIsGuest(Boolean(user?.is_anonymous));

      if (user) {
        setGuestTicketData(null);
      }
    };

    client.auth.getSession().then(({ data }) => {
      syncSession(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, currentSession) => {
      syncSession(currentSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseEnabled || !client) {
      return;
    }

    let isCancelled = false;
    let matchChannel: RealtimeChannel | null = null;
    let ticketChannel: RealtimeChannel | null = null;
    let userChannel: RealtimeChannel | null = null;

    const loadAppData = async () => {
      const { data: currentMatch } = await client
        .from('stadium_config')
        .select('*')
        .eq('id', 'current_match')
        .maybeSingle();

      if (!isCancelled) {
        setMatchData((currentMatch as MatchData | null) ?? null);
      }

      matchChannel = client
        .channel('stadium_config_changes')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'stadium_config', filter: 'id=eq.current_match' },
          (payload) => {
            setMatchData(payload.new as MatchData);
          },
        )
        .subscribe();

      if (!session) {
        // Don't wipe userTicket here — initial session is null before auth resolves.
        // handleSignOut() already sets userTicket to null on explicit sign-out.
        if (!isCancelled) {
          setHomeLocation(null);
        }
        return;
      }

      await ensureUserProfile(client, session);
      requestPushPermission();

      const loadLatestTicket = async () => {
        const { data } = await client
          .from('user_tickets')
          .select('*')
          .eq('uid', session.id)
          .order('timestamp', { ascending: false })
          .limit(1);

        if (!isCancelled) {
          setUserTicket((data?.[0] as UserTicket | undefined) ?? null);
        }
      };

      const loadHomeLocation = async () => {
        const { data } = await client
          .from('users')
          .select('*')
          .eq('id', session.id)
          .maybeSingle();

        if (!isCancelled) {
          const profile = data as UserProfileRow | null;
          setHomeLocation(profile?.homeLocation ?? null);
          setHasEntered(Boolean(profile?.onboarded));
          if (profile?.last_active_tab && VALID_TABS.includes(profile.last_active_tab as AppTab)) {
            setActiveTab(profile.last_active_tab as AppTab);
          }
        }
      };

      await Promise.all([loadLatestTicket(), loadHomeLocation()]);

      ticketChannel = client
        .channel(`user_tickets_changes:${session.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_tickets', filter: `uid=eq.${session.id}` },
          () => {
            void loadLatestTicket();
          },
        )
        .subscribe();

      userChannel = client
        .channel(`user_changes:${session.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${session.id}` },
          (payload) => {
            const profile = payload.new as UserProfileRow;
            setHomeLocation(profile.homeLocation ?? null);
            setHasEntered(Boolean(profile.onboarded));
          },
        )
        .subscribe();
    };

    void loadAppData();

    return () => {
      isCancelled = true;
      if (matchChannel) {
        void client.removeChannel(matchChannel);
      }
      if (ticketChannel) {
        void client.removeChannel(ticketChannel);
      }
      if (userChannel) {
        void client.removeChannel(userChannel);
      }
    };
  }, [session]);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseEnabled || !client) {
      return;
    }

    let isCancelled = false;

    const setupAlerts = async () => {
      const { data } = await client
        .from('intel_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!data || isCancelled) {
        return;
      }

      const nextAlerts = data as AlertData[];
      setAlerts(nextAlerts);

      const lastRead = Number(localStorage.getItem('last_read_alert_time') || '0');
      const newAlerts = nextAlerts.filter((alert) => {
        if (!alert.created_at) {
          return false;
        }

        return new Date(alert.created_at).getTime() > lastRead;
      });

      setUnreadAlerts(newAlerts.length);
    };

    void setupAlerts();

    const channel = client
      .channel('intel_alerts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'intel_alerts' }, () => {
        void setupAlerts();
      })
      .subscribe();

    return () => {
      isCancelled = true;
      void client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    if (mainContent instanceof HTMLElement) {
      mainContent.scrollTop = 0;
    }

    window.scrollTo(0, 0);
  }, [activeTab]);

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    localStorage.setItem('last_active_tab', tab);

    if (tab === 'alerts') {
      setUnreadAlerts(0);
      localStorage.setItem('last_read_alert_time', Date.now().toString());
    }

    // Debounce DB sync — only write after 1.5s of no further tab changes
    if (tabSyncTimeout.current) {
      clearTimeout(tabSyncTimeout.current);
    }
    if (session && supabase) {
      tabSyncTimeout.current = setTimeout(() => {
        void supabase.from('users').upsert({
          id: session.id,
          last_active_tab: tab,
          ...(tab === 'alerts' ? { last_alert_read_at: new Date().toISOString() } : {}),
        });
      }, 1500);
    }
  };

  const handleGuestStart = async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      throw error;
    }
  };

  const handleSignOut = async () => {
    setIsGuest(false);
    setGuestTicketData(null);
    setUserTicket(null);
    setHasEntered(false);
    localStorage.removeItem('has_entered');
    localStorage.removeItem('last_active_tab');
    localStorage.removeItem('last_read_alert_time');

    const client = supabase;
    if (client) {
      await client.auth.signOut();
    } else {
      setSession(null);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <DashboardView />;
      case 'map':
        return <MapView />;
      case 'food':
        return <FoodView />;
      case 'tickets':
        return <TicketsView />;
      case 'queues':
        return <QueueView />;
      case 'alerts':
        return <AlertsView />;
      case 'profile':
        return <ProfileView />;
      case 'admin':
        return <AdminView />;
      default:
        return <DashboardView />;
    }
  };

  const showAuth = !session;
  const showEntry = !showAuth && !hasEntered;

  return (
    <AppContext.Provider
      value={{
        navigateTo: handleTabChange,
        isGuest,
        isSupabaseEnabled,
        setIsGuest,
        guestTicketData,
        setGuestTicketData,
        userTicket,
        setUserTicket,
        matchData,
        homeLocation,
        alerts,
        unreadAlerts,
        isCheckingAuth,
        session,
        showOrderNotification,
        requestPushPermission,
      }}
    >
      {isCheckingAuth ? (
        <div className="app-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="intel-dot animate-pulse-glow" style={{ width: 16, height: 16 }} />
        </div>
      ) : showAuth ? (
        <AuthView onContinueAsGuest={handleGuestStart} />
      ) : showEntry ? (
        <EntryView
          onEnter={() => {
            localStorage.setItem('has_entered', 'true');
            setHasEntered(true);
            if (session && supabase) {
              void supabase.from('users').upsert({
                id: session.id,
                onboarded: true,
              });
            }
          }}
          onBack={() => {
            void handleSignOut();
          }}
        />
      ) : (
        <div className="app-layout">
          <header className="app-header">
            <button
              className="icon-btn"
              style={{ background: 'var(--accent-secondary)' }}
              onClick={() => handleTabChange('home')}
            >
              <Home size={24} />
            </button>
            <div
              className="header-title"
              onClick={() => handleTabChange('home')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                STADIA SYNC
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  marginTop: '-4px',
                }}
              >
                MATCH DAY HUB
              </span>
            </div>
            <div className="header-actions">
              <button
                className={`icon-btn ${activeTab === 'alerts' ? 'active' : ''}`}
                style={{ background: 'var(--accent-tertiary)' }}
                onClick={() => handleTabChange('alerts')}
              >
                <Bell size={22} />
                {unreadAlerts > 0 && <span className="badge-count">{unreadAlerts > 9 ? '9+' : unreadAlerts}</span>}
              </button>
              <button
                className={`icon-btn ${activeTab === 'profile' ? 'active' : ''}`}
                style={{ background: 'var(--accent-warning)' }}
                onClick={() => handleTabChange('profile')}
              >
                <User size={24} />
              </button>
            </div>
          </header>

          <main className="main-content">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                style={{ minHeight: '100%' }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>

          <AnimatePresence>
            {orderNotification && (
              <motion.div
                initial={{ opacity: 0, y: 80, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 80, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                style={{
                  position: 'fixed',
                  bottom: 110,
                  left: 16,
                  right: 16,
                  zIndex: 9999,
                  background: 'linear-gradient(135deg, rgba(16,22,36,0.98), rgba(30,40,60,0.98))',
                  border: '1px solid rgba(99,102,241,0.5)',
                  borderRadius: 20,
                  padding: '18px 20px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)',
                  backdropFilter: 'blur(24px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ fontSize: 32 }}>🎉</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#fff' }}>Order Confirmed!</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                      {orderNotification.items.map((item) => `${item.qty}x ${item.name}`).join(', ')}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>Rs {orderNotification.total}.00</span>
                      {orderNotification.seat && orderNotification.seat !== '--' && (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.5)',
                            background: 'rgba(255,255,255,0.08)',
                            padding: '2px 8px',
                            borderRadius: 20,
                          }}
                        >
                          Seat {orderNotification.seat}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.5)',
                          background: 'rgba(99,102,241,0.15)',
                          padding: '2px 8px',
                          borderRadius: 20,
                        }}
                      >
                        {orderNotification.deliveryMode === 'delivery' ? 'Delivery' : 'Pickup'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setOrderNotification(null)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}
                  >
                    X
                  </button>
                </div>
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 6, ease: 'linear' }}
                  style={{ height: 2, background: 'linear-gradient(90deg, #6366f1, #a78bfa)', borderRadius: 2, marginTop: 14 }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <nav className="bottom-nav">
            {[
              { id: 'home' as const, icon: Home, label: 'Home' },
              { id: 'map' as const, icon: MapIcon, label: 'Map' },
              { id: 'queues' as const, icon: Activity, label: 'Queues' },
              { id: 'food' as const, icon: Coffee, label: 'Food' },
              { id: 'tickets' as const, icon: Ticket, label: 'Tickets' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="nav-label">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="nav-indicator"
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </AppContext.Provider>
  );
}

export default App;
