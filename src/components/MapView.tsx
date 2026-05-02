import { MapPin, Coffee, DoorOpen, Users, Navigation, Layers, Plus, Minus, Crosshair, ChevronLeft, Share2, Compass, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import './MapView.css';

export default function MapView() {
  const { userTicket, session } = useApp();
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeDestination, setActiveDestination] = useState<any>(null);

  const [pois, setPois] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExplore, setShowExplore] = useState(true);

  // In-app toast to replace browser alert()
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const venueConfigs: Record<string, { stands: string[], logo?: string }> = {
    "Narendra Modi Stadium, Ahmedabad": {
      stands: ["Presidential Stand", "Adani Pavilion", "North Stand", "South Stand"]
    },
    "Wankhede Stadium, Mumbai": {
      stands: ["Sachin Tendulkar Stand", "Sunil Gavaskar Stand", "Garware Pavilion", "North Stand"]
    },
    "Eden Gardens, Kolkata": {
      stands: ["Sourav Ganguly Stand", "Pankaj Roy Stand", "B.N. Dutt Stand", "Jagmohan Dalmiya Stand"]
    },
    "M. Chinnaswamy Stadium, Bangalore": {
      stands: ["Pavilion Stand", "Grand Stand", "P1 Stand", "E-Executive"]
    }
  };

  const defaultVenue = { stands: ["Main Stand", "Opposite Stand", "East Wing", "West Wing"] };
  const currentVenue = userTicket ? (venueConfigs[userTicket.stadium] || defaultVenue) : defaultVenue;
  
  // Interactive Map States
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const fetchPOIs = async () => {
      const fallbackPOIs = [
        { id: 1, type: 'food', label: 'Vada Pav Stall', top: '25%', left: '20%', x: 20, y: 25 },
        { id: 2, type: 'food', label: 'Stadium Chai', top: '25%', left: '65%', x: 65, y: 25 },
        { id: 3, type: 'exit', label: 'Gate Exit', top: '55%', left: '15%', x: 15, y: 55 },
        { id: 4, type: 'exit', label: 'Main Entrance', top: '75%', left: '80%', x: 80, y: 75 },
        { id: 5, type: 'restroom', label: 'Washrooms', top: '85%', left: '40%', x: 40, y: 85 }
      ];

      try {
        const { data } = await supabase.from('map_pois').select('*');
        // Use fallback if Supabase returned nothing
        setPois(data && data.length > 0 ? data : fallbackPOIs);
      } catch (err) {
        // On any error (permission-denied etc.) show fallback POIs
        setPois(fallbackPOIs);
      }
    };
    fetchPOIs();
  }, []);

  // Filter Logic
  const filteredPOIs = pois.filter((poi) => {
    const matchesFilter = activeFilter === 'all' || poi.type === activeFilter;
    const matchesSearch = poi.label.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Zoom Controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.3, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.3, 0.5));
  const resetZoom = () => setZoom(1);

  // Trigger Routing
  const startNavigation = (poi: any) => {
    setActiveDestination(poi);
    setIsNavigating(true);
  };
  
  const cancelNavigation = () => {
    setIsNavigating(false);
    setActiveDestination(null);
  };

  // Share ETA via Web Share API (falls back to clipboard copy)
  const shareETA = async () => {
    const text = `I'm heading to ${activeDestination?.label} at the stadium. ETA: ~2 minutes.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'StadiaSync ETA', text });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        showToast('ETA copied to clipboard!');
      } catch {
        showToast('Share not supported on this device.');
      }
    }
  };

  return (
    <div className="map-container">
      {/* Search / Nav Header */}
      <div className="map-search-region">
        <div className="map-header">
          {isNavigating ? (
            <button className="back-btn" onClick={cancelNavigation}>
              <ChevronLeft size={24} className="text-accent-primary" />
            </button>
          ) : (
            <div className="search-bar">
              <Navigation size={18} className="text-secondary" />
              <input 
                type="text" 
                placeholder="Find gate, food, washrooms..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
          
          {isNavigating && activeDestination ? (
            <div className="nav-header-info">
              <h4>Routing to {activeDestination.label}</h4>
              <span>
                From your seat
                {userTicket ? ` · ${userTicket.block || ''} R${userTicket.row || ''} S${userTicket.seat || ''}` : ''}
              </span>
            </div>
          ) : (
            <button className="layers-btn" onClick={resetZoom}><Layers size={20} /></button>
          )}
        </div>

        {/* Quick Filters */}
        {!isNavigating && (
          <div className="map-quick-filters">
            <button className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}><MapPin size={14} /> All</button>
            <button className={`filter-chip ${activeFilter === 'food' ? 'active' : ''}`} onClick={() => setActiveFilter('food')}><Coffee size={14} /> Food</button>
            <button className={`filter-chip ${activeFilter === 'exit' ? 'active' : ''}`} onClick={() => setActiveFilter('exit')}><DoorOpen size={14} /> Exits</button>
            <button className={`filter-chip ${activeFilter === 'restroom' ? 'active' : ''}`} onClick={() => setActiveFilter('restroom')}><Users size={14} /> WC</button>
          </div>
        )}
      </div>

      <div className="interactive-map">
        {/* Zoom & Pan Controls */}
        <div className="map-controls">
          <button className="control-btn" onClick={handleZoomIn}><Plus size={18} /></button>
          <button className="control-btn" onClick={handleZoomOut}><Minus size={18} /></button>
          <button className="control-btn target-btn" onClick={resetZoom}><Crosshair size={18} /></button>
        </div>

        <motion.div 
          className="draggable-map-area"
          drag
          dragConstraints={{ left: -150, right: 150, top: -200, bottom: 300 }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Custom Venue Graphical Map */}
          <motion.div 
            className="stadium-graphic"
            initial={{ x: "-50%", y: "-50%", scale: 1 }}
            animate={{ x: "-50%", y: "-50%", scale: zoom }}
            transition={{ type: 'spring', damping: 20 }}
          >
            {/* Seating Tiers */}
            <div className="grandstand outer-tier"></div>
            <div className="grandstand inner-tier"></div>
            
            {/* Sports Pitch */}
            <div className="pitch-oval">
              <div className="pitch-center"></div>
              <div className="pitch-arc top"></div>
              <div className="pitch-arc bottom"></div>
            </div>
            
            {/* Dynamic Map Text Labels */}
            <div className="map-label" style={{ top: '10%', left: '50%', transform: 'translateX(-50%)' }}>{currentVenue.stands[0]}</div>
            <div className="map-label" style={{ bottom: '10%', left: '50%', transform: 'translateX(-50%)' }}>{currentVenue.stands[1]}</div>
            <div className="map-label" style={{ top: '50%', left: '10%', transform: 'translateY(-50%) rotate(-90deg)' }}>{currentVenue.stands[2]}</div>
            <div className="map-label" style={{ top: '50%', right: '10%', transform: 'translateY(-50%) rotate(90deg)' }}>{currentVenue.stands[3]}</div>

                {/* Render Filtered POI Markers */}
            <AnimatePresence>
              {filteredPOIs.map((poi) => (
                <motion.div 
                  key={poi.id} 
                  className="poi-marker" 
                  style={{ top: poi.top, left: poi.left }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={() => startNavigation(poi)}
                  whileTap={{ scale: 1.2 }}
                >
                  <div className={`poi-icon ${poi.type}-poi`}>
                    {poi.type === 'food' ? <Coffee size={12} /> : poi.type === 'exit' ? <DoorOpen size={12} /> : <Users size={12} />}
                  </div>
                  <span className="poi-literal-label">{poi.label}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Density Heatmap */}
            <motion.div 
              className="density-zone high"
              initial={{ scale: 0.8, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
              style={{ top: '40%', left: '25%' }}
            >
            </motion.div>

            {/* Dynamic Current Path overlaying to active destination */}
            {isNavigating && activeDestination && (
              <svg className="routing-path" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.2" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <motion.path 
                  key={activeDestination.id}
                  d={`M 50,90 Q 50,${activeDestination.y} ${activeDestination.x},${activeDestination.y}`} 
                  stroke="url(#pathGrad)" 
                  strokeWidth="4" 
                  fill="none" 
                  strokeDasharray="6 6"
                  filter="url(#glow)"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
              </svg>
            )}

            {/* User Location */}
            <div className="user-location">
              <div className="ping"></div>
              <div className="dot"></div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Map Bottom Sheet */}
      <AnimatePresence>
        {(isNavigating && activeDestination) || showExplore ? (
          <motion.div 
            className="map-bottom-sheet floating glass-panel-elevated"
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {isNavigating && activeDestination ? (
              <>
                <div className="sheet-handle"></div>
                <div className="sheet-nav-mode">
                  <div className="nav-eta-header">
                    <h2 className="eta-title">2 min</h2>
                    <span className="eta-distance">180m • Arrive Instantly</span>
                  </div>
                  
                  <div className="nav-warning">
                    <Users size={16} className="text-accent-warning" />
                    <span>Slight congestion near {activeDestination.label}.</span>
                  </div>

                  <div className="nav-actions">
                    <button className="nav-circ-btn" onClick={shareETA}>
                      <Share2 size={20} />
                      <span>Share ETA</span>
                    </button>
                    <button className="nav-circ-btn primary-circ" onClick={() => showToast('Navigation started! Follow the highlighted path.')}>
                      <Compass size={20} />
                      <span>Start</span>
                    </button>
                    <button className="nav-circ-btn danger-circ" onClick={cancelNavigation}>
                      <X size={20} />
                      <span>Stop Route</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="sheet-content" style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowExplore(false)} 
                  className="close-sheet-btn"
                >
                  <X size={20} />
                </button>
                <h3 className="section-title" style={{ paddingRight: '40px' }}>Explore Arena</h3>
                <p className="text-secondary" style={{ fontSize: '14px', margin: '8px 0 0' }}>
                  Drag the map or click the <b>[+]</b> zoom buttons. Tap on any map icon (like Food or Exits) to start routing!
                </p>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* In-app Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            style={{
              position: 'absolute', bottom: '100px', left: '16px', right: '16px',
              zIndex: 200, display: 'flex', alignItems: 'center', gap: '12px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)', padding: '14px 16px',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <CheckCircle2 size={20} className="text-accent-success" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
