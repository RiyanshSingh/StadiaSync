import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[StadiaSync] Missing Supabase environment variables. Features requiring Supabase will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
