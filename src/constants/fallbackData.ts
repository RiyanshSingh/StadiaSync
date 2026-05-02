export const FALLBACK_ALERTS = [
  { 
    id: 'a1', 
    title: 'Gate 3 Congestion', 
    description: 'Heavy security checks at Gate 3. Use Gate 4 for faster entry.', 
    type: 'warning',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() 
  },
  { 
    id: 'a2', 
    title: 'Half-Time Offer', 
    description: '50% off on all beverages at the Adani Stand for the next 15 mins!', 
    type: 'success',
    created_at: new Date().toISOString() 
  }
];

export const FALLBACK_FACILITIES = [
  { id: 'f1', name: 'Vada Pav Stall', category: 'Food', status: 'Clear', dist: '2 min walk', color: 'primary' },
  { id: 'f2', name: 'South Restroom', category: 'Restroom', status: 'Crowded', dist: '4 min walk', color: 'tertiary' },
  { id: 'f3', name: 'Medical Room', category: 'Service', status: 'Clear', dist: '1 min walk', color: 'success' }
];

export const FALLBACK_QUEUES = [
  { id: '1', type: 'Gate',     name: 'Gate 4 Entry',        waitMin: 2,  status: 'Low Wait' },
  { id: '2', type: 'Gate',     name: 'Gate 3 Entry',        waitMin: 18, status: 'High Wait' },
  { id: '3', type: 'Food',     name: 'Mewar Food Stall 2',  waitMin: 8,  status: 'Medium Wait' },
  { id: '4', type: 'Food',     name: 'Kiosk C - Drinks',    waitMin: 1,  status: 'Low Wait' },
  { id: '5', type: 'Washroom', name: 'Washrooms Section 4', waitMin: 4,  status: 'Low Wait' },
];
