import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, MapPin, Car, Train, Users, Award, ChevronRight, PlayCircle, Fingerprint, Ticket, Coffee, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logPerkAction, type PerkCatalogRow, type ReplayItemRow } from '../lib/appData';
import { useApp } from '../contexts/AppContext';
import SquadTrackerModal from './SquadTrackerModal';
import './DashboardView.css';

interface FacilityItem {
  id: string;
  name: string;
  category: string;
  status: string;
  dist: string;
  color?: string | null;
  stadium?: string | null;
}

interface TransportOption {
  id: string;
  mode: 'metro' | 'car';
  title: string;
  subtitle: string;
  eta_min: number;
  stadium?: string | null;
}

export default function DashboardView() {
  const { isSupabaseEnabled, navigateTo, session, userTicket, guestTicketData, matchData, homeLocation, alerts: globalAlerts } = useApp();
  const displayTicket = userTicket || guestTicketData;
  const [loading, setLoading] = useState(true);
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [replayItem, setReplayItem] = useState<ReplayItemRow | null>(null);
  const [vipPerk, setVipPerk] = useState<PerkCatalogRow | null>(null);
  const [transportOptions, setTransportOptions] = useState<TransportOption[]>([]);
  const alerts = globalAlerts.slice(0, 2);
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);

  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const client = supabase;
    let isMounted = true;

    const loadDashboardData = async () => {
      if (!client || !isSupabaseEnabled) {
        if (isMounted) {
          setFacilities([]);
          setReplayItem(null);
          setVipPerk(null);
          setTransportOptions([]);
          setLoading(false);
        }
        return;
      }

      const [facilitiesRes, replayRes, perksRes, transportRes] = await Promise.all([
        client.from('facilities').select('*').order('name'),
        client.from('replay_items').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(1),
        client.from('perk_catalog').select('*').eq('status', 'active').eq('category', 'dashboard').limit(1),
        client.from('transport_options').select('*').order('eta_min', { ascending: true }),
      ]);

      if (!isMounted) {
        return;
      }

      const currentStadium = displayTicket?.stadium ?? matchData?.stadium ?? null;
      const allFacilities = (facilitiesRes.data as FacilityItem[] | null) ?? [];
      const allTransport = (transportRes.data as TransportOption[] | null) ?? [];

      setFacilities(
        allFacilities.filter((item) => !currentStadium || !item.stadium || item.stadium === currentStadium),
      );
      setReplayItem((replayRes.data?.[0] as ReplayItemRow | undefined) ?? null);
      setVipPerk((perksRes.data?.[0] as PerkCatalogRow | undefined) ?? null);
      setTransportOptions(
        allTransport.filter((item) => !currentStadium || !item.stadium || item.stadium === currentStadium),
      );
      setLoading(false);
    };

    void loadDashboardData();

    const channels = client
      ? [
          client.channel('facilities_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, () => void loadDashboardData()).subscribe(),
          client.channel('replay_items_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'replay_items' }, () => void loadDashboardData()).subscribe(),
          client.channel('perk_catalog_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'perk_catalog' }, () => void loadDashboardData()).subscribe(),
          client.channel('transport_options_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'transport_options' }, () => void loadDashboardData()).subscribe(),
        ]
      : [];

    return () => {
      isMounted = false;
      if (client) {
        channels.forEach((channel) => void client.removeChannel(channel));
      }
    };
  }, [displayTicket?.stadium, isSupabaseEnabled, matchData?.stadium]);

  const handleReplayOpen = () => {
    if (!replayItem) {
      showToast('No replay clips are published for this match yet.');
      return;
    }

    showToast(`Replay ready: ${replayItem.title}`);
  };

  const handlePerkUnlock = async () => {
    if (!vipPerk || !session || !supabase) {
      showToast('No live VIP perk is configured right now.');
      return;
    }

    const { error } = await logPerkAction(supabase, {
      uid: session.id,
      perkId: vipPerk.id,
      action: 'unlock',
      metadata: {
        title: vipPerk.title,
      },
    });

    if (error) {
      showToast(`Perk unlock failed: ${error.message}`);
      return;
    }

    showToast(`${vipPerk.title} unlocked.`);
  };

  return (
    <div className="dashboard-container">
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

      <section className="active-pass-widget glass-panel">
        <div className="ap-top">
          <div className="ap-meta">
             <span className="live-status">{matchData?.status || 'LOCKED'}</span>
          </div>
          <Ticket className="text-primary" size={20} />
        </div>

        <div className="ap-body">
          <div className="match-title">
            <span className="team" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {displayTicket?.stadium || matchData?.stadium || 'Match data unavailable'}
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
            <span>{displayTicket?.gate ? `Assigned entry: ${displayTicket.gate}` : 'Link a ticket to unlock gate guidance.'}</span>
          </div>
          <button className="nav-seat-btn" onClick={() => navigateTo('map')}>
            <MapPin size={16} /> Navigate to Seat
          </button>
        </div>
      </section>

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
             <div className="empty-state-p">No live facility data is configured yet.</div>
          )}
        </div>
      </section>

      <section className="crowd-alerts">
        <div className="section-header-compact">
          <h3 className="section-title">Live Intel</h3>
        </div>

        <div className="alert-stack">
          {alerts.length > 0 ? alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              whileTap={{ scale: 0.98 }}
              className={`alert-card ${alert.type === 'warning' ? 'intel-warning' : 'intel-success'} glass-panel`}
              onClick={() => navigateTo(alert.type === 'warning' || alert.type === 'emergency' ? 'alerts' : 'map')}
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
          )) : (
            <div className="empty-state-p">No alerts have been published for this match.</div>
          )}
        </div>
      </section>

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

          <motion.button whileTap={{ scale: 0.95 }} className="bento-box square glass-panel" onClick={handleReplayOpen}>
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

      <section className="promo-banner">
        <div className="promo-shimmer"></div>
        <div className="promo-content">
          <div className="promo-text">
            <div className="vip-badge"><Award size={14} /> VIP Access</div>
            <h4>{vipPerk?.title || 'No live perk'}</h4>
            <p>{vipPerk?.description || 'Create a dashboard perk in Supabase to feature it here.'}</p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} className="promo-btn" onClick={handlePerkUnlock}>
            <Fingerprint size={16} /> {vipPerk?.cta_label || 'Unlock'}
          </motion.button>
        </div>
      </section>

      <section className="transport-section">
        <div className="section-header-compact">
          <h3 className="section-title">Transport to {homeLocation ? homeLocation : 'Home'}</h3>
          <div className="live-pill-mini">
            LIVE
          </div>
        </div>
        <div className="transport-list">
          {transportOptions.length > 0 ? transportOptions.map((option) => (
            <div key={option.id} className="transport-item glass-panel">
              <div className={`bg-icon ${option.mode === 'metro' ? 'train-bg' : 'car-bg'}`}>
                {option.mode === 'metro' ? <Train size={18} /> : <Car size={18} />}
              </div>
              <div className="trans-info">
                <span className="trans-mode">{option.title}</span>
                <span className={`trans-status ${option.mode === 'metro' ? 'text-accent-success' : 'text-accent-warning'}`}>{option.subtitle}</span>
              </div>
              <div className="trans-time">{option.eta_min}m</div>
            </div>
          )) : (
            <div className="empty-state-p">No transport data is configured for this venue.</div>
          )}
        </div>
      </section>

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
