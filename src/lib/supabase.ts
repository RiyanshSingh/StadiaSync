import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseEnabled) {
  console.warn('[StadiaSync] Missing Supabase environment variables. Features requiring Supabase will be disabled.');
}

export const supabase = isSupabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
