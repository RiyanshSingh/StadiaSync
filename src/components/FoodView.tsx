import { Search, MapPin, Clock, Plus, Minus, Flame, Sparkles, Navigation, CheckCircle2, ShoppingBag, X, ArrowRight, Star, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import './FoodView.css';

export default function FoodView() {
  const { showOrderNotification, userTicket, guestTicketData, session } = useApp();
  const displayTicket = userTicket || guestTicketData;
  const [deliveryMode, setDeliveryMode] = useState<'pickup' | 'delivery'>('delivery');
  const [activeCategory, setActiveCategory] = useState('Featured');
  const [searchQuery, setSearchQuery] = useState('');

  // Database state
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [featuredItem, setFeaturedItem] = useState<any>(null);

  // Cart/Checkout States
  const [cart, setCart] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const categories = ['Featured', 'Snacks', 'Meals', 'Drinks', 'Desserts'];

  const fallbackMenu = [
    // SNACKS (14 Items)
    { id: 1,  name: 'Mumbai Vada Pav',    price: 120, category: 'Snacks',   calories: 340, image: 'https://images.unsplash.com/photo-1662116765994-1e0063259838?auto=format&fit=crop&w=500&q=60' },
    { id: 2,  name: 'Stadium Nachos',     price: 250, category: 'Snacks',   calories: 510, image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=500&q=60' },
    { id: 3,  name: 'Spicy Samosa (2pc)', price: 90,  category: 'Snacks',   calories: 280, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=60' },
    { id: 4,  name: 'Masala Bhelpuri',    price: 110, category: 'Snacks',   calories: 180, image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=60' },
    { id: 5,  name: 'French Fries XXL',   price: 180, category: 'Snacks',   calories: 420, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=60' },
    { id: 6,  name: 'Chicken Popcorn',    price: 280, category: 'Snacks',   calories: 450, image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=500&q=60' },
    { id: 7,  name: 'Onion Bhajia',       price: 130, category: 'Snacks',   calories: 310, image: 'https://images.unsplash.com/photo-1630409351241-e90e7f5e434d?auto=format&fit=crop&w=500&q=60' },
    { id: 8,  name: 'Cheese Chili Toast', price: 160, category: 'Snacks',   calories: 290, image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=500&q=60' },
    { id: 9,  name: 'Spring Rolls (4pc)', price: 190, category: 'Snacks',   calories: 240, image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=500&q=60' },
    { id: 10, name: 'Veg Puff (Crispy)',  price: 80,  category: 'Snacks',   calories: 190, image: 'https://images.unsplash.com/photo-1623653387945-2fd25214f8fc?auto=format&fit=crop&w=500&q=60' },
    { id: 11, name: 'Aloo Tikki Burger',  price: 150, category: 'Snacks',   calories: 380, image: 'https://images.unsplash.com/photo-1571091718767-18b5c1457add?auto=format&fit=crop&w=500&q=60' },
    { id: 12, name: 'Salted Popcorn Tub', price: 210, category: 'Snacks',   calories: 350, image: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=500&q=60' },
    { id: 13, name: 'Potato Wedges',      price: 160, category: 'Snacks',   calories: 280, image: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=500&q=60' },
    { id: 15, name: 'Corn Cup (Buttery)', price: 100, category: 'Snacks',   calories: 120, image: 'https://images.unsplash.com/photo-1551782450-17144efb9c50?auto=format&fit=crop&w=500&q=60' },

    // MEALS (10 Items)
    { id: 16, name: 'Hyderabadi Biryani',   price: 380, category: 'Meals', calories: 720, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=60' },
    { id: 17, name: 'Paneer Tikka Wrap',    price: 220, category: 'Meals', calories: 480, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=60' },
    { id: 18, name: 'Dal Makhani & Naan',   price: 320, category: 'Meals', calories: 650, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=60' },
    { id: 19, name: 'Chicken Shawarma',     price: 240, category: 'Meals', calories: 550, image: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=500&q=60' },
    { id: 20, name: 'Rajma Chawal Combo',   price: 250, category: 'Meals', calories: 510, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=500&q=60' },
    { id: 21, name: 'Classic Veg Pizza',    price: 340, category: 'Meals', calories: 820, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=60' },
    { id: 22, name: 'Butter Chicken Rice',  price: 390, category: 'Meals', calories: 780, image: 'https://images.unsplash.com/photo-1603894584714-f4b23467652c?auto=format&fit=crop&w=500&q=60' },
    { id: 23, name: 'Hakka Noodles Box',    price: 210, category: 'Meals', calories: 540, image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=500&q=60' },
    { id: 24, name: 'Chole Bhature (2pc)',  price: 180, category: 'Meals', calories: 850, image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=60' },
    { id: 25, name: 'Grilled Sandwich',     price: 160, category: 'Meals', calories: 380, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=60' },

    // DRINKS (15 Items)
    { id: 26, name: 'Thums Up (500ml)',        price: 90,  category: 'Drinks', calories: 140, image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=60' },
    { id: 27, name: 'Cold Coffee Float',       price: 180, category: 'Drinks', calories: 310, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=60' },
    { id: 28, name: 'Masala Chai',             price: 60,  category: 'Drinks', calories: 80,  image: 'https://images.unsplash.com/photo-1544787210-2211d24715ec?auto=format&fit=crop&w=500&q=60' },
    { id: 29, name: 'Fresh Lime Soda',         price: 110, category: 'Drinks', calories: 95,  image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=60' },
    { id: 30, name: 'Orange Juice',            price: 140, category: 'Drinks', calories: 120, image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=500&q=60' },
    { id: 31, name: 'Red Bull Energy',         price: 210, category: 'Drinks', calories: 110, image: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?auto=format&fit=crop&w=500&q=60' },
    { id: 32, name: 'Mineral Water',           price: 50,  category: 'Drinks', calories: 0,   image: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&w=500&q=60' },
    { id: 33, name: 'Iced Peach Tea',          price: 160, category: 'Drinks', calories: 110, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=60' },
    { id: 34, name: 'Sweet Lassi (Chilled)',   price: 120, category: 'Drinks', calories: 240, image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed2bb4?auto=format&fit=crop&w=500&q=60' },
    { id: 35, name: 'Virgin Mojito',           price: 180, category: 'Drinks', calories: 160, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=500&q=60' },
    { id: 36, name: 'Cappuccino',              price: 150, category: 'Drinks', calories: 120, image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=60' },
    { id: 37, name: 'Strawberry Milkshake',    price: 190, category: 'Drinks', calories: 320, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=60' },
    { id: 38, name: 'Butter Milk (Chas)',      price: 70,  category: 'Drinks', calories: 45,  image: 'https://images.unsplash.com/photo-1600335895229-6e75511892c8?auto=format&fit=crop&w=500&q=60' },
    { id: 39, name: 'Watermelon Cooler',       price: 160, category: 'Drinks', calories: 110, image: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=500&q=60' },
    { id: 40, name: 'Ginger Ale',             price: 130, category: 'Drinks', calories: 90,  image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=60' },

    // DESSERTS (10 Items)
    { id: 41, name: 'Gulab Jamun (2pc)', price: 110, category: 'Desserts', calories: 290, image: 'https://images.unsplash.com/photo-1548943487-a2e4d43b4853?auto=format&fit=crop&w=500&q=60' },
    { id: 42, name: 'Choco Lava Cake',   price: 180, category: 'Desserts', calories: 450, image: 'https://images.unsplash.com/photo-1511911063855-2bf39afa5b2e?auto=format&fit=crop&w=500&q=60' },
    { id: 43, name: 'Vanilla Ice Cream', price: 90,  category: 'Desserts', calories: 210, image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=500&q=60' },
    { id: 44, name: 'Mango Kulfi Cup',   price: 120, category: 'Desserts', calories: 180, image: 'https://images.unsplash.com/photo-1505394033323-424eec7d0ee5?auto=format&fit=crop&w=500&q=60' },
    { id: 45, name: 'Chocolate Brownie', price: 160, category: 'Desserts', calories: 350, image: 'https://images.unsplash.com/photo-1464349153735-7db50ed83c84?auto=format&fit=crop&w=500&q=60' },
    { id: 46, name: 'Fruit Salad Bowl',  price: 180, category: 'Desserts', calories: 150, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=60' },
    { id: 47, name: 'Cheesecake Slice',  price: 290, category: 'Desserts', calories: 410, image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=60' },
    { id: 48, name: 'Gajar Ka Halwa',    price: 150, category: 'Desserts', calories: 320, image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=60' },
    { id: 49, name: 'Donut (Assorted)',  price: 130, category: 'Desserts', calories: 340, image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=500&q=60' },
    { id: 50, name: 'Fresh Cut Mango',   price: 140, category: 'Desserts', calories: 110, image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=500&q=60' }
  ];

  useEffect(() => {

    const initMenu = async () => {
      try {
        const { data: menuData } = await supabase.from('menu_items').select('*');
        if (menuData && menuData.length > 0) {
          setMenuItems(menuData);
        } else {
          setMenuItems(fallbackMenu);
        }
        setFeaturedItem({
          name: 'Maharaja Thali', price: 450, wait_time: '12 min', location: 'Gate 4 Hub',
          image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80'
        });
      } catch {
        setMenuItems(fallbackMenu);
      }
    };
    initMenu();
  }, []);

  const getItemImage = (item: any) => {
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
    
    // Fallback to the hardcoded fallbackMenu images if available
    const fallback = fallbackMenu.find(f => f.name.toLowerCase() === name || f.id === item.id);
    if (fallback && fallback.image) return fallback.image;
    
    // Final generic fallback
    return 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=60';
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQuantity = (id: any, delta: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (!existing) return prev;
      if (existing.qty + delta <= 0) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i);
    });
  };

  const removeFromCart = (id: any) => setCart(prev => prev.filter(i => i.id !== id));

  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);

  const processOrder = async () => {
    setOrderStatus('processing');
    try {
      const user = session;
      if (user) {
        // Persist order to Supabase
        await supabase.from('orders').insert({
          uid: user.id,
          items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
          total: cartTotal,
          deliveryMode,
          seatInfo: displayTicket ? { stadium: displayTicket.stadium, block: displayTicket.block, gate: displayTicket.gate } : null,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      // Guest or network error — still show success for UX
      console.warn('Order write skipped:', err);
    }

    setOrderStatus('success');
    // Fire global notification popup on home screen
    showOrderNotification({
      id: Date.now().toString(),
      items: cart.map(i => ({ name: i.name, qty: i.qty })),
      total: cartTotal,
      deliveryMode,
      seat: displayTicket ? `${displayTicket.block || ''} • Row ${displayTicket.row || '--'} • Seat ${displayTicket.seat || '--'}` : '--',
      timestamp: Date.now(),
    });
    setTimeout(() => {
      setCart([]);
      setOrderStatus('idle');
      setShowCart(false);
    }, 2500);
  };

  // Generic search filter applied across all views
  const applySearch = (items: any[]) => {
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
        <div className="food-header-text">
          <h2 className="display-title">Cravings. <span className="text-accent-tertiary">Solved.</span></h2>
          <p className="page-subtitle">Skip the lines, not the game.</p>
        </div>

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
                      <div className="eta-badge shadow-glow"><Clock size={12} /> {featuredItem.wait_time}</div>
                    </div>
                    <div className="featured-content">
                      <h4>{featuredItem.name}</h4>
                      <p className="vendor-location"><MapPin size={12}/> {featuredItem.location}</p>
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
                        <div className="item-thumb" style={{backgroundImage: `url('${item.image || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=60'}')`}}></div>
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

                    {session === null && (
                      <div className="guest-warning-cart">
                        <span>⚠ Guest mode — order won't be saved.</span>
                      </div>
                    )}

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
