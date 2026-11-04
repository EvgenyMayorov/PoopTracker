import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iwfrojbhfihzuikxhgos.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_WLRRL4gwUTpbJHPFkp5sbg_-G8y5Jil'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
})

export type Profile = {
  id: string
  username: string
  updated_at: string
}

export type PoopEvent = {
  id: string
  user_id: string
  created_at: string
}
