import { Search, MapPin, Clock, Plus, Minus, Flame, Sparkles, Navigation, CheckCircle2, ShoppingBag, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import './FoodView.css';

interface MenuItem {
  id: number | string;
  name: string;
  price: number;
  category: string;
  calories?: number;
  image?: string;
  qty?: number;
  stadium?: string | null;
  wait_time?: string | null;
  location?: string | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
}

type FeaturedItem = MenuItem;

export default function FoodView() {
  const { isSupabaseEnabled, showOrderNotification, userTicket, guestTicketData, session } = useApp();
  const displayTicket = userTicket || guestTicketData;
  const [deliveryMode, setDeliveryMode] = useState<'pickup' | 'delivery'>('delivery');
  const [activeCategory, setActiveCategory] = useState('Featured');
  const [searchQuery, setSearchQuery] = useState('');

  // Database state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [featuredItem, setFeaturedItem] = useState<FeaturedItem | null>(null);

  // Cart/Checkout States
  const [cart, setCart] = useState<MenuItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [checkoutError, setCheckoutError] = useState('');

  const categories = ['Featured', 'Snacks', 'Meals', 'Drinks', 'Desserts'];

  useEffect(() => {
    const initMenu = async () => {
      if (!supabase || !isSupabaseEnabled) {
        setMenuItems([]);
        setFeaturedItem(null);
        return;
      }

      try {
        const { data: menuData } = await supabase.from('menu_items').select('*').eq('is_active', true).order('name');
        const currentStadium = displayTicket?.stadium ?? null;
        const scopedMenu = ((menuData as MenuItem[] | null) ?? []).filter(
          (item) => !currentStadium || !item.stadium || item.stadium === currentStadium,
        );

        setMenuItems(scopedMenu);
        setFeaturedItem(scopedMenu.find((item) => item.is_featured) ?? scopedMenu[0] ?? null);
      } catch {
        setMenuItems([]);
        setFeaturedItem(null);
      }
    };
    void initMenu();
  }, [displayTicket?.stadium, isSupabaseEnabled]);

  const getItemImage = (item: MenuItem | null) => {
    if (!item) return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=60';
    const name = item.name.toLowerCase();
    
    // Check for hardcoded local images first
    if (name.includes('vada pav')) return '/images/mumbai_vada_pav.png';
    if (name.includes('gulab jamun')) return '/images/gulab_jamun.png';
    if (name.includes('maharaja thali')) return '/images/maharaja_thali.png';
    
    // Check if the item has a valid remote image URL
    if (item.image && item.image !== 'null' && item.image !== 'undefined' && item.image.trim() !== '') {
      return item.image;
    }
    
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=60';
  };

  const addToCart = (item: MenuItem) => {
    setCheckoutError('');
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: (i.qty ?? 0) + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQuantity = (id: MenuItem['id'], delta: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (!existing) return prev;
      if ((existing.qty ?? 0) + delta <= 0) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, qty: (i.qty ?? 0) + delta } : i);
    });
  };

  const removeFromCart = (id: MenuItem['id']) => setCart(prev => prev.filter(i => i.id !== id));

  const cartTotal = cart.reduce((acc, item) => acc + item.price * (item.qty ?? 0), 0);

  const processOrder = async () => {
    if (cart.length === 0) {
      setCheckoutError('Add at least one item before placing an order.');
      return;
    }

    if (deliveryMode === 'delivery' && !displayTicket) {
      setCheckoutError('Link a ticket before using in-seat delivery, or switch to pickup.');
      return;
    }

    if (!session) {
      setCheckoutError('Guest orders are not saved. Sign in to keep your order history and enable delivery.');
      // Still allow the order to proceed as a demo
    }

    setOrderStatus('processing');
    setCheckoutError('');

    try {
      if (session && supabase && isSupabaseEnabled) {
        const { error } = await supabase.from('orders').insert({
          uid: session.id,
          items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty ?? 0 })),
          total: cartTotal,
          deliveryMode,
          seatInfo: displayTicket ? { stadium: displayTicket.stadium, block: displayTicket.block, gate: displayTicket.gate } : null,
          status: 'pending',
          createdAt: new Date().toISOString()
        });

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.warn('Order write failed:', error);
      setOrderStatus('idle');
      setCheckoutError('We could not place this order right now. Please try again.');
      return;
    }

    setOrderStatus('success');
    // Fire global notification popup on home screen
    showOrderNotification({
      id: Date.now().toString(),
      items: cart.map(i => ({ name: i.name, qty: i.qty ?? 0 })),
      total: cartTotal,
      deliveryMode,
      seat: displayTicket ? `${displayTicket.block || ''} - Row ${displayTicket.row || '--'} - Seat ${displayTicket.seat || '--'}` : '--',
      timestamp: Date.now(),
    });
    setTimeout(() => {
      setCart([]);
      setOrderStatus('idle');
      setShowCart(false);
    }, 2500);
  };

  // Generic search filter applied across all views
  const applySearch = (items: MenuItem[]) => {
    if (!searchQuery.trim()) return items;
    return items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  // Delivery destination string — safe null handling
  const deliveryLabel = deliveryMode === 'delivery'
    ? `Delivering to ${displayTicket?.block ?? 'Your Block'} • Row ${displayTicket?.row ?? '--'} • Seat ${displayTicket?.seat ?? '--'}`
    : 'Pickup at Gate 4 Concierge';

  return (
    <div className="food-container">
      {/* Premium Header Region */}
      <div className="food-top-region">

        <div className="delivery-toggle-container glass-panel">
          <button className={`toggle-mode ${deliveryMode === 'pickup' ? 'active' : ''}`} onClick={() => setDeliveryMode('pickup')}>
            <MapPin size={16} /> Pickup
          </button>
          <button className={`toggle-mode ${deliveryMode === 'delivery' ? 'active' : ''}`} onClick={() => setDeliveryMode('delivery')}>
            <Navigation size={16} /> In-Seat
          </button>
          <div className={`active-pill ${deliveryMode}`} />
        </div>

        <div className="premium-search">
          <Search size={18} className="text-secondary" />
          <input
            type="text"
            placeholder="What are you hungry for?"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button className="cart-btn" onClick={() => setShowCart(true)}>
            <ShoppingBag size={20} />
            {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="categories-scroll">
        {categories.map((cat) => (
          <button key={cat} className={`category-chip ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
            {cat === 'Featured' && <Sparkles size={14} className={activeCategory === cat ? '' : 'text-accent-secondary'} />}
            {cat}
          </button>
        ))}
      </div>

      {/* Main Catalog View */}
      <div className="catalog-scroll-area">
        {activeCategory === 'Featured' ? (
          <>
            {featuredItem && (
              <section className="food-section">
                <h3 className="section-title"><Flame size={18} className="text-accent-tertiary" /> Trending Now</h3>
                <motion.div whileTap={{ scale: 0.98 }} className="featured-card">
                  <div className="featured-img" style={{ backgroundImage: `url('${getItemImage(featuredItem)}')` }}>
                    <div className="card-gradient"></div>
                    <div className="featured-meta">
                      <div className="eta-badge shadow-glow"><Clock size={12} /> {featuredItem.wait_time || 'Live ETA'}</div>
                    </div>
                    <div className="featured-content">
                      <h4>{featuredItem.name}</h4>
                      <p className="vendor-location"><MapPin size={12}/> {featuredItem.location || 'Venue concession'}</p>
                    </div>
                  </div>
                  <div className="featured-footer glass-panel-elevated">
                    <div className="price-tag">₹{featuredItem.price}.00</div>
                    <button className="btn-add-premium" onClick={() => addToCart(featuredItem)}>
                      <Plus size={16} /> Add to Tray
                    </button>
                  </div>
                </motion.div>
              </section>
            )}

            {categories.filter(c => c !== 'Featured').map(cat => {
              const visible = applySearch(menuItems.filter(i => i.category === cat)).slice(0, 2);
              if (visible.length === 0) return null;
              return (
                <section key={cat} className="food-section">
                  <div className="section-header-row">
                    <h3 className="section-title">{cat}</h3>
                    <button className="view-all-link" onClick={() => setActiveCategory(cat)}>View All</button>
                  </div>
                  <div className="menu-grid">
                    {visible.map((item) => (
                      <motion.div key={item.id} whileTap={{ scale: 0.96 }} className="menu-card glass-panel">
                        <div className="menu-img" style={{ backgroundImage: `url('${getItemImage(item)}')` }}></div>
                        <div className="menu-details">
                          <h5>{item.name}</h5>
                          <span className="cal-text">{item.calories || 450} cal</span>
                          <div className="menu-bottom">
                            <span className="menu-price">₹{item.price}.00</span>
                            <button className="add-icon-btn" onClick={() => addToCart(item)}><Plus size={16}/></button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              );
            })}
            {!featuredItem && menuItems.length === 0 && (
              <div className="empty-state-p">No live menu is configured for this stadium yet.</div>
            )}
          </>
        ) : (
          <section className="food-section">
            <h3 className="section-title">{activeCategory}</h3>
            <div className="menu-grid full-grid">
              {applySearch(menuItems.filter(i => i.category === activeCategory)).map((item) => (
                <motion.div key={item.id} whileTap={{ scale: 0.96 }} className="menu-card glass-panel">
                  <div className="menu-img" style={{ backgroundImage: `url('${getItemImage(item)}')` }}></div>
                  <div className="menu-details">
                    <h5>{item.name}</h5>
                    <span className="cal-text">{item.calories || 450} cal</span>
                    <div className="menu-bottom">
                      <span className="menu-price">₹{item.price}.00</span>
                      <button className="add-icon-btn" onClick={() => addToCart(item)}><Plus size={16}/></button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {applySearch(menuItems.filter(i => i.category === activeCategory)).length === 0 && (
              <div className="empty-state-p">No items found in this category.</div>
            )}
          </section>
        )}
      </div>

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="drawer-overlay" onClick={() => setShowCart(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="cart-drawer glass-panel-elevated">
              <div className="drawer-header">
                <h3>My Tray</h3>
                <button onClick={() => setShowCart(false)}><X size={20}/></button>
              </div>

              {cart.length === 0 ? (
                <div className="empty-cart-state">
                  <ShoppingBag size={48} className="text-secondary" />
                  <p>Your tray is empty.</p>
                </div>
              ) : (
                <>
                  <div className="cart-items-list">
                    {cart.map(item => (
                      <div key={item.id} className="cart-item">
                        <div className="item-thumb" style={{backgroundImage: `url('${getItemImage(item)}')`}}></div>

                        <div className="item-info">
                          <h6>{item.name}</h6>
                          <span>₹{item.price} each</span>
                        </div>
                        <div className="qty-controls">
                          <button onClick={() => updateQuantity(item.id, -1)} className="qty-btn"><Minus size={14} /></button>
                          <span className="qty-val">{item.qty}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="qty-btn"><Plus size={14} /></button>
                        </div>
                        <button className="remove-item" onClick={() => removeFromCart(item.id)}><X size={14}/></button>
                      </div>
                    ))}
                  </div>

                  <div className="cart-checkout-box">
                    <div className="total-row">
                      <span>Total</span>
                      <span className="total-val">₹{cartTotal}.00</span>
                    </div>
                    <div className="delivery-info-mini">{deliveryLabel}</div>
                    {checkoutError && <div className="guest-warning-cart"><span>{checkoutError}</span></div>}

                    <button
                      className="checkout-main-btn"
                      onClick={processOrder}
                      disabled={orderStatus !== 'idle'}
                    >
                      {orderStatus === 'processing' ? (
                        <div className="spinning" style={{ border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', width: 18, height: 18, display: 'inline-block' }} />
                      ) : orderStatus === 'success' ? (
                        <><CheckCircle2 size={20} /> Order Placed!</>
                      ) : (
                        <><Navigation size={18} /> Order Now <ArrowRight size={18} /></>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
