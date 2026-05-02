import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface UserProfileRow {
  id: string;
  homeLocation?: string | null;
  onboarded?: boolean | null;
  last_active_tab?: string | null;
  last_alert_read_at?: string | null;
  display_name?: string | null;
  email?: string | null;
  notifications_enabled?: boolean | null;
  favorite_vendor?: string | null;
  settings_last_opened_at?: string | null;
}

export interface ReplayItemRow {
  id: string;
  title: string;
  description: string | null;
  status: 'published' | 'draft' | 'archived';
  stadium: string | null;
  created_at: string;
}

export interface PerkCatalogRow {
  id: string;
  title: string;
  description: string | null;
  cta_label: string | null;
  category: string;
  status: 'active' | 'inactive';
  metadata?: Record<string, string | number | boolean | null> | null;
}

export interface MapLayoutRow {
  stadium: string;
  north_label: string | null;
  south_label: string | null;
  east_label: string | null;
  west_label: string | null;
}

export interface SquadRow {
  id: string;
  code: string;
  created_by: string;
  stadium: string | null;
  created_at: string;
}

export interface SquadMemberRow {
  id: string;
  squad_id: string;
  user_id: string;
  display_name: string;
  current_location: string | null;
  status: 'active' | 'away' | 'offline';
  color: string | null;
  joined_at: string;
}

export type TicketActionType = 'wallet' | 'transfer' | 'sell';

export async function ensureUserProfile(client: SupabaseClient, user: User) {
  const fallbackName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    'Stadia Fan';

  await client.from('users').upsert({
    id: user.id,
    display_name: fallbackName,
    email: user.email ?? null,
  });
}

export async function createTicketActionRequest(
  client: SupabaseClient,
  input: {
    uid: string;
    ticketId: string | null;
    actionType: TicketActionType;
    notes?: string | null;
    metadata?: Record<string, string | number | boolean | null> | null;
  },
) {
  return client.from('ticket_action_requests').insert({
    uid: input.uid,
    ticket_id: input.ticketId,
    action_type: input.actionType,
    status: 'pending',
    notes: input.notes ?? null,
    metadata: input.metadata ?? null,
  });
}

export async function createSupportRequest(
  client: SupabaseClient,
  input: {
    uid: string;
    category: string;
    ticketId?: string | null;
    message?: string | null;
  },
) {
  return client.from('support_requests').insert({
    uid: input.uid,
    category: input.category,
    ticket_id: input.ticketId ?? null,
    message: input.message ?? null,
    status: 'open',
  });
}

export async function logPerkAction(
  client: SupabaseClient,
  input: {
    uid: string;
    perkId: string;
    action: string;
    status?: string;
    metadata?: Record<string, string | number | boolean | null> | null;
  },
) {
  return client.from('user_perk_actions').insert({
    uid: input.uid,
    perk_id: input.perkId,
    action: input.action,
    status: input.status ?? 'completed',
    metadata: input.metadata ?? null,
  });
}

export function generateSquadCode() {
  return `STADIA-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
