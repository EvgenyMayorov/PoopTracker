import { useState, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'
import { Friend } from './types'

// Хук для работы с профилем
export function useProfile(profile: Profile | null, onLogout: () => void) {
  const [profileUsername, setProfileUsername] = useState(profile?.username || '')
  const [avatar, setAvatar] = useState<string>(() =>
    profile?.avatar || localStorage.getItem('poop_avatar') || '💩'
  )
  const [usernameError, setUsernameError] = useState<string | null>(null)

  const updateProfile = useCallback(async (username: string, avatarEmoji: string) => {
    if (!profile) return false

    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      setUsernameError('Введите никнейм')
      return false
    }

    // Проверка уникальности никнейма
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmedUsername)
      .limit(1)

    if (existingProfiles && existingProfiles.length > 0 && existingProfiles[0].id !== profile.id) {
      setUsernameError('Этот никнейм уже занят')
      return false
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmedUsername, avatar: avatarEmoji, updated_at: new Date().toISOString() })
      .eq('id', profile.id)

    if (error) {
      console.error('[Profile] Ошибка обновления:', error)
      setUsernameError('Не удалось обновить профиль')
      return false
    }

    setProfileUsername(trimmedUsername)
    setAvatar(avatarEmoji)
    localStorage.setItem('poop_avatar', avatarEmoji)
    setUsernameError(null)
    return true
  }, [profile])

  return {
    profileUsername,
    setProfileUsername,
    avatar,
    setAvatar,
    usernameError,
    setUsernameError,
    updateProfile,
  }
}

// Хук для работы с уведомлениями
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