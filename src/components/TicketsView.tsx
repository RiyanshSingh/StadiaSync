import { QrCode, Share, Download, MapPin, Calendar, Clock, CheckCircle2, ScanLine, CreditCard, ChevronRight, HelpCircle, Coffee, ShieldCheck, Target, Zap, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { createSupportRequest, createTicketActionRequest, type PerkCatalogRow } from '../lib/appData';
import { useApp } from '../contexts/AppContext';
import './TicketsView.css';

export default function TicketsView() {
  const { navigateTo, session, userTicket, guestTicketData, matchData } = useApp();
  const [toastMessage, setToastMessage] = useState('');
  const [fallbackTicketId] = useState(() => `STS-${Date.now().toString().slice(-8)}`);
  const [bannerPerk, setBannerPerk] = useState<PerkCatalogRow | null>(null);
  const [ticketStatPerks, setTicketStatPerks] = useState<PerkCatalogRow[]>([]);

  const displayTicket = userTicket || guestTicketData;
  const ticketData = displayTicket || {
    block: '--',    row: '--',
    seat: '--',
    gate: '--',
    date: matchData?.date || '--',
    time: matchData?.time || '--',
    stadium: '--',
    ticket_id: fallbackTicketId
  };

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    const loadTicketPerks = async () => {
      const [bannerRes, statsRes] = await Promise.all([
        client.from('perk_catalog').select('*').eq('status', 'active').eq('category', 'ticket_banner').limit(1),
        client.from('perk_catalog').select('*').eq('status', 'active').eq('category', 'ticket_stat').limit(3),
      ]);

      setBannerPerk((bannerRes.data?.[0] as PerkCatalogRow | undefined) ?? null);
      setTicketStatPerks((statsRes.data as PerkCatalogRow[] | null) ?? []);
    };

    void loadTicketPerks();
  }, []);

  // Removed local listeners as they are now centralized in App.tsx

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const submitTicketAction = async (actionType: 'wallet' | 'transfer' | 'sell') => {
    if (!supabase || !session) {
      showToast('A live session is required for ticket actions.');
      return;
    }

    const { error } = await createTicketActionRequest(supabase, {
      uid: session.id,
      ticketId: ticketData.ticket_id || null,
      actionType,
      metadata: {
        stadium: ticketData.stadium,
        block: ticketData.block,
        seat: ticketData.seat,
      },
    });

    if (error) {
      showToast(`${actionType} request failed: ${error.message}`);
      return;
    }

    showToast(`${actionType} request saved to Supabase.`);
  };

  const requestSupport = async () => {
    if (!supabase || !session) {
      showToast('A live session is required to contact support.');
      return;
    }

    const { error } = await createSupportRequest(supabase, {
      uid: session.id,
      category: 'stadium_help',
      ticketId: ticketData.ticket_id || null,
      message: `Support requested for ${ticketData.stadium}, gate ${ticketData.gate}.`,
    });

    if (error) {
      showToast(`Support request failed: ${error.message}`);
      return;
    }

    showToast('Support request created.');
  };

  return (
    <div className="tickets-container">
      {/* Header */}
      <div className="tickets-header">
        <h2 className="display-title">My <span className="text-accent-primary">Wallet.</span></h2>
        <p className="page-subtitle">Ready for the big game.</p>
      </div>

      {/* ── Premium Redesigned Ticket ── */}
      <motion.div
        className="active-ticket-wrapper"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      >
        <div className="digital-ticket">

          {/* ── Hero: Simplified Header ── */}
          <div className="ticket-hero simplified">
            <div className="ticket-header-row">
              <div className="ticket-league-badge">
                <span className="league-logo-text">ENTRY</span>
              </div>
              <div className="ticket-status-pill">
                <span className="status-live-dot" />
                VALID
              </div>
            </div>
            <div className="ticket-venue-title">
              {ticketData.stadium || 'Stadium Entry'}
            </div>
          </div>

          {/* ── Perforated Separator ── */}
          <div className="ticket-perforation">
            <div className="perf-notch" />
            <hr className="perf-line" />
            <div className="perf-notch" />
          </div>

          {/* ── Seat Info ── */}
          <div className="ticket-seat-section">
            <div className="seat-info-top">
              <div className="seat-info-cell block-cell">
                <span className="cell-label">Block</span>
                <span className="cell-value">{ticketData.block}</span>
              </div>
            </div>
            <div className="seat-info-grid">
              <div className="seat-info-cell">
                <span className="cell-label">Row</span>
                <span className="cell-value">{ticketData.row}</span>
              </div>
              <div className="seat-info-cell">
                <span className="cell-label">Seat</span>
                <span className="cell-value">{ticketData.seat}</span>
              </div>
              <div className="seat-info-cell">
                <span className="cell-label">Gate</span>
                <span className="cell-value accent">{ticketData.gate}</span>
              </div>
            </div>

            {/* Event Meta */}
            <div className="ticket-event-meta">
              <div className="meta-item">
                <Calendar size={12} />
                {ticketData.date}
              </div>
              <div className="meta-item">
                <Clock size={12} />
                {ticketData.time}
              </div>
            </div>
          </div>

          {/* ── QR Code + Badges ── */}
          <div className="ticket-qr-section">
            <motion.div className="qr-box" whileTap={{ scale: 0.97 }}>
              <div className="qr-scan-line" />
              <QrCode size={100} strokeWidth={1} className="qr-icon" />
            </motion.div>

            <div className="qr-details">
              <p className="qr-ticket-id">ID: {ticketData.ticket_id}</p>
              <div className="valid-badge">
                <CheckCircle2 size={12} />
                Verified Entry
              </div>
              <div className="nfc-badge">
                <ScanLine size={12} />
                Tap to Scan
              </div>
            </div>
          </div>

        </div>
      </motion.div>

      {/* Actions */}
      <div className="ticket-actions">
        <button className="action-btn-p primary-action-p" onClick={() => void submitTicketAction('wallet')}>
          <CreditCard size={18} />
          <span>Add to Apple Wallet</span>
          <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.6 }} />
        </button>
        <div className="action-row">
          <button className="action-btn-p secondary-action-p" onClick={() => void submitTicketAction('transfer')}>
            <Share size={16} />
            <span>Transfer</span>
          </button>
          <button className="action-btn-p secondary-action-p" onClick={() => void submitTicketAction('sell')}>
            <Download size={16} />
            <span>Sell</span>
          </button>
        </div>
      </div>

      {/* Support Utilities */}
      <section className="utility-grid-section">
        <h3 className="section-title">Support & Utilities</h3>
        <div className="utility-grid">
          <div className="util-card glass-panel" onClick={() => navigateTo('map')}>
            <div className="util-icon-circle blue"><MapPin size={20} /></div>
            <div className="util-info">
              <h6>Gate {ticketData.gate} Navigation</h6>
              <p>Tap to open stadium map</p>
            </div>
            <ChevronRight size={16} className="text-tertiary" />
          </div>

          <div className="util-card glass-panel" onClick={() => void requestSupport()}>
            <div className="util-icon-circle yellow"><HelpCircle size={20} /></div>
            <div className="util-info">
              <h6>Stadium Help</h6>
              <p>Lost & Found, First Aid</p>
            </div>
            <ChevronRight size={16} className="text-tertiary" />
          </div>

          <div className="util-card glass-panel" onClick={() => navigateTo('food')}>
            <div className="util-icon-circle red"><Coffee size={20} /></div>
            <div className="util-info">
              <h6>Food Pre-orders</h6>
              <p>Check active orders</p>
            </div>
            <ChevronRight size={16} className="text-tertiary" />
          </div>
        </div>
      </section>

      {/* Premium Perk Banner */}
      <div className="loyalty-banner glass-panel-elevated">
        <div className="loyalty-content">
          <div className="loyalty-tag">PREMIUM MATCH PERK</div>
          <h4>{bannerPerk?.title || 'No live ticket perk'}</h4>
          <p className="text-secondary">{bannerPerk?.description || 'Create a ticket_banner perk in Supabase to feature it here.'}</p>
        </div>
        <div className="shield-bg"><ShieldCheck size={80} strokeWidth={1} /></div>
      </div>

      {/* Stats Pills */}
      <section className="ticket-stats-region">
        {(ticketStatPerks.length > 0 ? ticketStatPerks : [
          { id: 'fallback-1', title: 'Ticket perks pending', description: '', cta_label: '', category: 'ticket_stat', status: 'active' },
        ]).map((perk, index) => (
          <div key={perk.id} className="stat-pill glass-panel">
            {index === 0 ? <Target size={14} className="text-accent-secondary" /> : index === 1 ? <Zap size={14} className="text-accent-warning" /> : <Award size={14} className="text-accent-primary" />}
            <span>{perk.title}</span>
          </div>
        ))}
      </section>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="ticket-toast glass-panel-elevated"
          >
            <CheckCircle2 size={20} className="text-accent-success" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
