import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { Event } from './types'

export interface BallastEvent {
  id: string
  user_id: string
  created_at: string
}

const BALLAST_CACHE_KEY = 'ballast_events_cache'
const BALLAST_CACHE_TS_KEY = 'ballast_events_cache_ts'

// Хук для работы с событиями сброса балласта (отдельно от общей ленты events).
// Статистика кэшируется в localStorage для мгновенного старта и обновляется
// оптимистично при сбросе, а затем синхронизируется с Supabase в фоне.
export function useBallastStats(profile: Profile | null) {
  const [ballastEvents, setBallastEvents] = useState<BallastEvent[]>([])
  const profileRef = useRef(profile)
  profileRef.current = profile

  // Мгновенная инициализация из localStorage (если кэш принадлежит текущему пользователю)
  useEffect(() => {
    if (!profile) return
    try {
      const cachedUserId = localStorage.getItem(`${BALLAST_CACHE_KEY}_user`)
      const raw = localStorage.getItem(BALLAST_CACHE_KEY)
      if (raw && cachedUserId === profile.id) {
        const parsed = JSON.parse(raw) as BallastEvent[]
        if (Array.isArray(parsed)) {
          setBallastEvents(parsed)
        }
      }
    } catch {
      // Игнорируем ошибки чтения кэша
    }
  }, [profile])

  // Сохранение кэша при изменении
  const persistCache = useCallback((events: BallastEvent[], userId: string) => {
    try {
      localStorage.setItem(BALLAST_CACHE_KEY, JSON.stringify(events))
      localStorage.setItem(`${BALLAST_CACHE_KEY}_user`, userId)
      localStorage.setItem(BALLAST_CACHE_TS_KEY, new Date().toISOString())
    } catch {
      // Игнорируем ошибки доступа к localStorage
    }
  }, [])

  // Фоновая загрузка из Supabase
  const fetchBallastEvents = useCallback(async () => {
    const currentProfile = profileRef.current
    if (!currentProfile) return
    const { data } = await supabase
      .from('ballast_events')
      .select('*')
      .eq('user_id', currentProfile.id)
      .order('created_at', { ascending: false })
      .limit(500)
    if (data) {
      setBallastEvents(data as BallastEvent[])
      persistCache(data as BallastEvent[], currentProfile.id)
    }
  }, [persistCache])

  useEffect(() => {
    if (!profile) return
    fetchBallastEvents()
  }, [profile, fetchBallastEvents])

  // Оптимистичное добавление события сброса балласта.
  // Мгновенно обновляет локальный стейт и кэш, не задерживая UI,
  // а запись в Supabase выполняется в фоне.
  const addBallastEvent = useCallback(() => {
    const currentProfile = profileRef.current
    if (!currentProfile) return

    const optimisticEvent: BallastEvent = {
      id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      user_id: currentProfile.id,
      created_at: new Date().toISOString(),
    }

    setBallastEvents(prev => {
      const updated = [optimisticEvent, ...prev]
      persistCache(updated, currentProfile.id)
      return updated
    })

    // Фоновая вставка в Supabase (не блокирует оптимистичное окно и пуш друзьям)
    ;(async () => {
      try {
        const { data } = await supabase
          .from('ballast_events')
          .insert({ user_id: currentProfile.id })
          .select()
          .single()
        if (data) {
          // Заменяем оптимистичную запись реальной
          setBallastEvents(prev => {
            const updated = prev.map(e => (e.id === optimisticEvent.id ? (data as BallastEvent) : e))
            persistCache(updated, currentProfile.id)
            return updated
          })
        }
      } catch {
        // Игнорируем ошибки фоновой вставки — оптимистичное состояние уже показано
      }
    })()
  }, [persistCache])

  return {
    ballastEvents,
    addBallastEvent,
    fetchBallastEvents,
  }
}