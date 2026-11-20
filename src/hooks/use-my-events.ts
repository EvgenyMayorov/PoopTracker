import { useState, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'

export interface Event {
  id: string
  user_id: string
  created_at: string
  bristol_type?: number
  profiles?: {
    id: string
    username: string
    email?: string | null
    avatar: string
  }
}

// Хук для работы со своими событиями
export function useMyEvents(profile: Profile | null) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)

  const fetchEvents = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) {
      setEvents(data)
    }
    setLoading(false)
  }, [profile])

  const addEvent = useCallback(async () => {
    if (!profile) return null
    const { data, error } = await supabase
      .from('events')
      .insert({ user_id: profile.id })
      .select()
      .single()
    if (data) {
      fetchEvents()
    }
    return data?.id || null
  }, [profile, fetchEvents])

  const updateEventBristol = useCallback(async (eventId: string, bristolType: number) => {
    if (!profile) return
    await supabase
      .from('events')
      .update({ bristol_type: bristolType })
      .eq('id', eventId)
    fetchEvents()
  }, [profile, fetchEvents])

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!profile) return
    await supabase.from('events').delete().eq('id', eventId)
    fetchEvents()
  }, [profile, fetchEvents])

  return {
    events,
    loading,
    fetchEvents,
    addEvent,
    updateEventBristol,
    deleteEvent,
  }
}