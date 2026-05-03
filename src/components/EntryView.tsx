import React, { useState, useEffect, useRef } from 'react';
import { Scan, ArrowRight, CheckCircle2, Ticket, MapPin, Zap, Keyboard, ChevronLeft, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import './EntryView.css';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Verification failed. Please try again.';
}

interface QueueStatusRow {
  id: string;
  waitMin: number | null;
}

export default function EntryView({ onEnter, onBack }: { onEnter: () => void, onBack?: () => void }) {
  const { setGuestTicketData, setIsGuest, setUserTicket, isCheckingAuth, isSupabaseEnabled, matchData, session } = useApp();
  const [step, setStep] = useState<'landing' | 'scanning' | 'manual' | 'result'>('landing');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanned, setScanned] = useState(false); // true when coming from QR scan flow
  
  // Fast-track authenticated users to manual entry — only once on mount, not on every re-render
  const hasAutoRedirected = useRef(false);
  useEffect(() => {
    if (!isCheckingAuth && session && !hasAutoRedirected.current) {
      hasAutoRedirected.current = true;
      setStep('manual');
    }
  }, [isCheckingAuth, session]);

  const [ticketData, setTicketData] = useState({
    stadium: 'Narendra Modi Stadium, Ahmedabad',
    customStadium: '',
    block: '',
    customBlock: '',
    row: '',
    seat: '',
    gate: '',
    customGate: ''
  });

  const stadiumData: Record<string, { gates: string[], blocks: string[] }> = {
    "Narendra Modi Stadium, Ahmedabad": {
      gates: Array.from({length: 12}, (_, i) => `Gate ${i + 1}`),
      blocks: [
        "Lower Tier: F1–F10 (General)", "Lower Tier: G1–G8 (Pavilion)",
        "Middle Tier: D1–D5 (VIP/Platinum)", "Middle Tier: E1–E4 (Corporate)",
        "Upper Tier: A1–A6 (North)", "Upper Tier: B1–B6 (East)", "Upper Tier: C1–C6 (West)",
        "Premium: South West", "Premium: South East", "Corporate Box (25-seater)"
      ]
    },
    "Wankhede Stadium, Mumbai": {
      gates: ["Gate 1 (Vithal Divecha)", "Gate 2 (MCA)", "Gate 3 (Garware)", "Gate 4", "Gate 5", "Gate 7"],
      blocks: ["Sachin Tendulkar Stand (South)", "Sunil Gavaskar Stand (East)", "North Stand", "Vijay Merchant Stand (North)", "Garware Pavilion (West)", "Divecha Pavilion", "Grand Stand"]
    },
    "Eden Gardens, Kolkata": {
      gates: Array.from({length: 17}, (_, i) => `Gate ${i + 1}`),
      blocks: [
        "Sourav Ganguly Stand", "Pankaj Roy Stand", "Jhulan Goswami Stand", 
        "B.N. Dutt Stand", "Jagmohan Dalmiya Stand", "Colonel N.J. Nair Stand",
        "Block B", "Block C", "Block K", "Block L", "Block D", "Block F", "Block G", "Block H", "Block J"
      ]
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

  const currentStadium = stadiumData[ticketData.stadium];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveWait, setLiveWait] = useState<number | null>(null);
  const [recommendedGate, setRecommendedGate] = useState('');

  const startScan = () => {
    setError('');
    setStep('scanning');
    setScanProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 10;
      if (progress >= 100) {
        clearInterval(interval);
        setScanProgress(100);
        // Redirect to manual form — signal scan is done so user can confirm details
        setTimeout(() => { setScanned(true); setStep('manual'); }, 600);
      } else {
        setScanProgress(Math.min(progress, 99));
      }
    }, 400);
  };

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = session;
      const finalStadium = ticketData.stadium === 'Other' ? ticketData.customStadium : ticketData.stadium;
      const finalBlock = ticketData.block === 'Other' ? ticketData.customBlock : ticketData.block;
      const finalGate = ticketData.gate === 'Other' ? ticketData.customGate : ticketData.gate;

      const userTicket = {
        stadium: finalStadium,
        block: finalBlock,
        gate: finalGate,
        row: ticketData.row,
        seat: ticketData.seat,
        date: matchData?.date,
        time: matchData?.time,
        ticket_id: `STS-${Date.now().toString().slice(-8)}`,
      };

      setUserTicket(userTicket);

      if (!user) {
        setGuestTicketData(userTicket);
        setIsGuest(true);
        setRecommendedGate(finalGate || 'Gate 4');
        setLiveWait(finalGate ? 6 : 4);
        setStep('result');
        return;
      }
      setGuestTicketData(null);
      setIsGuest(false);

      if (supabase && isSupabaseEnabled) {
        const { error } = await supabase.from('user_tickets').insert({
          uid: user.id,
          stadium: userTicket.stadium,
          block: userTicket.block,
          gate: userTicket.gate,
          row: userTicket.row,
          seat: userTicket.seat,
          ticket_id: userTicket.ticket_id,
          date: userTicket.date ?? null,
          time: userTicket.time ?? null,
          timestamp: new Date().toISOString(),
        });

        if (error) {
          // Non-fatal: log and continue — user still gets their gate recommendation
          console.warn('Ticket insert warning:', error.message);
        } else {
          // Also mark as onboarded in the DB immediately so refreshes don't reset them
          await supabase.from('users').update({ onboarded: true }).eq('id', user.id);
        }
      }

      let recGate = finalGate || 'Gate 4';
      let waitTime = finalGate ? 6 : 4;

      if (supabase && isSupabaseEnabled && currentStadium?.gates.length) {
        const normalizedGateIds = currentStadium.gates.map((gate) => gate.toLowerCase().replace(/\s+/g, '-'));
        const { data } = await supabase.from('queue_status').select('id, waitMin');
        const queueRows = (data as QueueStatusRow[] | null) ?? [];
        const matchingRows = queueRows.filter((row) => normalizedGateIds.includes(row.id));

        if (matchingRows.length > 0) {
          const bestGate = matchingRows.reduce((best, row) => {
            if ((row.waitMin ?? Number.POSITIVE_INFINITY) < (best.waitMin ?? Number.POSITIVE_INFINITY)) {
              return row;
            }

            return best;
          });

          const matchedGate = currentStadium.gates.find((gate) => gate.toLowerCase().replace(/\s+/g, '-') === bestGate.id);
          if (matchedGate) {
            recGate = matchedGate;
            waitTime = bestGate.waitMin ?? waitTime;
          }
        }
      }

      setRecommendedGate(recGate);
      setLiveWait(waitTime);
      setStep('result');
    } catch (error: unknown) {
      console.error('Entry error:', error);
      if (error instanceof Error && error.message.toLowerCase().includes('permission')) {
        setError('Access denied. Please sign in and try again.');
      } else {
        setError(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="entry-layout">
      <div className="entry-top-bar">
        {onBack && step === 'landing' && (
          <button 
            onClick={onBack}
            className="entry-cancel-btn"
          >
            <ChevronLeft size={18} /> Cancel
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === 'landing' && (
          <motion.div 
            key="landing"
            className="entry-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="branding landing-branding">
              <h1 className="main-title">Stadia<span className="text-accent-primary">Sync</span></h1>
              <p>The smartest way to experience game day.</p>
            </div>
            
            <div className="feature-list">
              <div className="feat-chip"><Zap size={20} className="feat-icon" /> Smart Gate Routing</div>
              <div className="feat-chip"><MapPin size={20} className="feat-icon" /> Live Navigation</div>
              <div className="feat-chip"><Ticket size={20} className="feat-icon" /> Frictionless Entry</div>
            </div>

            {session === null && (
               <div className="guest-banner-alt">
                 <ShieldAlert size={14} /> <span>Guest Mode: Entry data will not persist.</span>
               </div>
            )}

            <div className="entry-actions">
              <button className="primary-scan-btn shadow-glow" onClick={startScan}>
                <Scan size={20} className="btn-icon" />
                Scan Ticket to Begin
              </button>
              
              <button className="secondary-entry-btn" onClick={() => setStep('manual')}>
                <Keyboard size={18} />
                Manual Entry
              </button>
            </div>
          </motion.div>
        )}

        {step === 'manual' && (
          <motion.div 
            key="manual"
            className="manual-entry-content"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            {!session && (
              <button className="back-btn" onClick={() => { setScanned(false); setStep('landing'); }}>
                <ChevronLeft size={20} /> Back
              </button>
            )}

            {/* Scan success banner */}
            {scanned && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#ECFDF5', border: '3px solid #10B981',
                  borderRadius: 12, padding: '12px 16px', marginBottom: 12,
                  fontSize: 14, color: '#065F46', fontWeight: 800,
                  boxShadow: '4px 4px 0 0 #000', width: '100%'
                }}
              >
                <CheckCircle2 size={18} /> Ticket scanned! Please verify your details below.
              </motion.div>
            )}
            
            <div className="branding">
              <h2>Add Ticket Details</h2>
              <p>Enter your seat info manually</p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="entry-error-msg">
                {error}
              </motion.div>
            )}

            <form onSubmit={handleManualEntry} className="manual-form">
              <div className="manual-input-box full-width">
                <label>Select Stadium</label>
                <select 
                  value={ticketData.stadium}
                  onChange={(e) => setTicketData({...ticketData, stadium: e.target.value})}
                  className="stadium-select premium-select"
                >
                  {stadiums.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="Other">+ Other (Add Custom Stadium)</option>
                </select>
                {ticketData.stadium === 'Other' && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="custom-input-wrap">
                    <input 
                      type="text" 
                      placeholder="Enter Stadium Name" 
                      className="manual-input"
                      value={ticketData.customStadium}
                      onChange={(e) => setTicketData({...ticketData, customStadium: e.target.value})}
                      required
                    />
                  </motion.div>
                )}
              </div>

              <div className="manual-grid">
                <div className="manual-input-box">
                  <label>Block / Stand</label>
                  {currentStadium ? (
                    <>
                      <select 
                        className="premium-select"
                        value={ticketData.block}
                        onChange={(e) => setTicketData({...ticketData, block: e.target.value})}
                        required
                      >
                        <option value="">Select Block</option>
                        {currentStadium.blocks.map(b => <option key={b} value={b}>{b}</option>)}
                        <option value="Other">+ Other</option>
                      </select>
                      {ticketData.block === 'Other' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="custom-input-wrap">
                          <input 
                            type="text" placeholder="Stand Name" 
                            className="manual-input"
                            value={ticketData.customBlock}
                            onChange={(e) => setTicketData({...ticketData, customBlock: e.target.value})}
                            required 
                          />
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <input 
                      type="text" placeholder="e.g. Block A" 
                      className="manual-input"
                      value={ticketData.block}
                      onChange={(e) => setTicketData({...ticketData, block: e.target.value})}
                      required 
                    />
                  )}
                </div>
                <div className="manual-input-box">
                  <label>Row</label>
                  <input 
                    type="text" placeholder="e.g. G" 
                    className="manual-input"
                    value={ticketData.row}
                    onChange={(e) => setTicketData({...ticketData, row: e.target.value})}
                    required 
                  />
                </div>
                <div className="manual-input-box">
                  <label>Seat</label>
                  <input 
                    type="text" placeholder="e.g. 44" 
                    className="manual-input"
                    value={ticketData.seat}
                    onChange={(e) => setTicketData({...ticketData, seat: e.target.value})}
                    required 
                  />
                </div>
                <div className="manual-input-box">
                  <label>Gate Number</label>
                  {currentStadium ? (
                    <>
                      <select 
                        className="premium-select"
                        value={ticketData.gate}
                        onChange={(e) => setTicketData({...ticketData, gate: e.target.value})}
                        required
                      >
                        <option value="">Select Gate</option>
                        {currentStadium.gates.map(g => <option key={g} value={g}>{g}</option>)}
                        <option value="Other">+ Other</option>
                      </select>
                      {ticketData.gate === 'Other' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="custom-input-wrap">
                          <input 
                            type="text" placeholder="Gate ID" 
                            className="manual-input"
                            value={ticketData.customGate}
                            onChange={(e) => setTicketData({...ticketData, customGate: e.target.value})}
                            required 
                          />
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <input 
                      type="text" placeholder="e.g. Gate 4" 
                      className="manual-input"
                      value={ticketData.gate}
                      onChange={(e) => setTicketData({...ticketData, gate: e.target.value})}
                      required 
                    />
                  )}
                </div>
              </div>

              <button type="submit" className="primary-scan-btn shadow-glow" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'scanning' && (
          <motion.div 
            key="scanning"
            className="scanner-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="scan-frame">
              <div className="corner tl"></div>
              <div className="corner tr"></div>
              <div className="corner bl"></div>
              <div className="corner br"></div>
              <motion.div 
                className="scan-laser"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              ></motion.div>
              <Ticket size={80} className="text-secondary pulse-icon" />
            </div>
            
            <div className="scan-status">
              <h3>Reading Ticket Data...</h3>
              <p className="scan-note">This is a preview scan. Confirm your seat details on the next screen before entering.</p>
              <div className="progress-bar-bg">
                <motion.div 
                  className="progress-bar-fill" 
                  initial={{ width: '0%' }}
                  animate={{ width: `${scanProgress}%` }}
                ></motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div 
            key="result"
            className="result-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="success-header">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
                className="success-icon"
              >
                <CheckCircle2 size={64} className="text-accent-success" />
              </motion.div>
              
              <h2>Ticket Verified!</h2>
            </div>
            
            <div className="gate-recommendation premium-card-glow">
              <div className="gate-card-header">
                <div className="ticket-identity-badge">
                  <div className="stadium-name">{ticketData.stadium === 'Other' ? ticketData.customStadium : ticketData.stadium}</div>
                  <div className="block-name">{ticketData.block === 'Other' ? ticketData.customBlock : ticketData.block}</div>
                </div>
                <span className="gate-label">Recommended Entry</span>
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="gate-number-wrap"
                >
                  <span className="gate-number-glow">{recommendedGate || ticketData.gate || 'Gate 11'}</span>
                </motion.div>
              </div>

              <div className="gate-stats-shelf">
                <div className="g-stat">
                  <div className="stat-icon-wrap"><Zap size={14} /></div>
                  <div className="stat-content">
                    <span className="label">Wait time</span>
                    <span className={`val ${liveWait !== null && liveWait > 10 ? 'warning' : 'success'}`}>
                      {liveWait !== null ? `${liveWait} Min` : 'Checking...'}
                    </span>
                  </div>
                </div>
                <div className="g-stat">
                  <div className="stat-icon-wrap"><MapPin size={14} /></div>
                  <div className="stat-content">
                    <span className="label">Via Gate</span>
                    <span className="val">{ticketData.gate === 'Other' ? ticketData.customGate || 'See Map' : ticketData.gate || 'See Map'}</span>
                  </div>
                </div>
              </div>
              
              <div className="gate-warning-banner">
                <div className="warning-dot"></div>
                <span>
                  {recommendedGate && recommendedGate !== ticketData.gate
                    ? `Fastest live route is ${recommendedGate}.`
                    : 'Use your assigned gate for the smoothest entry.'}
                </span>
              </div>
            </div>

            <button className="enter-btn glow-btn" onClick={onEnter}>
              Launch Experience <ArrowRight size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
