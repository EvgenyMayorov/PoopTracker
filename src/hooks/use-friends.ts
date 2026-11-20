import { useState, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'

export interface Friend {
  id: string
  user_id: string
  username: string
  avatar: string
}

// Хук для работы с друзьями/подписками
export function useFriends(profile: Profile | null) {
  const [followers, setFollowers] = useState<Friend[]>([])
  const [following, setFollowing] = useState<Friend[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFollowers = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('friends')
      .select('id, user_id, follower_id')
      .eq('user_id', profile.id)
    if (data && data.length > 0) {
      const followerIds = data.map(f => f.follower_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', followerIds)
      const followersWithNames = data.map(f => {
        const p = profilesData?.find(p => p.id === f.follower_id)
        return {
          id: f.id,
          user_id: f.follower_id,
          username: p ? getDisplayName(p) : 'Unknown',
          avatar: p?.avatar || '💩',
        }
      })
      setFollowers(followersWithNames)
    } else {
      setFollowers([])
    }
  }, [profile])

  const fetchFollowing = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('friends')
      .select('id, user_id, follower_id')
      .eq('follower_id', profile.id)
    if (data && data.length > 0) {
      const userIds = data.map(f => f.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', userIds)
      const followingWithNames = data.map(f => {
        const p = profilesData?.find(p => p.id === f.user_id)
        return {
          id: f.id,
          user_id: f.user_id,
          username: p ? getDisplayName(p) : 'Unknown',
          avatar: p?.avatar || '💩',
        }
      })
      setFollowing(followingWithNames)
    } else {
      setFollowing([])
    }
  }, [profile])

  const followUser = useCallback(async (targetUserId: string) => {
    if (!profile) return
    await supabase.from('friends').insert({ user_id: targetUserId, follower_id: profile.id })
    fetchFollowing()
    fetchFollowers()
  }, [profile, fetchFollowing, fetchFollowers])

  const unfollowUser = useCallback(async (targetUserId: string) => {
    if (!profile) return
    await supabase.from('friends').delete().eq('user_id', targetUserId).eq('follower_id', profile.id)
    fetchFollowing()
    fetchFollowers()
  }, [profile, fetchFollowing, fetchFollowers])

  const searchUserByEmail = useCallback(async (email: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, avatar')
      .ilike('email', email)
      .limit(1)
    return data?.[0] || null
  }, [])

  const isFollowing = useCallback(
    (userId: string) => following.some(f => f.user_id === userId),
    [following]
  )

  return {
    followers,
    following,
    loading,
    fetchFollowers,
    fetchFollowing,
    followUser,
    unfollowUser,
    searchUserByEmail,
    isFollowing,
    setFollowers,
    setFollowing,
  }
}