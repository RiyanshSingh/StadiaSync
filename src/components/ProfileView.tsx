import { LogOut, Settings, Award, History, Heart, ShieldCheck, Mail, Phone, ChevronRight, User, ExternalLink, MapPin, Edit3, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logPerkAction } from '../lib/appData';
import { useApp } from '../contexts/AppContext';
import './ProfileView.css';

export default function ProfileView() {
  const { isSupabaseEnabled, navigateTo, session: user, setUserTicket } = useApp();
  const [toast, setToast] = useState('');
  const [stats, setStats] = useState({ matches: 0, orders: 0, points: 2400 });
  const [phoneNumber] = useState('+91 ••••• ••422');
  const [homeLocation, setHomeLocation] = useState('Fetching...');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [tempLocation, setTempLocation] = useState('');
  
  // Ticket Edit Modal State
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [ticketDocId, setTicketDocId] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({ stadium: '', block: '', row: '', seat: '', gate: '' });

  const stadiumData: Record<string, { gates: string[], blocks: string[] }> = {
    "Narendra Modi Stadium, Ahmedabad": {
      gates: Array.from({length: 12}, (_, i) => `Gate ${i + 1}`),
      blocks: ["Lower Tier: F1–10 (General)", "Lower Tier: G1–8 (Pavilion)", "Middle Tier: D1–5 (VIP/Platinum)", "Middle Tier: E1–4 (Corporate)", "Upper Tier: A1–6 (North)", "Upper Tier: B1–6 (East)", "Upper Tier: C1–6 (West)", "Premium: South West", "Premium: South East", "Corporate Box (25-seater)"]
    },
    "Wankhede Stadium, Mumbai": {
      gates: ["Gate 1 (Vithal Divecha)", "Gate 2 (MCA)", "Gate 3 (Garware)", "Gate 4", "Gate 5", "Gate 7"],
      blocks: ["Sachin Tendulkar Stand (South)", "Sunil Gavaskar Stand (East)", "North Stand", "Vijay Merchant Stand (North)", "Garware Pavilion (West)", "Divecha Pavilion", "Grand Stand"]
    },
    "Eden Gardens, Kolkata": {
      gates: Array.from({length: 17}, (_, i) => `Gate ${i + 1}`),
      blocks: ["Sourav Ganguly Stand", "Pankaj Roy Stand", "Jhulan Goswami Stand", "B.N. Dutt Stand", "Jagmohan Dalmiya Stand", "Block B", "Block C", "Block K", "Block L", "Block D", "Block F", "Block G", "Block H", "Block J"]
    },
    "M. Chinnaswamy Stadium, Bangalore": {
      gates: ["Gate 1", "Gate 2", "Gate 3", "Gate 5", "Gate 12", "Gate 18 (P1)"],
      blocks: ["P1 Stand", "P2 Stand", "P Terrace", "Grand Stand", "E-Executive", "D-Corporate", "Pavilion Stand"]
    },
    "Arun Jaitley Stadium, Delhi": {
      gates: ["Gate 1", "Gate 2", "Gate 3", "Gate 8", "Gate 10", "VIP Gate"],
      blocks: ["Old Pavilion", "Hill A (South)", "Hill B (North)", "General Stand West", "General Stand East"]
    },
    "M. A. Chidambaram Stadium, Chennai": {
      gates: ["Gate 1", "Gate 2", "Gate 3", "Gate 5", "Gate 8", "Gate 10"],
      blocks: ["Anna Pavilion", "Govindasamy Stand", "LB Shastri Stand", "Chidambaram Stand", "Ladies Stand", "Press Stand"]
    }
  };
  const stadiums = Object.keys(stadiumData).concat([
    "Rajiv Gandhi Intl. Stadium, Hyderabad",
    "HPCA Stadium, Dharamshala",
    "IS Bindra Stadium, Mohali",
    "Ekana Stadium, Lucknow",
    "Sawai Mansingh Stadium, Jaipur"
  ]);
  const resolvedHomeLocation = !isSupabaseEnabled || !supabase ? 'Offline Mode' : homeLocation;

  useEffect(() => {
    if (!user) return;
    const client = supabase;
    if (!client || !isSupabaseEnabled) {
      return;
    }

    const fetchProfileData = async () => {
      try {
        const { count: mCount } = await client.from('user_tickets').select('*', { count: 'exact', head: true }).eq('uid', user.id);
        const { count: oCount } = await client.from('orders').select('*', { count: 'exact', head: true }).eq('uid', user.id);
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
      const { data } = await client.from('users').select('homeLocation').eq('id', user.id).single();
      if (data?.homeLocation) {
        setHomeLocation(data.homeLocation);
      } else {
        setHomeLocation('Not Set');
      }
    };
    fetchLocation();

    const locationChannel = client
      .channel('user_location_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, (payload) => {
        setHomeLocation(payload.new.homeLocation || 'Not Set');
      })
      .subscribe();

    // Fetch the latest ticket to prefill edit mode
    const fetchLatestTicket = async () => {
      const { data } = await client.from('user_tickets').select('*').eq('uid', user.id);
      if (data && data.length > 0) {
        const latest = data[data.length - 1];
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

    const ticketChannel = client
      .channel('user_tickets_profile_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_tickets', filter: `uid=eq.${user.id}` }, () => {
        fetchLatestTicket();
      })
      .subscribe();

    return () => {
      void client.removeChannel(locationChannel);
      void client.removeChannel(ticketChannel);
    };
  }, [isSupabaseEnabled, user]);

  const saveHomeLocation = async () => {
    if (!user || !supabase || !isSupabaseEnabled) {
      showToast('Home location sync is unavailable offline.');
      return;
    }

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
    if (!user || !supabase || !isSupabaseEnabled) {
      showToast('Ticket editing is unavailable offline.');
      return;
    }

    try {
      const payload = {
        uid: user.id,
        stadium: ticketForm.stadium,
        block: ticketForm.block,
        row: ticketForm.row,
        seat: ticketForm.seat,
        gate: ticketForm.gate,
      };

      if (ticketDocId) {
        await supabase.from('user_tickets').update(payload).eq('id', ticketDocId);
      } else {
        await supabase.from('user_tickets').insert(payload);
      }

      // Immediately sync the edited ticket to global app state so Dashboard/Food/Map update
      setUserTicket({
        stadium: ticketForm.stadium,
        block: ticketForm.block,
        row: ticketForm.row,
        seat: ticketForm.seat,
        gate: ticketForm.gate,
      });
      
      setIsEditingTicket(false);
      showToast('Ticket completely updated!');
    } catch (e) {
      console.error(e);
      showToast('Error editing ticket');
    }
  };

  const handleSignOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      // Clear persisted state so next sign-in goes through entry flow
      localStorage.removeItem('has_entered');
      localStorage.removeItem('last_active_tab');
      localStorage.removeItem('guest_ticket_data');
      localStorage.removeItem('isGuest');
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleRewards = async () => {
    if (!user || !supabase) {
      showToast('Rewards need a live Supabase session.');
      return;
    }

    const { error } = await logPerkAction(supabase, {
      uid: user.id,
      perkId: 'match-day-rewards',
      action: 'open_rewards',
    });

    if (error) {
      showToast(`Rewards sync failed: ${error.message}`);
      return;
    }

    showToast('Rewards activity synced.');
  };

  const handleMatchArchive = async () => {
    if (!user || !supabase) {
      showToast('Archive requires a live Supabase session.');
      return;
    }

    const { count } = await supabase.from('user_tickets').select('*', { count: 'exact', head: true }).eq('uid', user.id);
    showToast(`Match archive synced: ${count || 0} tickets on record.`);
  };

  const handleFavorites = async () => {
    if (!user || !supabase) {
      showToast('Favorites require a live Supabase session.');
      return;
    }

    const vendorName = 'Stadium Food Hall';
    const { error } = await supabase.from('user_favorites').upsert({
      uid: user.id,
      vendor_name: vendorName,
    });

    if (error) {
      showToast(`Favorites sync failed: ${error.message}`);
      return;
    }

    await supabase.from('users').upsert({
      id: user.id,
      favorite_vendor: vendorName,
    });
    showToast(`Favorite vendor synced: ${vendorName}.`);
  };

  const handleSettings = async () => {
    if (!user || !supabase) {
      showToast('Settings require a live Supabase session.');
      return;
    }

    const { error } = await supabase.from('user_settings').upsert({
      uid: user.id,
      notifications_enabled: true,
      theme: 'stadium',
      updated_at: new Date().toISOString(),
    });

    if (error) {
      showToast(`Settings sync failed: ${error.message}`);
      return;
    }

    await supabase.from('users').upsert({
      id: user.id,
      settings_last_opened_at: new Date().toISOString(),
    });
    showToast('Settings synced to Supabase.');
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
            {user?.email_confirmed_at && <ShieldCheck size={16} className="text-accent-success" />}
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
                  <button className="icon-btn-small" onClick={() => { setTempLocation(resolvedHomeLocation === 'Not Set' || resolvedHomeLocation === 'Offline Mode' ? '' : resolvedHomeLocation); setIsEditingLocation(true); }}>
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
                <p>{resolvedHomeLocation}</p>
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
                  <select 
                    className="manual-input" 
                    value={ticketForm.stadium} 
                    onChange={e => setTicketForm({...ticketForm, stadium: e.target.value, block: '', gate: ''})}
                  >
                    <option value="" disabled>Select Stadium</option>
                    {stadiums.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {stadiumData[ticketForm.stadium]?.blocks.length > 0 ? (
                      <select className="manual-input" value={ticketForm.block} onChange={e => setTicketForm({...ticketForm, block: e.target.value})}>
                        <option value="">Select Block</option>
                        {stadiumData[ticketForm.stadium].blocks.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    ) : (
                      <input className="manual-input" placeholder="Block/Section" value={ticketForm.block} onChange={e => setTicketForm({...ticketForm, block: e.target.value})} />
                    )}
                    {stadiumData[ticketForm.stadium]?.gates.length > 0 ? (
                      <select className="manual-input" value={ticketForm.gate} onChange={e => setTicketForm({...ticketForm, gate: e.target.value})}>
                        <option value="">Select Gate</option>
                        {stadiumData[ticketForm.stadium].gates.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    ) : (
                      <input className="manual-input" placeholder="Gate" value={ticketForm.gate} onChange={e => setTicketForm({...ticketForm, gate: e.target.value})} />
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input className="manual-input" placeholder="Row" value={ticketForm.row} onChange={e => setTicketForm({...ticketForm, row: e.target.value})} />
                    <input className="manual-input" placeholder="Seat" value={ticketForm.seat} onChange={e => setTicketForm({...ticketForm, seat: e.target.value})} />
                  </div>
                  <button className="primary-action-p" onClick={saveTicketDraft} style={{ border: 'none', padding: 16, borderRadius: 'var(--radius-md)', fontWeight: 800, marginTop: 4 }}>
                    SAVE TICKET CHANGES
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
           <motion.div whileTap={{ scale: 0.98 }} className="perk-card glass-panel" onClick={() => void handleRewards()}>
             <Award className="text-accent-warning" size={24} />
             <span>Match Day Rewards</span>
           </motion.div>
           <motion.div whileTap={{ scale: 0.98 }} className="perk-card glass-panel" onClick={() => void handleMatchArchive()}>
             <History className="text-accent-secondary" size={24} />
             <span>Match Archive</span>
           </motion.div>
           <motion.div whileTap={{ scale: 0.98 }} className="perk-card glass-panel" onClick={() => void handleFavorites()}>
             <Heart className="text-accent-tertiary" size={24} />
             <span>Fav Vendors</span>
           </motion.div>
           <motion.div whileTap={{ scale: 0.98 }} className="perk-card glass-panel" onClick={() => void handleSettings()}>
             <Settings className="text-secondary" size={24} />
             <span>App Settings</span>
           </motion.div>
        </div>
      </section>

      {/* Actions */}
      <div className="profile-actions">
        {/* Admin panel — only visible to users with admin role in their metadata */}
        {user && user?.user_metadata?.role === 'admin' && (
          <button className="external-link-btn" onClick={() => navigateTo('admin')}>
            Staff Command Center
          </button>
        )}

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
