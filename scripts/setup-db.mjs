/**
 * StadiaSync — Apply full DB schema + seed demo data
 * Run: node scripts/setup-db.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://zrhztjrkshgddkhmnjeo.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyaHp0anJrc2hnZGRraG1uamVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzczMDkxOSwiZXhwIjoyMDkzMzA2OTE5fQ.xhBGI4flxbCr612x3bQ3gA1HBGj3Nyd4Fg3gn1g-vfE';

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
  console.log('🔧 Setting up StadiaSync data...\n');
  // Note: Run the SQL migration in Supabase Dashboard → SQL Editor if tables are missing.

  console.log('📋 Seeding stadium_config...');
  await sb.from('stadium_config').upsert({
    id: 'current_match',
    stadium: 'Narendra Modi Stadium, Ahmedabad',
    date: 'May 3, 2026',
    time: '7:30 PM',
    status: 'LIVE',
    timer: '14.2 Overs'
  });
  console.log('  ✅ current_match seeded');

  // ── Seed: intel_alerts ──
  console.log('📋 Seeding intel_alerts...');
  await sb.from('intel_alerts').upsert([
    { id: 'alert-1', type: 'warning',   title: 'Gate 2 Congestion', description: 'Heavy crowd near Gate 2. Use Gate 4 for faster entry.', created_at: new Date().toISOString() },
    { id: 'alert-2', type: 'success',   title: 'Gate 4 Clear',      description: 'Gate 4 is completely open. Fastest entry right now.', created_at: new Date().toISOString() },
    { id: 'alert-3', type: 'emergency', title: 'First Aid Station', description: 'First Aid available at North Stand Gate 7.', created_at: new Date().toISOString() },
  ]);
  console.log('  ✅ alerts seeded');

  // ── Seed: queue_status ──
  console.log('📋 Seeding queue_status...');
  await sb.from('queue_status').upsert([
    { id: 'gate-1', name: 'Gate 1', type: 'Gate', waitMin: 12, status: 'Medium Wait' },
    { id: 'gate-2', name: 'Gate 2', type: 'Gate', waitMin: 22, status: 'High Wait' },
    { id: 'gate-3', name: 'Gate 3', type: 'Gate', waitMin: 4,  status: 'Low Wait' },
    { id: 'gate-4', name: 'Gate 4', type: 'Gate', waitMin: 2,  status: 'Low Wait' },
    { id: 'gate-5', name: 'Gate 5', type: 'Gate', waitMin: 8,  status: 'Medium Wait' },
    { id: 'gate-6', name: 'Gate 6', type: 'Gate', waitMin: 15, status: 'High Wait' },
    { id: 'food-hub-1', name: 'Food Hub 1', type: 'Food', waitMin: 6,  status: 'Low Wait' },
    { id: 'food-hub-2', name: 'Food Hub 2', type: 'Food', waitMin: 14, status: 'High Wait' },
  ]);
  console.log('  ✅ queue_status seeded');

  // ── Seed: facilities ──
  console.log('📋 Seeding facilities...');
  await sb.from('facilities').upsert([
    { id: 'restroom-north', name: 'North Restrooms',  category: 'Restroom', status: 'Clear',    dist: '120m', color: 'success' },
    { id: 'food-south',     name: 'South Food Hall',  category: 'Food',     status: 'Moderate', dist: '200m', color: 'warning' },
    { id: 'restroom-east',  name: 'East Restrooms',   category: 'Restroom', status: 'Crowded',  dist: '80m',  color: 'tertiary' },
    { id: 'food-west',      name: 'West Snack Bar',   category: 'Food',     status: 'Clear',    dist: '150m', color: 'success' },
    { id: 'first-aid',      name: 'First Aid',        category: 'Medical',  status: 'Clear',    dist: '300m', color: 'primary' },
  ]);
  console.log('  ✅ facilities seeded');

  // ── Seed: menu_items ──
  console.log('📋 Seeding menu_items...');
  await sb.from('menu_items').upsert([
    { id: 'food-1', name: 'Vada Pav',         price: 60,  category: 'Snacks',   calories: 320, is_active: true, is_featured: false, location: 'Gate 2 Concession', wait_time: '3 mins' },
    { id: 'food-2', name: 'Maharaja Thali',   price: 280, category: 'Meals',    calories: 850, is_active: true, is_featured: true,  location: 'South Food Hall',   wait_time: '8 mins' },
    { id: 'food-3', name: 'Gulab Jamun',      price: 80,  category: 'Desserts', calories: 420, is_active: true, is_featured: false, location: 'Gate 4 Concession', wait_time: '2 mins' },
    { id: 'food-4', name: 'Samosa (2 pcs)',   price: 50,  category: 'Snacks',   calories: 280, is_active: true, is_featured: false, location: 'Gate 1 Snack Bar',  wait_time: '2 mins' },
    { id: 'food-5', name: 'Masala Chai',      price: 40,  category: 'Drinks',   calories: 90,  is_active: true, is_featured: false, location: 'All Concessions',   wait_time: '1 min'  },
    { id: 'food-6', name: 'Cold Coffee',      price: 120, category: 'Drinks',   calories: 180, is_active: true, is_featured: false, location: 'Café Express',      wait_time: '4 mins' },
    { id: 'food-7', name: 'Paneer Wrap',      price: 180, category: 'Meals',    calories: 650, is_active: true, is_featured: false, location: 'West Snack Bar',    wait_time: '6 mins' },
    { id: 'food-8', name: 'Fruit Chaat',      price: 100, category: 'Snacks',   calories: 160, is_active: true, is_featured: false, location: 'Gate 3 Counter',    wait_time: '2 mins' },
    { id: 'food-9', name: 'Mango Lassi',      price: 90,  category: 'Drinks',   calories: 240, is_active: true, is_featured: false, location: 'All Concessions',   wait_time: '3 mins' },
    { id: 'food-10',name: 'Ice Cream Cup',    price: 70,  category: 'Desserts', calories: 350, is_active: true, is_featured: false, location: 'Gate 5 Kiosk',     wait_time: '1 min'  },
  ]);
  console.log('  ✅ menu_items seeded (10 items)');

  // ── Seed: perk_catalog ──
  console.log('📋 Seeding perk_catalog...');
  await sb.from('perk_catalog').upsert([
    { id: 'vip-water-refill', title: 'Free Water Refill',      description: 'Show this to any Aqua Station attendant for a free refill.', cta_label: 'Unlock Perk', category: 'dashboard', status: 'active' },
    { id: 'match-day-rewards', title: 'Match Day Rewards',     description: 'Earn points for every match you attend.',                     cta_label: 'View Rewards', category: 'profile',   status: 'active' },
  ]);
  console.log('  ✅ perk_catalog seeded');

  // ── Seed: replay_items ──
  console.log('📋 Seeding replay_items...');
  await sb.from('replay_items').upsert([
    { id: 'replay-1', title: 'Six by Rohit Sharma — Over 14', description: 'Massive 110m six over mid-wicket.', status: 'published', created_at: new Date().toISOString() },
    { id: 'replay-2', title: 'Wicket — Clean Bowled — Over 8', description: 'Shami takes the prize wicket.',     status: 'published', created_at: new Date().toISOString() },
  ]);
  console.log('  ✅ replay_items seeded');

  // ── Seed: transport_options ──
  console.log('📋 Seeding transport_options...');
  await sb.from('transport_options').upsert([
    { id: 'transport-1', mode: 'metro', title: 'Motera Metro Line', subtitle: 'Platform B — every 6 mins', eta_min: 12 },
    { id: 'transport-2', mode: 'car',   title: 'Ola / Uber Pickup', subtitle: 'Zone C Parking Exit',        eta_min: 8  },
    { id: 'transport-3', mode: 'metro', title: 'Express Shuttle',   subtitle: 'Direct to City Centre',      eta_min: 22 },
  ]);
  console.log('  ✅ transport_options seeded');

  // ── Seed: map_pois ──
  console.log('📋 Seeding map_pois...');
  await sb.from('map_pois').upsert([
    { id: 1, type: 'food',     label: 'Gate 2 Food',   top: '25%', left: '70%', x: 70, y: 25, eta_min: 2, distance_m: 80  },
    { id: 2, type: 'exit',     label: 'Gate 4 Exit',   top: '80%', left: '55%', x: 55, y: 80, eta_min: 4, distance_m: 200 },
    { id: 3, type: 'restroom', label: 'WC North',      top: '15%', left: '40%', x: 40, y: 15, eta_min: 3, distance_m: 130 },
    { id: 4, type: 'food',     label: 'Snack Bar',     top: '50%', left: '20%', x: 20, y: 50, eta_min: 3, distance_m: 150 },
    { id: 5, type: 'exit',     label: 'Gate 7 Exit',   top: '40%', left: '85%', x: 85, y: 40, eta_min: 6, distance_m: 280 },
    { id: 6, type: 'restroom', label: 'WC South',      top: '75%', left: '35%', x: 35, y: 75, eta_min: 2, distance_m: 90  },
  ]);
  console.log('  ✅ map_pois seeded');

  console.log('\n🎉 Database fully set up and seeded!');
  console.log('   Reload your app — all sections should now show live data.\n');
}

run().catch(console.error);
