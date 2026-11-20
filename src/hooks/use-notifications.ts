import { useState, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'
import { Notification } from './types'

// Хук для работы с уведомлениями (хранит их локально)
export function useNotifications(profile: Profile | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchNotifications = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data && data.length > 0) {
      const friendIds = data.map(n => n.friend_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', friendIds)
      const notificationsWithAvatar = data.map(notif => {
        const p = profilesData?.find(p => p.id === notif.friend_id)
        return { ...notif, avatar: p?.avatar || '💩' }
      })
      setNotifications(notificationsWithAvatar)
    } else {
      setNotifications(data || [])
    }
  }, [profile])

  return {
    notifications,
    fetchNotifications,
  }
}