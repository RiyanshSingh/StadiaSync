import { ShieldAlert, Users, Radio, Edit3, Settings, AlertTriangle, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import './AdminView.css';

export default function AdminView() {
  const [toast, setToast] = useState('');
  const { navigateTo, session } = useApp();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Write an intel alert to Firestore
  const triggerAlert = async (type: string, title: string, desc: string) => {
    try {
      await supabase.from('intel_alerts').insert({
        type,
        title,
        description: desc,
        created_at: new Date().toISOString()
      });
      showToast(`✅ Alert sent: ${title}`);
    } catch (e: any) {
      showToast(`❌ Failed: ${e?.message || 'unknown error'}`);
    }
  };

  // Write crowd level to crowd_levels and facilities collections
  const setCrowdLevel = async (zone: string, level: 'Low' | 'Med' | 'High') => {
    const zoneId = zone.toLowerCase().replace(/\s+/g, '-');
    const statusMap = {
      'Low': 'Clear',
      'Med': 'Moderate',
      'High': 'Crowded'
    };

    try {
      // 1. Log to official crowd_levels audit log
      await supabase.from('crowd_levels').upsert({
        id: zoneId,
        zone,
        level,
        updatedBy: session?.id ?? 'staff',
        updatedAt: new Date().toISOString()
      });

      // 2. Update live facilities status for DashboardView
      await supabase.from('facilities').upsert({
        id: zoneId,
        name: zone,
        status: statusMap[level],
        category: 'Zone',
        type: 'Zone',
        dist: 'Nearby',
        color: level === 'High' ? 'tertiary' : level === 'Med' ? 'warning' : 'success',
        updatedAt: new Date().toISOString()
      });

      showToast(`✅ ${zone} status updated to ${level}`);
    } catch (e: any) {
      showToast(`❌ Failed: ${e?.message || 'unknown error'}`);
    }
  };

  // Write queue wait time update
  const setQueueTime = async (name: string, minutes: number) => {
    const id = name.toLowerCase().replace(/\s+/g, '-');
    try {
      await supabase.from('queue_status').upsert({
        id,
        name,
        waitMin: minutes,
        status: minutes <= 5 ? 'Low Wait' : minutes <= 12 ? 'Medium Wait' : 'High Wait',
        updatedAt: new Date().toISOString()
      });
      showToast(`✅ ${name} wait time set to ${minutes} min`);
    } catch (e: any) {
      showToast(`❌ Failed: ${e?.message || 'unknown error'}`);
    }
  };

  const [gate1Wait, setGate1Wait] = useState(15);
  const [foodHubWait, setFoodHubWait] = useState(5);

  const zones = ['Adani Pavilion', 'Presidential Stand', 'North Stand', 'Gate 4 Hub'];

  return (
    <div className="admin-container">
      <div className="admin-header">
        <button
          onClick={() => navigateTo('profile')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', marginBottom: 8 }}
        >
          <ChevronLeft size={16} /> Back to Profile
        </button>
        <h2 className="display-title text-accent-warning">Command<br/>Center.</h2>
        <p className="page-subtitle">Elevated Staff Access</p>
      </div>

      {/* Emergency Flags */}
      <section className="admin-section">
        <h3 className="section-title"><Radio size={18} /> Quick Emergency Flags</h3>
        <div className="admin-grid">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="admin-action-card danger"
            onClick={() => triggerAlert('emergency', 'Evacuate Gate 3', 'Immediate evacuation advised from Gate 3 zone.')}
          >
            <AlertTriangle size={24} />
            <span>Emergency Evac (Gate 3)</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            className="admin-action-card warning"
            onClick={() => triggerAlert('warning', 'Congestion Alert', 'Gate 2 is overcrowded. Diverting traffic to Gate 4.')}
          >
            <Users size={24} />
            <span>Mark Congestion (Gate 2)</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            className="admin-action-card success"
            onClick={() => triggerAlert('success', 'Clear Path', 'Gate 4 is completely clear. Use for fast entry.')}
          >
            <ShieldAlert size={24} />
            <span>Mark Path Clear</span>
          </motion.button>
        </div>
      </section>

      {/* Crowd Level Updates */}
      <section className="admin-section">
        <h3 className="section-title"><Edit3 size={18} /> Update Crowd Levels</h3>
        <div className="zone-updater">
          {zones.map((zone) => (
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
      </section>

      {/* Queue Management */}
      <section className="admin-section">
        <h3 className="section-title"><Settings size={18} /> Queue Management</h3>
        <div className="queue-manage-grid">
          <div className="qm-card glass-panel">
            <h4>Gate 1 Wait</h4>
            <div className="qm-input">
              <input
                type="number"
                value={gate1Wait}
                onChange={e => setGate1Wait(Number(e.target.value))}
                min={0} max={120}
              /> min
              <button className="qm-save" onClick={() => setQueueTime('Gate 1 Entry', gate1Wait)}>Set</button>
            </div>
          </div>

          <div className="qm-card glass-panel">
            <h4>Food Hub 2</h4>
            <div className="qm-input">
              <input
                type="number"
                value={foodHubWait}
                onChange={e => setFoodHubWait(Number(e.target.value))}
                min={0} max={120}
              /> min
              <button className="qm-save" onClick={() => setQueueTime('Food Hub 2', foodHubWait)}>Set</button>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="admin-toast glass-panel-elevated"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
