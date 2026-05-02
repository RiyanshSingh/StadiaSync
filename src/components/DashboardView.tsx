import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, MapPin, Car, Train, Users, Award, ChevronRight, PlayCircle, Fingerprint, Ticket, Coffee, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { FALLBACK_ALERTS, FALLBACK_FACILITIES } from '../constants/fallbackData';
import SquadTrackerModal from './SquadTrackerModal';
import './DashboardView.css';

export default function DashboardView() {
  const { navigateTo, userTicket, guestTicketData, matchData, homeLocation, alerts: globalAlerts } = useApp();
  const displayTicket = userTicket || guestTicketData;
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState<any[]>([]);
  const alerts = globalAlerts.length > 0 ? globalAlerts.slice(0, 2) : FALLBACK_ALERTS.slice(0, 2);
  const [transportTimes, setTransportTimes] = useState({ metro: 4, car: 12 });
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);

  // Toast for stub actions
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const fetchFacilities = async () => {
      const { data } = await supabase.from('facilities').select('*');
      if (data && data.length > 0) {
        setFacilities(data);
      } else {
        setFacilities(FALLBACK_FACILITIES);
      }
    };

    fetchFacilities();

    const channel = supabase
      .channel('facilities_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, () => {
        fetchFacilities();
      })
      .subscribe();

    setLoading(false);

    // Simulate transport jitter
    const timer = setInterval(() => {
      setTransportTimes(prev => ({
        metro: Math.max(2, prev.metro + (Math.random() > 0.5 ? 1 : -1)),
        car: Math.max(5, prev.car + (Math.random() > 0.5 ? 1 : -1))
      }));
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="dashboard-container">

      {/* Loading Skeleton */}
      {loading && (
        <div className="dash-skeleton">
          <div className="skel-card skel-tall" />
          <div className="skel-row">
            <div className="skel-card skel-half" />
            <div className="skel-card skel-half" />
          </div>
          <div className="skel-card" />
          <div className="skel-card" />
        </div>
      )}
      {/* Active Pass / Next Action Widget */}
      <section className="active-pass-widget glass-panel">
        <div className="ap-top">
          <div className="ap-meta">
             <span className="live-status">{matchData?.status || 'LOCKED'}</span>
             <span className="game-timer text-accent-primary">{matchData?.timer || 'Starts soon'}</span>
          </div>
          <Ticket className="text-secondary" size={20} />
        </div>

        <div className="ap-body">
          <div className="match-title">
            <span className="team" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {displayTicket?.stadium || matchData?.stadium || 'Loading Stadium...'}
            </span>
          </div>
        </div>

        <div className="ap-details">
          <div className="ap-seat">
             <span className="label">Block</span>
             <span className="val">{displayTicket?.block || '--'}</span>
          </div>
          <div className="ap-seat">
             <span className="label">Row</span>
             <span className="val">{displayTicket?.row || '--'}</span>
          </div>
          <div className="ap-seat">
             <span className="label">Seat</span>
             <span className="val">{displayTicket?.seat || '--'}</span>
          </div>
          <div className="ap-seat" style={{ flex: 1, minWidth: 0 }}>
             <span className="label">Gate</span>
             <span className="val text-accent-primary">{displayTicket?.gate || '--'}</span>
          </div>
        </div>

        <div className="ap-footer">
          <div className="gate-note">
            <Zap size={14} className="text-accent-success" />
            <span>{displayTicket?.gate ? `${displayTicket.gate} has minimum wait time.` : 'Checking gate status...'}</span>
          </div>
          <button className="nav-seat-btn" onClick={() => navigateTo('map')}>
            <MapPin size={16} /> Navigate to Seat
          </button>
        </div>
      </section>

      {/* Nearby Amenities Carousel */}
      <section className="upcoming-matches">
        <div className="section-header-compact">
          <h3 className="section-title">Nearest Facilities</h3>
        </div>
        <div className="matches-scroll">
          {facilities.length > 0 ? (
            facilities.map((item) => (
              <motion.div key={item.id} whileTap={{ scale: 0.98 }} className="match-mini-card glass-panel" style={{ minWidth: '190px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', fontWeight: 600 }}>
                  <div className={`bento-icon bg-${item.color || 'primary'} text-accent-${item.color || 'primary'}`} style={{ width: '36px', height: '36px' }}>
                    {item.category === 'Restroom' ? <Users size={16} /> : item.category === 'Food' ? <Coffee size={16} /> : <Zap size={16} />}
                  </div>
                  <span>{item.name}</span>
                </div>
                <div className="match-mini-meta" style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '46px', marginTop: '4px' }}>
                  <p className={`text-accent-${item.status === 'Clear' ? 'success' : 'warning'}`} style={{ fontWeight: 600 }}>{item.status}</p>
                  <p>{item.dist}</p>
                </div>
              </motion.div>
            ))
          ) : (
             <div className="empty-state-p">Searching for nearby facilities...</div>
          )}
        </div>
      </section>

      {/* Smart Crowd Alerts — Live from Firestore */}
      <section className="crowd-alerts">
        <div className="section-header-compact">
          <h3 className="section-title">Live Intel</h3>
        </div>
        
        <div className="alert-stack">
          {alerts.map((alert) => (
            <motion.div 
              key={alert.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              whileTap={{ scale: 0.98 }} 
              className={`alert-card ${alert.type === 'warning' ? 'intel-warning' : 'intel-success'} glass-panel`}
            >
              <div className="alert-icon-wrap">
                {alert.type === 'warning' ? <Activity size={20} /> : <Zap size={20} />}
              </div>
              <div className="alert-content">
                <h4>{alert.title}</h4>
                <p>{alert.description}</p>
              </div>
              <ChevronRight size={16} className="text-secondary" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Control Center Grid */}
      <section className="quick-access">
        <div className="section-header-compact">
          <h3 className="section-title">Control Center</h3>
        </div>
        
        <div className="bento-grid">
          <motion.button whileTap={{ scale: 0.95 }} className="bento-box wide glass-panel" onClick={() => navigateTo('map')}>
            <div className="bento-icon bg-tertiary text-accent-tertiary">
              <MapPin size={22} />
            </div>
            <div className="bento-info">
              <span className="feature-title">Your Seat</span>
              <span className="feature-desc">
                {displayTicket?.block || 'Block --'}, Row {displayTicket?.row || '--'} • 4 min walk
              </span>
            </div>
            <div className="bento-action"><ChevronRight size={18} /></div>
          </motion.button>

          <motion.button whileTap={{ scale: 0.95 }} className="bento-box square glass-panel" onClick={() => showToast('Replays loading... Coming Soon!')}>
             <div className="bento-icon bg-success text-accent-success">
              <PlayCircle size={24} />
            </div>
            <span className="feature-title mt-top">Watch<br/>Replays</span>
          </motion.button>
          
          <motion.button whileTap={{ scale: 0.95 }} className="bento-box square glass-panel" onClick={() => setIsSquadModalOpen(true)}>
             <div className="bento-icon bg-primary text-primary">
              <Users size={24} />
            </div>
            <span className="feature-title mt-top">Squad<br/>Tracker</span>
          </motion.button>
        </div>
      </section>

      {/* Upgrades Promo */}
      <section className="promo-banner">
        <div className="promo-shimmer"></div>
        <div className="promo-content">
          <div className="promo-text">
            <div className="vip-badge"><Award size={14} /> VIP Access</div>
            <h4>Legends Lounge</h4>
            <p>Upgrade to premium for Half-Time.</p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} className="promo-btn" onClick={() => showToast('VIP Upgrade — available at Gate 4 Concierge!')}>
            <Fingerprint size={16} /> Unlock
          </motion.button>
        </div>
      </section>

      {/* Transport & Departure */}
      <section className="transport-section">
        <div className="section-header-compact">
          <h3 className="section-title">Transport to {homeLocation ? homeLocation : 'Home'}</h3>
          <div className="live-pill-mini">
            <span className="dot pulse"></span> LIVE
          </div>
        </div>
        <div className="transport-list">
          <div className="transport-item glass-panel">
            <div className="bg-icon train-bg"><Train size={18} /></div>
            <div className="trans-info">
              <span className="trans-mode">{homeLocation ? `Metro towards ${homeLocation}` : 'Ahmedabad Metro (Purple Line)'}</span>
              <span className="trans-status text-accent-success">On Time • 2 min walk</span>
            </div>
            <div className="trans-time">{transportTimes.metro}m</div>
          </div>
          
          <div className="transport-item glass-panel">
            <div className="bg-icon car-bg"><Car size={18} /></div>
            <div className="trans-info">
              <span className="trans-mode">{homeLocation ? `Rideshare to ${homeLocation}` : 'Ola/Uber Zone B'}</span>
              <span className="trans-status text-accent-warning">1.5x Surge • Moderate wait</span>
            </div>
            <div className="trans-time">{transportTimes.car}m</div>
          </div>
        </div>
      </section>

      {/* Dashboard Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            style={{
              position: 'fixed', bottom: '90px', left: '16px', right: '16px',
              zIndex: 200, display: 'flex', alignItems: 'center', gap: '12px',
              background: 'var(--bg-elevated)', border: '3px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', padding: '16px',
              boxShadow: 'var(--shadow-sm)', maxWidth: '480px', margin: '0 auto'
            }}
          >
            <CheckCircle2 size={20} className="text-accent-success" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <SquadTrackerModal isOpen={isSquadModalOpen} onClose={() => setIsSquadModalOpen(false)} />
    </div>
  );
}
