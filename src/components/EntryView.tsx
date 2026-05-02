import { useState, useEffect } from 'react';
import { Scan, ArrowRight, CheckCircle2, Ticket, MapPin, Zap, Keyboard, ChevronLeft, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../lib/supabase';
import './EntryView.css';

export default function EntryView({ onEnter, onBack }: { onEnter: () => void, onBack?: () => void }) {
  const { setGuestTicketData, isCheckingAuth, session } = useApp() as any; // Cast as any for simplicity if types aren't perfect yet
  const [step, setStep] = useState<'landing' | 'scanning' | 'manual' | 'result'>('landing');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanned, setScanned] = useState(false); // true when coming from QR scan flow
  
  // Fast-track authenticated users to manual entry
  useEffect(() => {
    if (!isCheckingAuth && session) {
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
      };

      setGuestTicketData(userTicket);

      if (!user) {
        // Guest — skip Firestore write, just proceed
        setStep('result');
        setLoading(false);
        return;
      }
      await supabase.from('user_tickets').insert({
        ...userTicket,
        uid: user.id,
        gate_note: `${finalGate} has minimum wait time.`,
        timestamp: new Date().toISOString()
      });

      // Recommended gate logic: pick a random gate that is NOT the user's gate if possible
      // This simulates a "low crowd" recommendation
      let recGate = '';
      if (currentStadium && currentStadium.gates.length > 0) {
        const otherGates = currentStadium.gates.filter(g => g !== finalGate);
        recGate = otherGates.length > 0 
          ? otherGates[Math.floor(Math.random() * otherGates.length)]
          : currentStadium.gates[0];
      } else {
        recGate = finalGate || 'Gate 4';
      }
      setRecommendedGate(recGate);

      // Fetch live wait time for the result screen (Securely)
      const gateId = recGate.toLowerCase().replace(/\s+/g, '-');
      try {
        const { data: gateStatus } = await supabase
          .from('queue_status')
          .select('waitMin')
          .eq('id', gateId)
          .single();
        
        if (gateStatus) {
          setLiveWait(gateStatus.waitMin);
        } else {
          // Simulation: If no real data, recommended gate always has low wait (2-5 min)
          setLiveWait(Math.floor(Math.random() * 4) + 2);
        }
      } catch (e) {
        setLiveWait(Math.floor(Math.random() * 4) + 2);
      }

      setStep('result');
    } catch (err: any) {
      console.error('Entry error:', err?.code, err?.message);
      if (err?.code === 'permission-denied') {
        setError('Access denied. Please sign in and try again.');
      } else {
        setError(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="entry-layout">


      <AnimatePresence mode="wait">
        {step === 'landing' && (
          <motion.div 
            key="landing"
            className="entry-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {onBack && (
              <button 
                onClick={onBack}
                style={{ position: 'absolute', top: 24, left: 24, background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', zIndex: 10 }}
              >
                <ChevronLeft size={18} /> Cancel
              </button>
            )}
            
            <div className="branding">
              <h1>StadiaSync</h1>
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
                  background: 'rgba(52,199,89,0.12)', border: '1px solid rgba(52,199,89,0.3)',
                  borderRadius: 12, padding: '10px 14px', marginBottom: 8,
                  fontSize: 13, color: 'var(--accent-success)', fontWeight: 600
                }}
              >
                <CheckCircle2 size={16} /> Ticket scanned! Please verify your details below.
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
              <h3>Analyzing Ticket & Location...</h3>
              <p className="scan-note">Simulation active: Camera access requested</p>
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
                  {ticketData.stadium === 'Other' ? ticketData.customStadium : ticketData.stadium}
                  <span className="separator">•</span>
                  {ticketData.block === 'Other' ? ticketData.customBlock : ticketData.block}
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
                    <span className="label">Distance</span>
                    <span className="val">
                      {ticketData.gate?.includes('4') ? '120m' : '450m'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="gate-warning-banner">
                <div className="warning-dot"></div>
                <span>Avoid Gate 3 (15m security delay)</span>
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
