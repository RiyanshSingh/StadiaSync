import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Copy, Plus, MapPin, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateSquadCode, type SquadMemberRow, type SquadRow } from '../lib/appData';
import { useApp } from '../contexts/AppContext';
import './SquadTrackerModal.css';

interface SquadTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MEMBER_COLORS = ['var(--accent-primary)', 'var(--accent-success)', 'var(--accent-warning)', 'var(--accent-tertiary)'];

export default function SquadTrackerModal({ isOpen, onClose }: SquadTrackerModalProps) {
  const { session, userTicket, guestTicketData } = useApp();
  const displayTicket = userTicket || guestTicketData;
  const [view, setView] = useState<'list' | 'invite' | 'join'>('list');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [squad, setSquad] = useState<SquadRow | null>(null);
  const [members, setMembers] = useState<SquadMemberRow[]>([]);
  const [loading, setLoading] = useState(false);

  const displayName =
    session?.user_metadata?.full_name ||
    session?.user_metadata?.name ||
    session?.email ||
    'Stadia Fan';
  const currentLocation = displayTicket
    ? `${displayTicket.block || 'Concourse'}, Row ${displayTicket.row || '--'}`
    : 'Main Concourse';

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2000);
  };

  const loadSquadState = useCallback(async () => {
    if (!supabase || !session) {
      setSquad(null);
      setMembers([]);
      return;
    }

    const { data: membership } = await supabase
      .from('squad_members')
      .select('*')
      .eq('user_id', session.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      setSquad(null);
      setMembers([]);
      return;
    }

    const memberRow = membership as SquadMemberRow;

    await supabase
      .from('squad_members')
      .update({
        current_location: currentLocation,
        status: 'active',
      })
      .eq('id', memberRow.id);

    const [squadRes, membersRes] = await Promise.all([
      supabase.from('squads').select('*').eq('id', memberRow.squad_id).maybeSingle(),
      supabase.from('squad_members').select('*').eq('squad_id', memberRow.squad_id).order('joined_at'),
    ]);

    setSquad((squadRes.data as SquadRow | null) ?? null);
    setMembers((membersRes.data as SquadMemberRow[] | null) ?? []);
  }, [currentLocation, session]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void loadSquadState();
  }, [isOpen, loadSquadState]);

  const ensureSquad = async () => {
    if (!supabase || !session) {
      throw new Error('You need a Supabase session to create a squad.');
    }

    if (squad) {
      return squad;
    }

    const code = generateSquadCode();
    const { data: squadData, error: squadError } = await supabase
      .from('squads')
      .insert({
        code,
        created_by: session.id,
        stadium: displayTicket?.stadium ?? null,
      })
      .select('*')
      .single();

    if (squadError) {
      throw squadError;
    }

    const { error: memberError } = await supabase.from('squad_members').upsert({
      squad_id: squadData.id,
      user_id: session.id,
      display_name: displayName,
      current_location: currentLocation,
      status: 'active',
      color: MEMBER_COLORS[0],
    });

    if (memberError) {
      throw memberError;
    }

    const nextSquad = squadData as SquadRow;
    setSquad(nextSquad);
    await loadSquadState();
    return nextSquad;
  };

  const handleCopy = async () => {
    setLoading(true);
    try {
      const currentSquad = await ensureSquad();
      await navigator.clipboard.writeText(currentSquad.code);
      setCopied(true);
      showToast('Invite code copied.');
      setTimeout(() => setCopied(false), 2000);
      setView('invite');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Clipboard access failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!supabase || !session) {
      showToast('You need an active session to join a squad.');
      return;
    }

    if (joinCode.length < 4) {
      return;
    }

    setLoading(true);
    try {
      const { data: matchingSquad, error } = await supabase
        .from('squads')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!matchingSquad) {
        showToast('No squad found for that code.');
        return;
      }

      const colorIndex = members.length % MEMBER_COLORS.length;
      const { error: memberError } = await supabase.from('squad_members').upsert({
        squad_id: matchingSquad.id,
        user_id: session.id,
        display_name: displayName,
        current_location: currentLocation,
        status: 'active',
        color: MEMBER_COLORS[colorIndex],
      });

      if (memberError) {
        throw memberError;
      }

      setJoinCode('');
      setView('list');
      await loadSquadState();
      showToast(`Joined squad ${matchingSquad.code}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not join this squad.');
    } finally {
      setLoading(false);
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
                {members.length > 0 ? members.map((member) => (
                  <div key={member.id} className="squad-member">
                    <div className="member-avatar" style={{ background: member.color || MEMBER_COLORS[0] }}>
                      {member.display_name.charAt(0)}
                    </div>
                    <div className="member-info">
                      <div className="member-name">{member.display_name}</div>
                      <div className="member-loc">
                        <MapPin size={12} /> {member.current_location || 'Tracking unavailable'}
                      </div>
                    </div>
                    <div className={`member-status status-${member.status}`} />
                  </div>
                )) : (
                  <div className="squad-view-body">
                    <p>No squad linked yet. Create one or join a friend with an invite code.</p>
                  </div>
                )}
              </div>
              <div className="squad-actions">
                <button className="squad-action-btn primary" onClick={handleCopy} disabled={loading}>
                  <UserPlus size={18} /> {squad ? 'Copy Invite' : 'Create Squad'}
                </button>
                <button className="squad-action-btn secondary" onClick={() => setView('join')}>
                  <Users size={18} /> Join
                </button>
              </div>
            </>
          )}

          {view === 'invite' && (
            <div className="squad-view-body">
              <p>Share this code with your friends so they can find you in the stadium.</p>
              <div className="invite-code">
                {squad?.code || 'Generating...'}
              </div>
              <button className="squad-action-btn primary" style={{ width: '100%' }} onClick={handleCopy} disabled={loading}>
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
                disabled={joinCode.length < 4 || loading}
              >
                <Plus size={18} /> Join Squad
              </button>
            </div>
          )}
          {toast && (
            <div className="guest-warning-cart" style={{ marginTop: 16 }}>
              <span>{toast}</span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
