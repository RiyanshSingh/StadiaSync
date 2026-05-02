import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Copy, Plus, MapPin, UserPlus } from 'lucide-react';
import './SquadTrackerModal.css';

interface SquadTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOCK_SQUAD = [
  { id: 1, name: 'Raunak', loc: 'Gate 4 - Scanning', status: 'active', color: 'var(--accent-primary)' },
  { id: 2, name: 'Aisha', loc: 'Block 102, Row D', status: 'active', color: 'var(--accent-success)' },
  { id: 3, name: 'Kabir', loc: 'Restroom Queue (2m)', status: 'away', color: 'var(--accent-warning)' },
];

export default function SquadTrackerModal({ isOpen, onClose }: SquadTrackerModalProps) {
  const [view, setView] = useState<'list' | 'invite' | 'join'>('list');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('STADIA-9X2P');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = () => {
    if (joinCode.length > 3) {
      alert(`Joined squad: ${joinCode}`);
      setView('list');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="squad-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="squad-modal-content"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="squad-header">
            <h3>
              {view === 'list' && 'Your Squad'}
              {view === 'invite' && 'Invite Friends'}
              {view === 'join' && 'Join Squad'}
            </h3>
            <button className="close-btn" onClick={() => {
              if (view !== 'list') setView('list');
              else onClose();
            }}>
              <X size={20} />
            </button>
          </div>

          {view === 'list' && (
            <>
              <div className="squad-list">
                {MOCK_SQUAD.map(member => (
                  <div key={member.id} className="squad-member">
                    <div className="member-avatar" style={{ background: member.color }}>
                      {member.name.charAt(0)}
                    </div>
                    <div className="member-info">
                      <div className="member-name">{member.name}</div>
                      <div className="member-loc">
                        <MapPin size={12} /> {member.loc}
                      </div>
                    </div>
                    <div className={`member-status status-${member.status}`} />
                  </div>
                ))}
              </div>
              <div className="squad-actions">
                <button className="squad-action-btn primary" onClick={() => setView('invite')}>
                  <UserPlus size={18} /> Invite
                </button>
                <button className="squad-action-btn secondary" onClick={() => setView('join')}>
                  <Users size={18} /> Join
                </button>
              </div>
            </>
          )}

          {view === 'invite' && (
            <div className="squad-view-body">
              <p>Share this code with your friends so they can find you in the stadium!</p>
              <div className="invite-code">
                STADIA-9X2P
              </div>
              <button className="squad-action-btn primary" style={{ width: '100%' }} onClick={handleCopy}>
                <Copy size={18} /> {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          )}

          {view === 'join' && (
            <div className="squad-view-body">
              <p>Enter a squad code from a friend.</p>
              <input 
                type="text" 
                className="join-input" 
                placeholder="ENTER CODE" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={12}
              />
              <button 
                className="squad-action-btn primary" 
                style={{ width: '100%' }} 
                onClick={handleJoin}
                disabled={joinCode.length < 4}
              >
                <Plus size={18} /> Join Squad
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
