import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** false tant que les variables publiques ne sont pas définies : le site reste consultable (contenu de démonstration). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Seules VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (publiques) sont utilisées côté frontend.
export const supabase = createClient(
  supabaseUrl || 'https://not-configured.invalid',
  supabaseAnonKey || 'not-configured',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
