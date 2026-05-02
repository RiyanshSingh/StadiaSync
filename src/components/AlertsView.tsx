import { AlertTriangle, MapPin, Footprints, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useApp } from '../contexts/AppContext';
import { FALLBACK_ALERTS } from '../constants/fallbackData';
import './AlertsView.css';

export default function AlertsView() {
  const { navigateTo, alerts: globalAlerts } = useApp();
  const alerts = globalAlerts.length > 0 ? globalAlerts : FALLBACK_ALERTS;


  // Handle both Firestore Timestamps and plain ISO strings
  const getTimeAgo = (createdAt: any) => {
    let ms: number;
    if (!createdAt) return 'Active';
    if (typeof createdAt === 'string') {
      ms = new Date(createdAt).getTime();
    } else if (createdAt?.toMillis) {
      ms = createdAt.toMillis();
    } else if (createdAt?.seconds) {
      ms = createdAt.seconds * 1000;
    } else {
      return 'Active';
    }
    const diff = Math.floor((Date.now() - ms) / 60000);
    if (diff <= 0) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ago`;
  };

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <h2 className="display-title">Security <span className="text-accent-warning">Alerts.</span></h2>
        <p className="page-subtitle">Live intel & emergency guidance</p>
      </div>

      <div className="alerts-feed">
        {alerts.map((alert, idx) => (
          <motion.div 
            key={alert.id || idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`l-alert-card ${alert.type === 'emergency' ? 'alert-emergency' : alert.type === 'warning' ? 'alert-warning' : 'alert-info'}`}
          >
            <div className="l-alert-top">
               <div className="l-alert-icon">
                 {alert.type === 'emergency' ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
               </div>
               <div className="l-alert-meta">
                 <h4>{alert.title}</h4>
                 <span className="l-alert-time">{alert.created_at ? getTimeAgo(alert.created_at) : 'Active'}</span>
               </div>
            </div>
            <p className="l-alert-desc">{alert.description}</p>
            
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
        ))}
      </div>
    </div>
  );
}
