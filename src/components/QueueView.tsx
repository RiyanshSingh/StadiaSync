import { Activity, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import './QueueView.css';

interface QueueItem {
  id: string;
  type: string;
  name: string;
  waitMin: number;
  status: string;
}

export default function QueueView() {
  const { userTicket, guestTicketData, matchData } = useApp();
  const displayTicket = userTicket || guestTicketData;
  const [queues, setQueues] = useState<QueueItem[]>([]);

  useEffect(() => {
    const fetchQueues = async () => {
      if (!supabase) {
        setQueues([]);
        return;
      }

      const { data } = await supabase.from('queue_status').select('*');
      if (data && data.length > 0) {
        const currentStadium = displayTicket?.stadium ?? matchData?.stadium ?? null;
        const nextQueues = data
          .filter((q) => !currentStadium || !q.stadium || q.stadium === currentStadium)
          .map(q => ({
          id: q.id,
          type: q.type ?? 'Gate',
          name: q.name ?? q.id,
          waitMin: q.waitMin ?? 0,
          status: q.status ?? 'Low Wait',
        }));
        setQueues(nextQueues);
      } else {
        setQueues([]);
      }
    };

    void fetchQueues();

    const channel = supabase
      ? supabase
          .channel('queue_status_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_status' }, () => {
            void fetchQueues();
          })
          .subscribe()
      : null;
    return () => {
      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, [displayTicket?.stadium, matchData?.stadium]);

  const getStatusColor = (status: string) => {
    if (status === 'Low Wait')    return 'var(--accent-success)';
    if (status === 'Medium Wait') return '#FF9500';
    return '#FF3B30';
  };

  const getStatusClass = (status: string) => {
    if (status === 'Low Wait')    return 'q-low';
    if (status === 'Medium Wait') return 'q-med';
    return 'q-high';
  };

  return (
    <div className="queue-container">

      <div className="queue-list">
        <AnimatePresence>
          {queues.map((q, index) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.07 }}
              className={`queue-card glass-panel ${getStatusClass(q.status)}`}
            >
              <div className="qc-left">
                <span className="qc-type">{q.type}</span>
                <span className="qc-name">{q.name}</span>
              </div>

              <div className="qc-right">
                <div className="qc-status-badge">
                  <Activity size={14} style={{ color: getStatusColor(q.status) }} />
                  {q.status}
                </div>
                <div className="qc-time">
                  <Clock size={16} />
                  <span>{q.waitMin} min</span>
                </div>
              </div>
            </motion.div>
          ))}
          {queues.length === 0 && (
            <div className="empty-state-p">No live queue rows are configured for this stadium.</div>
          )}
        </AnimatePresence>
      </div>

      <div className="queue-info glass-panel-elevated">
        <Users size={20} className="text-secondary" />
        <p className="text-secondary">
          Wait times are estimated using live camera density and scan frequency. Accuracy margin is ±2 minutes.
        </p>
      </div>
    </div>
  );
}
