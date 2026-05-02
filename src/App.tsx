import { useState, useEffect } from 'react';
import { Home, Map as MapIcon, Coffee, Ticket, Bell, User, Sun, Moon, Activity } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from './lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { AppContext, type OrderNotification, type UserTicket, type MatchData } from './contexts/AppContext';
import './App.css';

// Import our views
import DashboardView from './components/DashboardView';
import MapView from './components/MapView';
import FoodView from './components/FoodView';
import TicketsView from './components/TicketsView';
import EntryView from './components/EntryView';
import ProfileView from './components/ProfileView';
import AdminView from './components/AdminView';
import AlertsView from './components/AlertsView';
import QueueView from './components/QueueView';
import AuthView from './components/AuthView';


console.log('[App.tsx] Module loaded');

function App() {
  console.log('[App.tsx] Rendering component...');
  const [hasEntered, setHasEntered] = useState(() => {
    return localStorage.getItem('has_entered') === 'true';
  });
  // Persist active tab across refreshes
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('last_active_tab') || 'home';
  });
  const [isLightMode, setIsLightMode] = useState(false);

  // Auth State — typed properly
  const [session, setSession] = useState<SupabaseUser | null>(null);
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem('isGuest') === 'true';
  });
  const [guestTicketData, setGuestTicketData] = useState<any>(() => {
    const saved = localStorage.getItem('guest_ticket_data');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('[App] Failed to parse guest ticket data:', e);
      return null;
    }
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userTicket, setUserTicket] = useState<UserTicket | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [homeLocation, setHomeLocation] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Unread alerts badge
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [orderNotification, setOrderNotification] = useState<OrderNotification | null>(null);

  // Request browser push notification permission on login
  const requestPushPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const showOrderNotification = (order: OrderNotification) => {
    setOrderNotification(order);
    // Also fire a browser push notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Order Placed! 🎉', {
        body: `${order.items.map(i => `${i.qty}x ${i.name}`).join(', ')} — ₹${order.total}`,
        icon: '/vite.svg',
      });
    }
    setTimeout(() => setOrderNotification(null), 6000);
  };

  // Persist guest state
  useEffect(() => {
    localStorage.setItem('isGuest', isGuest ? 'true' : 'false');
  }, [isGuest]);

  // Persist ticket data
  useEffect(() => {
    if (guestTicketData) {
      localStorage.setItem('guest_ticket_data', JSON.stringify(guestTicketData));
    } else {
      localStorage.removeItem('guest_ticket_data');
    }
  }, [guestTicketData]);

  useEffect(() => {
    let matchChannel: any = null;
    let ticketChannel: any = null;
    let userChannel: any = null;

    const setupListeners = async (user: SupabaseUser | null) => {
      // 1. Global Match Config Listener
      const { data: initialMatch } = await supabase
        .from('stadium_config')
        .select('*')
        .eq('id', 'current_match')
        .single();
      
      if (initialMatch) setMatchData(initialMatch as MatchData);

      matchChannel = supabase
        .channel('stadium_config_changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stadium_config', filter: 'id=eq.current_match' }, (payload) => {
          setMatchData(payload.new as MatchData);
        })
        .subscribe();

      if (user) {
        setIsGuest(false);
        requestPushPermission();

        // 2. User Ticket Listener
        const { data: initialTickets } = await supabase
          .from('user_tickets')
          .select('*')
          .eq('uid', user.id);
        
        if (initialTickets && initialTickets.length > 0) {
          setUserTicket(initialTickets[0] as UserTicket);
        } else {
          setUserTicket(null);
        }

        ticketChannel = supabase
          .channel('user_tickets_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'user_tickets', filter: `uid=eq.${user.id}` }, async () => {
             const { data } = await supabase
              .from('user_tickets')
              .select('*')
              .eq('uid', user.id);
            setUserTicket(data && data.length > 0 ? data[data.length - 1] as UserTicket : null);
          })
          .subscribe();

        // 3. User Document (Home Location)
        const { data: userData } = await supabase
          .from('users')
          .select('homeLocation')
          .eq('id', user.id)
          .single();
        
        if (userData?.homeLocation) {
          setHomeLocation(userData.homeLocation);
        }

        userChannel = supabase
          .channel('user_changes')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, (payload) => {
            if (payload.new.homeLocation) {
              setHomeLocation(payload.new.homeLocation);
            }
          })
          .subscribe();
      } else {
        setUserTicket(null);
        setHomeLocation(null);
      }
    };

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user || null;
      setSession(user);
      setupListeners(user);
      setIsCheckingAuth(false);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user || null;
      setSession(user);
      setupListeners(user);
      setIsCheckingAuth(false);
    });

    return () => {
      authSubscription.unsubscribe();
      if (matchChannel) supabase.removeChannel(matchChannel);
      if (ticketChannel) supabase.removeChannel(ticketChannel);
      if (userChannel) supabase.removeChannel(userChannel);
    };
  }, []);

  // Sync guest ticket data to the global userTicket state if no auth user
  useEffect(() => {
    if (!session && isGuest && guestTicketData) {
      setUserTicket(guestTicketData);
    }
  }, [session, isGuest, guestTicketData]);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

  // Live alert listener (shared globally)
  useEffect(() => {
    const setupAlerts = async () => {
      const { data } = await supabase
        .from('intel_alerts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        setAlerts(data);
        const lastRead = localStorage.getItem('last_read_alert_time') || '0';
        const newAlerts = data.filter(d => {
          const createdAt = (d as any).created_at;
          const time = new Date(createdAt).getTime();
          return time > parseInt(lastRead);
        });
        setUnreadAlerts(newAlerts.length);
      }
    };

    setupAlerts();

    const channel = supabase
      .channel('intel_alerts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'intel_alerts' }, () => {
        setupAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Clear badge when user opens alerts tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'alerts') {
      setUnreadAlerts(0);
      localStorage.setItem('last_read_alert_time', Date.now().toString());
    }
    localStorage.setItem('last_active_tab', tab);
  };

  // Ensure page opens from starting on tab change
  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':    return <DashboardView />;
      case 'map':     return <MapView />;
      case 'food':    return <FoodView />;
      case 'tickets': return <TicketsView />;
      case 'queues':  return <QueueView />;
      case 'alerts':  return <AlertsView />;
      case 'profile': return <ProfileView />;
      default:        return <DashboardView />;
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="app-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="intel-dot animate-pulse-glow" style={{ width: 16, height: 16 }} />
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  if (!hasEntered) {
    return (
      <EntryView 
        onEnter={() => {
          localStorage.setItem('has_entered', 'true');
          setHasEntered(true);
        }} 
        onBack={() => {
          setIsGuest(false);
          if (session) {
            supabase.auth.signOut();
          }
        }}
      />
    );
  }

  return (
    <AppContext.Provider value={{ 
      navigateTo: handleTabChange, 
      isGuest, 
      guestTicketData, 
      setGuestTicketData, 
      userTicket, 
      matchData, 
      homeLocation, 
      alerts,
      unreadAlerts,
      isCheckingAuth, 
      session,
      showOrderNotification, 
      requestPushPermission 
    }}>
      <div className="app-layout">
        {/* Universal Header */}
        <header className="app-header">
          <button className="icon-btn" style={{ background: 'var(--accent-secondary)' }} onClick={() => setActiveTab('home')}>
            <Home size={24} />
          </button>
          <div className="header-title" onClick={() => setActiveTab('home')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-primary)' }}>STADIA SYNC</span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: '-4px' }}>MATCH DAY HUB</span>
          </div>
          <div className="header-actions">
            <button className={`icon-btn ${activeTab === 'profile' ? 'active' : ''}`} style={{ background: 'var(--accent-warning)' }} onClick={() => handleTabChange('profile')}>
              <User size={24} />
            </button>
          </div>
        </header>

        {/* Main Scrollable Area */}
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

        {/* Global Order Notification Popup */}
        <AnimatePresence>
          {orderNotification && (
            <motion.div
              initial={{ opacity: 0, y: 80, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 80, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              style={{
                position: 'fixed', bottom: 110, left: 16, right: 16, zIndex: 9999,
                background: 'linear-gradient(135deg, rgba(16,22,36,0.98), rgba(30,40,60,0.98))',
                border: '1px solid rgba(99,102,241,0.5)',
                borderRadius: 20, padding: '18px 20px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)',
                backdropFilter: 'blur(24px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ fontSize: 32 }}>🎉</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#fff' }}>Order Confirmed!</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                    {orderNotification.items.map(i => `${i.qty}× ${i.name}`).join(', ')}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>₹{orderNotification.total}.00</span>
                    {orderNotification.seat && orderNotification.seat !== '--' && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 20 }}>
                        📍 {orderNotification.seat}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: 20 }}>
                      {orderNotification.deliveryMode === 'delivery' ? '🛵 Delivery' : '🏃 Pickup'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setOrderNotification(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}>✕</button>
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

        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          {[
            { id: 'home',    icon: Home,     label: 'Home' },
            { id: 'map',     icon: MapIcon,  label: 'Map' },
            { id: 'queues',  icon: Activity, label: 'Queues' },
            { id: 'food',    icon: Coffee,   label: 'Food' },
            { id: 'tickets', icon: Ticket,   label: 'Tickets' },
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
    </AppContext.Provider>
  );
}

export default App;
