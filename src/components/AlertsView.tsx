import { AlertTriangle, MapPin, Footprints, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import './AlertsView.css';

export default function AlertsView() {
  const { navigateTo, alerts: globalAlerts } = useApp();
  const [now, setNow] = useState(() => Date.now());
  const alerts = globalAlerts;

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  const getTimeAgo = (createdAt?: string) => {
    if (!createdAt) return 'Active';
    const ms = new Date(createdAt).getTime();
    if (Number.isNaN(ms)) {
      return 'Active';
    }
    const diff = Math.floor((now - ms) / 60000);
    if (diff <= 0) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <div className="alerts-container">

      <div className="alerts-feed">
        {alerts.length > 0 ? alerts.map((alert, idx) => (
          <motion.div 
            key={alert.id || idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`l-alert-card ${alert.type === 'emergency' ? 'alert-emergency' : alert.type === 'warning' ? 'alert-warning' : 'alert-info'}`}
          >
            <div className="l-alert-header">
              <span style={{ fontWeight: 900, fontSize: 10, letterSpacing: 1.5 }}>
                {alert.type === 'emergency' ? 'CRITICAL EMERGENCY' : alert.type === 'warning' ? 'SECURITY ALERT' : 'STADIUM INFO'}
              </span>
              <ShieldAlert size={14} />
            </div>

            <div className="l-alert-body">
              <div className="l-alert-top">
                <div className="l-alert-icon">
                  {alert.type === 'emergency' ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div className="l-alert-meta">
                  <h4>{alert.title}</h4>
                  <span className="l-alert-time">{alert.created_at ? getTimeAgo(alert.created_at) : 'Active'}</span>
                </div>
              </div>
              <p className="l-alert-desc">{alert.description}</p>
            </div>
            
            {alert.type === 'emergency' && (
              <div className="l-alert-actions">
                <button className="l-btn-evac" onClick={() => navigateTo('map')}>
                  <Footprints size={16} /> Route to Safe Exit
                </button>
              </div>
            )}
            {alert.type === 'warning' && (
              <div className="l-alert-actions">
                <button className="l-btn-alt" onClick={() => navigateTo('map')}>
                  <MapPin size={16} /> View Alternative Route
                </button>
              </div>
            )}
          </motion.div>
        )) : (
          <div className="empty-state-p">No live alerts have been published for this stadium.</div>
        )}
      </div>
    </div>
  );
}
