import { createClient } from '@supabase/supabase-js'

// ============================================
// ВАЖНО: Замените эти значения на свои из Supabase Dashboard!
// ============================================
// 1. Откройте https://supabase.com/dashboard/
// 2. Выберите ваш проект
// 3. Перейдите в Settings → API
// 4. Скопируйте:
//    - Project URL (начинается с https://...)
//    - anon public key (начинается с eyJ... и очень длинный)
// ============================================

const SUPABASE_URL = 'https://iwfrojbhfihzuikxhgos.supabase.co'

// ⚠️ ЭТО НЕПРАВИЛЬНЫЙ КЛЮЧ! Замените на свой из Supabase Dashboard → Settings → API → anon public
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnJvamJmZmloenVpa3hoaGdvcyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM2NzY4MDAwLCJleHAiOjIwNTIzNDQwMDB9.SAMPLE_TOKEN_REPLACE_ME'

console.log('[Supabase] URL:', SUPABASE_URL)
console.log('[Supabase] Key length:', SUPABASE_ANON_KEY.length, 'characters')
console.log('[Supabase] Key starts with:', SUPABASE_ANON_KEY.substring(0, 20) + '...')

// Проверка ключа
if (!SUPABASE_ANON_KEY.startsWith('eyJ') || SUPABASE_ANON_KEY.length < 100) {
  console.error('[Supabase] ⚠️ НЕПРАВИЛЬНЫЙ ANON KEY!')
  console.error('[Supabase] Откройте Supabase Dashboard → Settings → API и скопируйте "anon public" key')
  console.error('[Supabase] Правильный ключ начинается с "eyJ..." и содержит 200+ символов')
}

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
