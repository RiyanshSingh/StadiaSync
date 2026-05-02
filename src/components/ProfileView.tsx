import { LogOut, Settings, Award, History, Heart, ShieldCheck, Mail, Phone, ChevronRight, User, ExternalLink, MapPin, Edit3, Save, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import './ProfileView.css';

export default function ProfileView() {
  const [toast, setToast] = useState('');
  const [stats, setStats] = useState({ matches: 0, orders: 0, points: 2400 });
  const [phoneNumber, setPhoneNumber] = useState('+91 ••••• ••422');
  const [homeLocation, setHomeLocation] = useState('Fetching...');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempLocation, setTempLocation] = useState('');
  
  // Ticket Edit Modal State
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [ticketDocId, setTicketDocId] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({ stadium: '', block: '', row: '', seat: '', gate: '' });

  const { navigateTo, session: user } = useApp();

  useEffect(() => {
    if (!user) return;
    const fetchProfileData = async () => {
      try {
        const { count: mCount } = await supabase.from('user_tickets').select('*', { count: 'exact', head: true }).eq('uid', user.id);
        const { count: oCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('uid', user.id);
        setStats({
          matches: mCount || 0,
          orders: oCount || 0,
          points: 2400 + ((mCount || 0) * 100) + ((oCount || 0) * 50)
        });
      } catch (err) {
        console.error('Stats fetch error:', err);
      }
    };
    fetchProfileData();

    // Listen to Home Location
    const fetchLocation = async () => {
      const { data } = await supabase.from('users').select('homeLocation').eq('id', user.id).single();
      if (data?.homeLocation) {
        setHomeLocation(data.homeLocation);
      } else {
        setHomeLocation('Not Set');
      }
    };
    fetchLocation();

    const locationChannel = supabase
      .channel('user_location_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, (payload) => {
        setHomeLocation(payload.new.homeLocation || 'Not Set');
      })
      .subscribe();

    // Fetch the latest ticket to prefill edit mode
    const fetchLatestTicket = async () => {
      const { data } = await supabase.from('user_tickets').select('*').eq('uid', user.id).order('timestamp', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        const latest = data[0];
        setTicketDocId(latest.id);
        setTicketForm({
          stadium: latest.stadium || '',
          block: latest.block || '',
          row: latest.row || '',
          seat: latest.seat || '',
          gate: latest.gate || ''
        });
      }
    };
    fetchLatestTicket();

    const ticketChannel = supabase
      .channel('user_tickets_profile_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_tickets', filter: `uid=eq.${user.id}` }, () => {
        fetchLatestTicket();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(ticketChannel);
    };
  }, [user]);

  const saveHomeLocation = async () => {
    if (!user) return;
    try {
      await supabase.from('users').upsert({ id: user.id, homeLocation: tempLocation });
      setIsEditingLocation(false);
      showToast('Home location updated natively!');
    } catch (e) {
      console.error(e);
      showToast('Error saving location');
    }
  };

  const saveTicketDraft = async () => {
    if (!user || !ticketDocId) return;
    try {
      await supabase.from('user_tickets').update({
        stadium: ticketForm.stadium,
        block: ticketForm.block,
        row: ticketForm.row,
        seat: ticketForm.seat,
        gate: ticketForm.gate,
      }).eq('id', ticketDocId);
      setIsEditingTicket(false);
      showToast('Ticket completely updated!');
    } catch (e) {
      console.error(e);
      showToast('Error editing ticket');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear persisted state so next sign-in goes through entry flow
      localStorage.removeItem('has_entered');
      localStorage.removeItem('last_active_tab');
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="profile-container">
      {/* Premium Header */}
      <div className="profile-header">
        <div className="profile-hero">
           <div className="profile-avatar-large shadow-glow">
             {user?.user_metadata?.avatar_url ? (
               <img src={user.user_metadata.avatar_url} alt="Profile" />
             ) : (
               <User size={40} className="text-accent-primary" />
             )}
             <div className="status-indicator online"></div>
           </div>
           <div className="profile-name-section">
             <h2 className="display-title">{user?.user_metadata?.full_name || 'Stadia Fan'}</h2>
             <p className="profile-tagline">Gold Member • Section 422 regular</p>
           </div>
        </div>
        
        <div className="profile-quick-stats">
          <div className="p-stat-card glass-panel">
            <span className="p-stat-value">{stats.matches}</span>
            <span className="p-stat-label">Matches</span>
          </div>
          <div className="p-stat-card glass-panel">
            <span className="p-stat-value">{stats.orders}</span>
            <span className="p-stat-label">Orders</span>
          </div>
          <div className="p-stat-card glass-panel">
            <span className="p-stat-value">{(stats.points / 1000).toFixed(1)}k</span>
            <span className="p-stat-label">Points</span>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <section className="profile-section">
        <h3 className="section-title">Identity & Security</h3>
        <div className="list-group">
          <div className="list-item glass-panel">
            <div className="list-icon blue"><Mail size={18} /></div>
            <div className="list-info">
              <h6>Email Address</h6>
              <p>{user?.email || 'Guest User'}</p>
            </div>
            {user?.emailVerified && <ShieldCheck size={16} className="text-accent-success" />}
          </div>
          
          <div className="list-item glass-panel">
            <div className="list-icon green"><Phone size={18} /></div>
            <div className="list-info">
              <h6>Phone Number</h6>
              <p>{user?.phone || phoneNumber}</p>
            </div>
            <ChevronRight size={16} className="text-tertiary" />
          </div>

          <div className="list-item glass-panel">
            <div className="list-icon yellow"><MapPin size={18} /></div>
            <div className="list-info" style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h6>Home Location</h6>
                {!isEditingLocation ? (
                  <button className="icon-btn-small" onClick={() => { setTempLocation(homeLocation === 'Not Set' ? '' : homeLocation); setIsEditingLocation(true); }}>
                    <Edit3 size={14} className="text-accent-warning" />
                  </button>
                ) : (
                  <button className="icon-btn-small" onClick={saveHomeLocation}>
                    <Save size={14} className="text-accent-success" />
                  </button>
                )}
              </div>
              {isEditingLocation ? (
                <input 
                  type="text" 
                  value={tempLocation} 
                  onChange={e => setTempLocation(e.target.value)} 
                  placeholder="e.g. Andheri West, Mumbai"
                  style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-focus)', color: '#fff', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}
                  autoFocus
                />
              ) : (
                <p>{homeLocation}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Ticket Edit Tool */}
      <section className="profile-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Active Ticket</h3>
          <button className="external-link-btn" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => setIsEditingTicket(!isEditingTicket)}>
            {isEditingTicket ? 'Cancel' : <><Edit3 size={14} style={{ marginRight: 4 }} /> Edit Details</>}
          </button>
        </div>
        
        <AnimatePresence>
          {isEditingTicket && (
             <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
               <div className="glass-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input className="manual-input" placeholder="Stadium" value={ticketForm.stadium} onChange={e => setTicketForm({...ticketForm, stadium: e.target.value})} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input className="manual-input" placeholder="Block/Section" value={ticketForm.block} onChange={e => setTicketForm({...ticketForm, block: e.target.value})} />
                    <input className="manual-input" placeholder="Gate" value={ticketForm.gate} onChange={e => setTicketForm({...ticketForm, gate: e.target.value})} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input className="manual-input" placeholder="Row" value={ticketForm.row} onChange={e => setTicketForm({...ticketForm, row: e.target.value})} />
                    <input className="manual-input" placeholder="Seat" value={ticketForm.seat} onChange={e => setTicketForm({...ticketForm, seat: e.target.value})} />
                  </div>
                  <button className="primary-action-p" onClick={saveTicketDraft} style={{ border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', padding: 12, borderRadius: 12, fontWeight: 600, marginTop: 4 }}>
                    Save Ticket Changes
                  </button>
               </div>
             </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Preferences & Loyalty */}
      <section className="profile-section">
        <h3 className="section-title">Experience & Perks</h3>
        <div className="perk-grid">
           <motion.div whileTap={{ scale: 0.98 }} className="perk-card glass-panel" onClick={() => showToast('Rewards coming soon!')}>
             <Award className="text-accent-warning" size={24} />
             <span>Match Day Rewards</span>
           </motion.div>
           <motion.div whileTap={{ scale: 0.98 }} className="perk-card glass-panel" onClick={() => showToast('Match history loaded.')}>
             <History className="text-accent-secondary" size={24} />
             <span>Match Archive</span>
           </motion.div>
           <motion.div whileTap={{ scale: 0.98 }} className="perk-card glass-panel" onClick={() => showToast('Favorites updated.')}>
             <Heart className="text-accent-tertiary" size={24} />
             <span>Fav Vendors</span>
           </motion.div>
           <motion.div whileTap={{ scale: 0.98 }} className="perk-card glass-panel" onClick={() => showToast('Settings opened.')}>
             <Settings className="text-secondary" size={24} />
             <span>App Settings</span>
           </motion.div>
        </div>
      </section>

      {/* Actions */}
      <div className="profile-actions">
        {/* Command Center specifically removed out of scope */}

        <button className="external-link-btn" onClick={() => window.open('https://stadium.gov.in', '_blank')}>
          Stadium Guidelines & Safety <ExternalLink size={14} />
        </button>

        <button className="sign-out-btn shadow-glow" onClick={handleSignOut}>
          <LogOut size={18} /> Sign Out of StadiaSync
        </button>
        <p className="app-version">Version 2.0.4-stable • Build 1092</p>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="profile-toast glass-panel-elevated">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
