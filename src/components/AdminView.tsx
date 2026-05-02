import { ShieldAlert, Users, Radio, AlertTriangle, ChevronLeft, Zap, Coffee, Settings, BarChart2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import './AdminView.css';

type AdminTab = 'alerts' | 'match' | 'queue' | 'food' | 'crowd';

interface AlertRow { id: string; type: string; title: string; description: string; created_at: string; }
interface MenuItem { id: string | number; name: string; price: number; category: string; is_active: boolean | null; is_featured: boolean | null; image?: string; wait_time?: string; location?: string; }

const QUEUE_GATES = [
  'Gate 1', 'Gate 2', 'Gate 3', 'Gate 4', 'Gate 5',
  'Gate 6', 'Gate 7', 'Gate 8', 'Food Hub 1', 'Food Hub 2',
];

const ZONES = ['Adani Pavilion', 'Presidential Stand', 'North Stand', 'Gate 4 Hub', 'South Stand', 'East Stand'];

export default function AdminView() {
  const { isSupabaseEnabled, navigateTo } = useApp();
  const [tab, setTab] = useState<AdminTab>('alerts');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Alerts state ---
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [newAlert, setNewAlert] = useState({ type: 'warning', title: '', description: '' });

  // --- Match config state ---
  const [matchForm, setMatchForm] = useState({ stadium: '', date: '', time: '', status: 'PRE-MATCH', timer: 'Starts soon' });

  // --- Queue state ---
  const [queueTimes, setQueueTimes] = useState<Record<string, number>>({});

  // --- Food state ---
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newFood, setNewFood] = useState({ name: '', price: '', category: 'Snacks', location: '', wait_time: '' });
  const [showAddFood, setShowAddFood] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Load data based on active tab
  useEffect(() => {
    if (!supabase || !isSupabaseEnabled) return;
    if (tab === 'alerts') loadAlerts();
    if (tab === 'match')  loadMatch();
    if (tab === 'queue')  loadQueue();
    if (tab === 'food')   loadFood();
  }, [tab, isSupabaseEnabled]);

  const loadAlerts = async () => {
    const { data } = await supabase!.from('intel_alerts').select('*').order('created_at', { ascending: false });
    setAlerts((data as AlertRow[]) ?? []);
  };

  const loadMatch = async () => {
    const { data } = await supabase!.from('stadium_config').select('*').eq('id', 'current_match').maybeSingle();
    if (data) setMatchForm({ stadium: data.stadium ?? '', date: data.date ?? '', time: data.time ?? '', status: data.status ?? 'PRE-MATCH', timer: data.timer ?? 'Starts soon' });
  };

  const loadQueue = async () => {
    const { data } = await supabase!.from('queue_status').select('*');
    if (data) {
      const map: Record<string, number> = {};
      data.forEach((row: any) => { map[row.name ?? row.id] = row.waitMin ?? 0; });
      setQueueTimes(map);
    }
    // init any missing gates
    const init: Record<string, number> = {};
    QUEUE_GATES.forEach(g => { if (!(g in (queueTimes))) init[g] = 0; });
    setQueueTimes(prev => ({ ...init, ...prev }));
  };

  const loadFood = async () => {
    const { data } = await supabase!.from('menu_items').select('*').order('name');
    setMenuItems((data as MenuItem[]) ?? []);
  };

  // ---- ALERT actions ----
  const createAlert = async () => {
    if (!newAlert.title.trim()) { showToast('Title is required'); return; }
    setLoading(true);
    const { error } = await supabase!.from('intel_alerts').insert({ type: newAlert.type, title: newAlert.title, description: newAlert.description, created_at: new Date().toISOString() });
    setLoading(false);
    if (error) { showToast('Error: ' + error.message); return; }
    showToast('✅ Alert sent!');
    setNewAlert({ type: 'warning', title: '', description: '' });
    loadAlerts();
  };

  const deleteAlert = async (id: string) => {
    await supabase!.from('intel_alerts').delete().eq('id', id);
    showToast('Alert deleted');
    loadAlerts();
  };

  // ---- MATCH CONFIG ----
  const saveMatch = async () => {
    setLoading(true);
    const { error } = await supabase!.from('stadium_config').upsert({ id: 'current_match', ...matchForm });
    setLoading(false);
    if (error) { showToast('Error: ' + error.message); return; }
    showToast('✅ Match config updated!');
  };

  // ---- QUEUE ----
  const saveQueue = async (name: string) => {
    const minutes = queueTimes[name] ?? 0;
    const id = name.toLowerCase().replace(/\s+/g, '-');
    const status = minutes <= 5 ? 'Low Wait' : minutes <= 12 ? 'Medium Wait' : 'High Wait';
    const { error } = await supabase!.from('queue_status').upsert({ id, name, waitMin: minutes, status, type: name.includes('Food') ? 'Food' : 'Gate' });
    if (error) { showToast('Error: ' + error.message); return; }
    showToast(`✅ ${name}: ${minutes} min`);
  };

  // ---- FOOD ----
  const toggleFoodActive = async (item: MenuItem) => {
    await supabase!.from('menu_items').update({ is_active: !item.is_active }).eq('id', item.id);
    showToast(`${item.name} ${!item.is_active ? 'activated' : 'deactivated'}`);
    loadFood();
  };

  const toggleFoodFeatured = async (item: MenuItem) => {
    // Un-feature all first, then feature this one
    if (!item.is_featured) await supabase!.from('menu_items').update({ is_featured: false }).neq('id', '');
    await supabase!.from('menu_items').update({ is_featured: !item.is_featured }).eq('id', item.id);
    showToast(`${item.name} ${!item.is_featured ? '⭐ Featured!' : 'unfeatured'}`);
    loadFood();
  };

  const addFoodItem = async () => {
    if (!newFood.name.trim() || !newFood.price) { showToast('Name and price required'); return; }
    setLoading(true);
    const { error } = await supabase!.from('menu_items').insert({
      name: newFood.name, price: Number(newFood.price),
      category: newFood.category, location: newFood.location,
      wait_time: newFood.wait_time, is_active: true, is_featured: false,
    });
    setLoading(false);
    if (error) { showToast('Error: ' + error.message); return; }
    showToast('✅ Menu item added!');
    setNewFood({ name: '', price: '', category: 'Snacks', location: '', wait_time: '' });
    setShowAddFood(false);
    loadFood();
  };

  const deleteFoodItem = async (id: string | number) => {
    await supabase!.from('menu_items').delete().eq('id', id);
    showToast('Item removed from menu');
    loadFood();
  };

  // ---- CROWD ----
  const setCrowdLevel = async (zone: string, level: 'Low' | 'Med' | 'High') => {
    const zoneId = zone.toLowerCase().replace(/\s+/g, '-');
    const statusMap = { Low: 'Clear', Med: 'Moderate', High: 'Crowded' };
    const colorMap  = { Low: 'success', Med: 'warning',  High: 'tertiary' };
    await supabase!.from('facilities').upsert({ id: zoneId, name: zone, status: statusMap[level], category: 'Zone', dist: 'Nearby', color: colorMap[level] });
    showToast(`✅ ${zone} → ${level}`);
  };

  const triggerAlert = async (type: string, title: string, desc: string) => {
    await supabase!.from('intel_alerts').insert({ type, title, description: desc, created_at: new Date().toISOString() });
    showToast(`🚨 Alert sent: ${title}`);
    if (tab === 'alerts') loadAlerts();
  };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'alerts', label: '🚨 Alerts' },
    { id: 'match',  label: '🏏 Match' },
    { id: 'queue',  label: '⏱ Queue' },
    { id: 'food',   label: '🍔 Food' },
    { id: 'crowd',  label: '👥 Crowd' },
  ];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <button onClick={() => navigateTo('profile')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', marginBottom: 8 }}>
          <ChevronLeft size={16} /> Back to Profile
        </button>
      </div>

      {/* Tab Bar */}
      <div className="admin-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`admin-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ALERTS ── */}
      {tab === 'alerts' && (
        <div className="admin-section">
          {/* Emergency quick buttons */}
          <h3 className="section-title"><Radio size={16} /> Quick Emergency</h3>
          <div className="admin-grid">
            <motion.button whileTap={{ scale: 0.97 }} className="admin-action-card danger" onClick={() => triggerAlert('emergency', 'Evacuate Gate 3', 'Immediate evacuation from Gate 3 zone.')}>
              <AlertTriangle size={22} /><span>Emergency Evac — Gate 3</span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} className="admin-action-card warning" onClick={() => triggerAlert('warning', 'Congestion Alert', 'Gate 2 is overcrowded. Divert to Gate 4.')}>
              <Users size={22} /><span>Congestion — Gate 2</span>
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} className="admin-action-card success" onClick={() => triggerAlert('success', 'Path Clear', 'Gate 4 is completely clear. Fast entry available.')}>
              <ShieldAlert size={22} /><span>Mark Path Clear — Gate 4</span>
            </motion.button>
          </div>

          {/* Custom alert */}
          <h3 className="section-title" style={{ marginTop: 8 }}><Zap size={16} /> Create Custom Alert</h3>
          <div className="alert-create-form">
            <select value={newAlert.type} onChange={e => setNewAlert({ ...newAlert, type: e.target.value })}>
              <option value="warning">⚠️ Warning</option>
              <option value="emergency">🚨 Emergency</option>
              <option value="success">✅ Info / Clear</option>
              <option value="info">ℹ️ Info</option>
            </select>
            <input placeholder="Alert title" value={newAlert.title} onChange={e => setNewAlert({ ...newAlert, title: e.target.value })} />
            <textarea rows={2} placeholder="Description (optional)" value={newAlert.description} onChange={e => setNewAlert({ ...newAlert, description: e.target.value })} />
            <button className="admin-save-btn" onClick={createAlert} disabled={loading}>Send Alert</button>
          </div>

          {/* Live alerts list */}
          <h3 className="section-title">Live Alerts ({alerts.length})</h3>
          <div className="alert-list">
            {alerts.length === 0 && <div className="empty-state-p">No active alerts</div>}
            {alerts.map(a => (
              <div key={a.id} className="alert-admin-card glass-panel">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className={`alert-type-badge badge-${a.type}`}>{a.type}</span>
                    <h5>{a.title}</h5>
                  </div>
                  <p>{a.description}</p>
                </div>
                <button className="delete-btn" onClick={() => deleteAlert(a.id)}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MATCH CONFIG ── */}
      {tab === 'match' && (
        <div className="admin-section">
          <h3 className="section-title"><BarChart2 size={16} /> Match Configuration</h3>
          <div className="glass-panel" style={{ padding: 16 }}>
            <div className="match-config-grid">
              <div className="mc-field full">
                <label>Stadium Name</label>
                <input placeholder="e.g. Narendra Modi Stadium" value={matchForm.stadium} onChange={e => setMatchForm({ ...matchForm, stadium: e.target.value })} />
              </div>
              <div className="mc-field">
                <label>Date</label>
                <input placeholder="e.g. May 3, 2026" value={matchForm.date} onChange={e => setMatchForm({ ...matchForm, date: e.target.value })} />
              </div>
              <div className="mc-field">
                <label>Time</label>
                <input placeholder="e.g. 7:30 PM" value={matchForm.time} onChange={e => setMatchForm({ ...matchForm, time: e.target.value })} />
              </div>
              <div className="mc-field">
                <label>Status</label>
                <select value={matchForm.status} onChange={e => setMatchForm({ ...matchForm, status: e.target.value })}>
                  <option>PRE-MATCH</option>
                  <option>LIVE</option>
                  <option>HALF TIME</option>
                  <option>FINISHED</option>
                  <option>RAIN DELAY</option>
                  <option>LOCKED</option>
                </select>
              </div>
              <div className="mc-field">
                <label>Timer / Label</label>
                <input placeholder="e.g. 14.2 Overs | 42 mins" value={matchForm.timer} onChange={e => setMatchForm({ ...matchForm, timer: e.target.value })} />
              </div>
            </div>
            <button className="admin-save-btn" onClick={saveMatch} disabled={loading} style={{ marginTop: 12 }}>
              {loading ? 'Saving...' : 'Save Match Config'}
            </button>
          </div>
        </div>
      )}

      {/* ── QUEUE ── */}
      {tab === 'queue' && (
        <div className="admin-section">
          <h3 className="section-title"><Settings size={16} /> Queue Wait Times</h3>
          <div className="queue-admin-list">
            {QUEUE_GATES.map(gate => (
              <div key={gate} className="queue-admin-row glass-panel">
                <span>{gate}</span>
                <div className="qm-input">
                  <input
                    type="number" min={0} max={120}
                    value={queueTimes[gate] ?? 0}
                    onChange={e => setQueueTimes(prev => ({ ...prev, [gate]: Number(e.target.value) }))}
                  />
                  <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>min</span>
                  <button className="qm-save" onClick={() => saveQueue(gate)}>Set</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FOOD ── */}
      {tab === 'food' && (
        <div className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="section-title"><Coffee size={16} /> Menu Management</h3>
            <button className="qm-save" onClick={() => setShowAddFood(v => !v)} style={{ padding: '8px 14px' }}>
              {showAddFood ? 'Cancel' : '+ Add Item'}
            </button>
          </div>

          <AnimatePresence>
            {showAddFood && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="alert-create-form">
                  <input placeholder="Item name *" value={newFood.name} onChange={e => setNewFood({ ...newFood, name: e.target.value })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input placeholder="Price (₹) *" type="number" value={newFood.price} onChange={e => setNewFood({ ...newFood, price: e.target.value })} />
                    <select value={newFood.category} onChange={e => setNewFood({ ...newFood, category: e.target.value })}>
                      <option>Snacks</option><option>Meals</option><option>Drinks</option><option>Desserts</option>
                    </select>
                  </div>
                  <input placeholder="Location (e.g. Gate 4 Concession)" value={newFood.location} onChange={e => setNewFood({ ...newFood, location: e.target.value })} />
                  <input placeholder="Wait time (e.g. 5 mins)" value={newFood.wait_time} onChange={e => setNewFood({ ...newFood, wait_time: e.target.value })} />
                  <button className="admin-save-btn" onClick={addFoodItem} disabled={loading}>
                    {loading ? 'Adding...' : 'Add to Menu'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="food-admin-list">
            {menuItems.length === 0 && <div className="empty-state-p">No menu items found. Add items above.</div>}
            {menuItems.map(item => (
              <div key={item.id} className="food-admin-card glass-panel">
                <div className="food-admin-img" style={{ backgroundImage: `url('${item.image || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=100&q=60'}')` }} />
                <div className="food-admin-info">
                  <h5>{item.name}</h5>
                  <p>₹{item.price} · {item.category}</p>
                </div>
                <div className="food-admin-controls">
                  <button className={`toggle-btn ${item.is_active ? 'active-on' : ''}`} onClick={() => toggleFoodActive(item)}>
                    {item.is_active ? '✅ Active' : '⛔ Off'}
                  </button>
                  <button className={`toggle-btn ${item.is_featured ? 'featured-on' : ''}`} onClick={() => toggleFoodFeatured(item)}>
                    {item.is_featured ? '⭐ Featured' : 'Feature'}
                  </button>
                  <button className="delete-btn" onClick={() => deleteFoodItem(item.id)} style={{ fontSize: 14 }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CROWD ── */}
      {tab === 'crowd' && (
        <div className="admin-section">
          <h3 className="section-title"><Users size={16} /> Zone Crowd Levels</h3>
          <p className="page-subtitle" style={{ fontSize: 13 }}>Updates live facility cards on every user's dashboard.</p>
          <div className="zone-updater">
            {ZONES.map(zone => (
              <div key={zone} className="zone-row glass-panel">
                <span className="zone-name">{zone}</span>
                <div className="zone-controls">
                  <button className="zone-btn low"  onClick={() => setCrowdLevel(zone, 'Low')}>Low</button>
                  <button className="zone-btn med"  onClick={() => setCrowdLevel(zone, 'Med')}>Med</button>
                  <button className="zone-btn high" onClick={() => setCrowdLevel(zone, 'High')}>High</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} className="admin-toast">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
