import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iwfrojbhfihzuikxhgos.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnJvamJoZmloenVpa3hoZ29zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3ODY1OTcsImV4cCI6MjEwOTM2MjU5N30.y_YKvdct_lA0p9rZOVDR2-rZMjPowIFnQyEGPSdSe7g'

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
  avatar: string
  email?: string | null
  updated_at: string
}

export type PushSubscription = {
  id?: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  updated_at?: string
}

export type PoopEvent = {
  id: string
  user_id: string
  created_at: string
}
