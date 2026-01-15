/**
 * Supabase Client Configuration for Frontend
 *
 * Uses the anon key for client-side authentication.
 * Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - auth will not work')
}

// precise-edit: fallback to dummy values to prevent crash if env vars are missing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)
