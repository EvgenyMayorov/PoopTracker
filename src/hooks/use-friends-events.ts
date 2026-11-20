import { useState, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { Friend } from './types'

export function useFriendsEvents(profile: Profile | null, following: Friend[]) {
  const [friendsEvents, setFriendsEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFriendsEvents = useCallback(async () => {
    if (!profile || following.length === 0) {
      setFriendsEvents([])
      return
    }
    setLoading(true)
    const friendIds = following.map(f => f.user_id)
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(50)

    if (eventsData && eventsData.length > 0) {
      const userIds = [...new Set(eventsData.map(e => e.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', userIds)

      const eventsWithProfiles = eventsData.map(event => {
        const profile = profilesData?.find(p => p.id === event.user_id)
        return {
          ...event,
          profiles: profile
            ? { id: profile.id, username: profile.username, email: profile.email, avatar: profile.avatar || '💩' }
            : null,
        }
      })
      setFriendsEvents(eventsWithProfiles)
    } else {
      setFriendsEvents([])
    }
    setLoading(false)
  }, [profile, following])

  return {
    friendsEvents,
    loading,
    fetchFriendsEvents,
    setFriendsEvents,
  }
}