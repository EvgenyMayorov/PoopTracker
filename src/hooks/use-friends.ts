import { useState, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'

export interface Friend {
  id: string
  user_id: string
  follower_id?: string
  username: string
  avatar: string
  status: 'pending' | 'accepted'
}

// Хук для работы с друзьями/подписками
export function useFriends(profile: Profile | null) {
  const [followers, setFollowers] = useState<Friend[]>([])
  const [following, setFollowing] = useState<Friend[]>([])
  const [blockedUsers, setBlockedUsers] = useState<Friend[]>([])
  const [loading, setLoading] = useState(false)

  const mapFriendRows = (rows: any[], profilesData: any[]): Friend[] =>
    rows.map(f => {
      const p = profilesData.find((p: any) => p.id === f.user_id)
      return {
        id: f.id,
        user_id: f.user_id,
        follower_id: f.follower_id,
        username: p ? getDisplayName(p) : 'Unknown',
        avatar: p?.avatar || '💩',
        status: f.status || 'accepted',
      }
    })

  const fetchFollowers = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('friends')
      .select('id, user_id, follower_id, status')
      .eq('user_id', profile.id)
    if (data && data.length > 0) {
      const followerIds = data.map(f => f.follower_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', followerIds)
      setFollowers(mapFriendRows(data, profilesData || []))
    } else {
      setFollowers([])
    }
  }, [profile])

  const fetchFollowing = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('friends')
      .select('id, user_id, follower_id, status')
      .eq('follower_id', profile.id)
    if (data && data.length > 0) {
      const userIds = data.map(f => f.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', userIds)
      setFollowing(mapFriendRows(data, profilesData || []))
    } else {
      setFollowing([])
    }
  }, [profile])

  // Служебная отправка уведомления + push другой стороне
  const sendFollowNotification = useCallback(
    async (targetUserId: string, body: string, type: 'follow_request' | 'follow_accepted') => {
      if (!profile) return
      const senderName = getDisplayName(profile) || 'Друг'
      try {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          friend_id: profile.id,
          friend_username: senderName,
          notification_type: type,
        })
      } catch (err) {
        console.warn('[Friends] Не удалось создать уведомление:', err)
      }
      try {
        await supabase.functions.invoke('send-push', {
          body: { userId: targetUserId, title: 'PoopTrack', body },
        })
      } catch (err) {
        console.warn('[Friends] Не удалось отправить push:', err)
      }
    },
    [profile]
  )

  const followUser = useCallback(
    async (targetUserId: string) => {
      if (!profile) return
      // Блокировка: нельзя подписаться на того, кто тебя заблокировал (или кого ты сам заблокировал)
      const { data: blocked } = await supabase
        .from('blocked_users')
        .select('id')
        .or(`and(blocker_id.eq.${targetUserId},blocked_id.eq.${profile.id}),and(blocker_id.eq.${profile.id},blocked_id.eq.${targetUserId})`)
        .maybeSingle()
      if (blocked) {
        throw new Error('Не удалось подписаться: пользователь заблокирован')
      }
      const { error } = await supabase.from('friends').insert({
        user_id: targetUserId,
        follower_id: profile.id,
        status: 'pending',
      })
      if (error) {
        console.error('[Friends] Ошибка при подписке:', error)
        throw error
      }
      fetchFollowing()
      fetchFollowers()
      await sendFollowNotification(targetUserId, `${getDisplayName(profile) || 'Друг'} хочет подписаться на вас`, 'follow_request')
    },
    [profile, fetchFollowing, fetchFollowers, sendFollowNotification]
  )

  // Отмена собственной неподтверждённой заявки
  const cancelRequest = useCallback(async (targetUserId: string) => {
    if (!profile) return
    const { error } = await supabase.from('friends').delete().eq('user_id', targetUserId).eq('follower_id', profile.id)
    if (error) {
      console.error('[Friends] Ошибка при отмене заявки:', error)
      throw error
    }
    fetchFollowing()
    fetchFollowers()
  }, [profile, fetchFollowing, fetchFollowers])

  // Принять входящую заявку (владелец профиля принимает подписку от followerUserId)
  const acceptFollower = useCallback(
    async (followerUserId: string) => {
      if (!profile) return
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', profile.id)
        .eq('follower_id', followerUserId)
      if (error) {
        console.error('[Friends] Ошибка при принятии заявки:', error)
        throw error
      }
      fetchFollowing()
      fetchFollowers()
      await sendFollowNotification(followerUserId, `${getDisplayName(profile) || 'Вы'} принял(а) вашу заявку на подписку`, 'follow_accepted')
    },
    [profile, fetchFollowing, fetchFollowers, sendFollowNotification]
  )

  // Отклонить входящую заявку (удаляет запись)
  const rejectFollower = useCallback(async (followerUserId: string) => {
    if (!profile) return
    const { error } = await supabase.from('friends').delete().eq('user_id', profile.id).eq('follower_id', followerUserId)
    if (error) {
      console.error('[Friends] Ошибка при отклонении заявки:', error)
      throw error
    }
    fetchFollowing()
    fetchFollowers()
  }, [profile, fetchFollowing, fetchFollowers])

  // Удалить подтверждённого подписчика
  const removeFollower = useCallback(async (followerUserId: string) => {
    if (!profile) return
    const { error } = await supabase.from('friends').delete().eq('user_id', profile.id).eq('follower_id', followerUserId)
    if (error) {
      console.error('[Friends] Ошибка при удалении подписчика:', error)
      throw error
    }
    fetchFollowing()
    fetchFollowers()
  }, [profile, fetchFollowing, fetchFollowers])

  // Заблокировать пользователя: убрать все взаимные связи и добавить в чёрный список
  const blockUser = useCallback(
    async (targetUserId: string) => {
      if (!profile) return
      const { error: blockError } = await supabase.from('blocked_users').insert({
        blocker_id: profile.id,
        blocked_id: targetUserId,
      })
      if (blockError) {
        console.error('[Friends] Ошибка при блокировке:', blockError)
        throw blockError
      }
      // Удаляем любые взаимные связи (и как подписчик, и как автор)
      await supabase.from('friends').delete().or(
        `and(user_id.eq.${profile.id},follower_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},follower_id.eq.${profile.id})`
      )
      fetchFollowing()
      fetchFollowers()
    },
    [profile, fetchFollowing, fetchFollowers]
  )

  // Разблокировать пользователя
  const unblockUser = useCallback(
    async (targetUserId: string) => {
      if (!profile) return
      const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', profile.id).eq('blocked_id', targetUserId)
      if (error) {
        console.error('[Friends] Ошибка при разблокировке:', error)
        throw error
      }
    },
    [profile]
  )

  // Список заблокированных пользователей
  const fetchBlockedUsers = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', profile.id)
    if (data && data.length > 0) {
      const blockedIds = data.map(d => d.blocked_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', blockedIds)
      setBlockedUsers(
        profilesData
          ? profilesData.map(p => ({
              id: p.id,
              user_id: p.id,
              username: getDisplayName(p),
              avatar: p.avatar || '💩',
              status: 'accepted' as const,
            }))
          : []
      )
    } else {
      setBlockedUsers([])
    }
  }, [profile])

  const unfollowUser = useCallback(async (targetUserId: string) => {
    if (!profile) return
    const { error } = await supabase.from('friends').delete().eq('user_id', targetUserId).eq('follower_id', profile.id)
    if (error) {
      console.error('[Friends] Ошибка при отписке:', error)
      throw error
    }
    fetchFollowing()
    fetchFollowers()
  }, [profile, fetchFollowing, fetchFollowers])

  const searchUserByEmail = useCallback(async (email: string) => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return null

    let query = supabase
      .from('profiles')
      .select('id, username, email, avatar')
      .ilike('email', trimmedEmail)

    // Исключаем самого текущего пользователя из результатов поиска
    if (profile?.id) {
      query = query.neq('id', profile.id)
    }

    const { data, error } = await query.limit(1)
    if (error) {
      console.error('[Friends] Ошибка поиска по email:', error)
      return null
    }
    return data?.[0] || null
  }, [profile])

  const isFollowing = useCallback(
    (userId: string) => following.some(f => f.user_id === userId && f.status === 'accepted'),
    [following]
  )

  const isPendingRequest = useCallback(
    (userId: string) => following.some(f => f.user_id === userId && f.status === 'pending'),
    [following]
  )

  const isBlocked = useCallback(
    (userId: string) => blockedUsers.some(f => f.user_id === userId),
    [blockedUsers]
  )

  return {
    followers,
    following,
    blockedUsers,
    loading,
    fetchFollowers,
    fetchFollowing,
    fetchBlockedUsers,
    followUser,
    unfollowUser,
    cancelRequest,
    acceptFollower,
    rejectFollower,
    removeFollower,
    blockUser,
    unblockUser,
    searchUserByEmail,
    isFollowing,
    isPendingRequest,
    isBlocked,
    setFollowers,
    setFollowing,
  }

  }