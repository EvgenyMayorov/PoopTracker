import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'

type Props = {
  currentUserProfile: Profile
  onLogout: () => void
}

interface Friend {
  id: string
  user_id: string
  username: string
  avatar: string
}

interface ReactionCounts {
  thumbs_up: number
  heart: number
  poop: number
  userReaction?: string
}

interface Comment {
  id: string
  user_id: string
  username: string
  text: string
  created_at: string
}

export function UserProfile({ currentUserProfile, onLogout }: Props) {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [followers, setFollowers] = useState<Friend[]>([])
  const [following, setFollowing] = useState<Friend[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [reactions, setReactions] = useState<Record<string, ReactionCounts>>({})
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'activity' | 'following' | 'followers'>('activity')
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () =>
      (localStorage.getItem('poop_theme') as 'light' | 'dark') || 'dark'
  )

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (data) {
      setProfile(data)
      setIsOwner(data.id === currentUserProfile.id)
    }
    if (error) console.error('[UserProfile] Ошибка профиля:', error)
  }, [userId, currentUserProfile.id])

  const fetchEvents = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('events').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    if (data) {
      setEvents(data)
      data.forEach(event => {
        fetchReactions(event.id)
        fetchComments(event.id)
      })
    }
  }, [userId])

  const fetchFollowers = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('friends').select('id, user_id, follower_id').eq('user_id', userId)
    if (data && data.length > 0) {
      const followerIds = data.map(f => f.follower_id)
      const { data: profiles } = await supabase.from('profiles').select('id, username, email, avatar').in('id', followerIds)
      if (profiles) {
        setFollowers(data.map(f => {
          const p = profiles.find(p => p.id === f.follower_id)
          return {
            id: f.id,
            user_id: f.follower_id,
            username: p ? getDisplayName(p) : '',
            avatar: p?.avatar || '💩'
          }
        }))
      }
    } else {
      setFollowers([])
    }
  }, [userId])

  const fetchFollowing = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('friends').select('id, user_id, follower_id').eq('follower_id', userId)
    if (data && data.length > 0) {
      const userIds = data.map(f => f.user_id)
      const { data: profiles } = await supabase.from('profiles').select('id, username, email, avatar').in('id', userIds)
      if (profiles) {
        setFollowing(data.map(f => {
          const p = profiles.find(p => p.id === f.user_id)
          return {
            id: f.id,
            user_id: f.user_id,
            username: p ? getDisplayName(p) : '',
            avatar: p?.avatar || '💩'
          }
        }))
      }
    } else {
      setFollowing([])
    }
  }, [userId])

  const checkIsFollowing = useCallback(async () => {
    if (!userId || isOwner) return
    const { data } = await supabase.from('friends').select('*').eq('user_id', userId).eq('follower_id', currentUserProfile.id).maybeSingle()
    setIsFollowing(!!data)
  }, [userId, currentUserProfile.id, isOwner])

  const fetchReactions = async (eventId: string) => {
    const { data } = await supabase.from('reactions').select('*').eq('event_id', eventId)
    if (data) {
      setReactions(prev => ({
        ...prev,
        [eventId]: {
          thumbs_up: data.filter(r => r.reaction_type === 'thumbs_up').length,
          heart: data.filter(r => r.reaction_type === 'heart').length,
          poop: data.filter(r => r.reaction_type === 'poop').length,
          userReaction: data.find(r => r.user_id === currentUserProfile.id)?.reaction_type,
        }
      }))
    }
  }

  const fetchComments = async (eventId: string) => {
    const { data: commentsData, error: commentsError } = await supabase.from('comments').select('*').eq('event_id', eventId).order('created_at', { ascending: true })
    if (commentsError) {
      console.error('[UserProfile] Ошибка комментариев:', commentsError)
      return
    }
    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))]
      const { data: profilesData } = await supabase.from('profiles').select('id, username, email').in('id', userIds)
      const commentsWithProfiles: Comment[] = commentsData.map(comment => {
        const p = profilesData?.find(p => p.id === comment.user_id)
        return {
          id: comment.id,
          user_id: comment.user_id,
          username: p ? getDisplayName(p) : '',
          text: comment.comment_text,
          created_at: comment.created_at,
        }
      })
      setComments(prev => ({ ...prev, [eventId]: commentsWithProfiles }))
    } else {
      setComments(prev => ({ ...prev, [eventId]: [] }))
    }
  }

  const handleToggleFollow = async () => {
    if (isOwner || !userId) return
    if (isFollowing) {
      await supabase.from('friends').delete().eq('user_id', userId).eq('follower_id', currentUserProfile.id)
      setIsFollowing(false)
    } else {
      await supabase.from('friends').insert({
        user_id: userId,
        follower_id: currentUserProfile.id,
      })
      setIsFollowing(true)
    }
    fetchFollowers()
    fetchFollowing()
  }

  const handleReaction = async (eventId: string, reactionType: 'thumbs_up' | 'heart' | 'poop') => {
    const currentReaction = reactions[eventId]?.userReaction
    if (currentReaction === reactionType) {
      await supabase.from('reactions').delete().eq('event_id', eventId).eq('user_id', currentUserProfile.id)
    } else {
      if (currentReaction) {
        await supabase.from('reactions').update({ reaction_type: reactionType }).eq('event_id', eventId).eq('user_id', currentUserProfile.id)
      } else {
        await supabase.from('reactions').insert({
          event_id: eventId,
          user_id: currentUserProfile.id,
          reaction_type: reactionType,
        })
      }
    }
    fetchReactions(eventId)
  }

  const handleAddComment = async (eventId: string) => {
    const text = newComment[eventId]?.trim()
    if (!text) return
    await supabase.from('comments').insert({
      event_id: eventId,
      user_id: currentUserProfile.id,
      comment_text: text,
    })
    setNewComment(prev => ({ ...prev, [eventId]: '' }))
    fetchComments(eventId)
  }

  const handleGoBack = () => navigate(-1)

  const handleViewUser = (targetUserId: string) => {
    if (targetUserId === currentUserProfile.id) return
    navigate(`/user/${targetUserId}`)
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMin < 1) return 'только что'
    if (diffMin < 60) return `${diffMin} мин назад`
    if (diffHours < 24) return `${diffHours} ч назад`
    return `${diffDays} д назад`
  }

  useEffect(() => {
    fetchProfile()
    fetchEvents()
    fetchFollowers()
    fetchFollowing()
    checkIsFollowing()
    setLoading(false)
  }, [fetchProfile, fetchEvents, fetchFollowers, fetchFollowing, checkIsFollowing])

  if (loading) {
    return (
      <div className="mobile-container flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Загрузка профиля…</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mobile-container p-4">
        <button onClick={handleGoBack} className="mb-4 text-sm">← Назад</button>
        <div className="text-center py-12">
          <div className="text-5xl mb-3">❓</div>
          <p className={`font-semibold ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Пользователь не найден</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-container">
      <header className={`p-4 rounded-2xl mb-4 flex items-center justify-between ${
        theme === 'light' ? 'bg-white border-2 border-blue-200' : 'bg-white/5 border border-white/10'
      }`}>
        <button onClick={handleGoBack} className="text-lg">←</button>
        <div className="flex-1 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-fuchsia-500 rounded-full flex items-center justify-center text-lg">💩</div>
          <div className={`text-xl font-bold ${theme === 'light' ? 'text-gray-800' : 'text-cyan-400'}`}>
            {profile.username}
          </div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            {isOwner ? 'Ваш профиль' : profile.id.substring(0, 8) + '...'}
          </div>
          {!isOwner && (
            <button
              onClick={handleToggleFollow}
              className={`mt-3 px-4 py-1.5 rounded-lg text-sm font-semibold ${
                theme === 'light' ? 'bg-red-50 border-2 border-red-200 text-red-600' : 'bg-red-500/20 border border-red-500/30 text-red-400'
              }`}
            >
              {isFollowing ? 'Отписаться' : 'Подписаться'}
            </button>
          )}
          {isOwner && (
            <button
              onClick={onLogout}
              className={`mt-3 px-4 py-1.5 rounded-lg text-sm font-semibold ${
                theme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-white/5 text-gray-300'
              }`}
            >
              Выйти
            </button>
          )}
        </div>
        <div className="w-10" />
      </header>

      {/* Статистика */}
      <div className={`grid grid-cols-3 gap-3 mb-4`}>
        <div className={`p-3 rounded-xl text-center ${
          theme === 'light' ? 'bg-white border-2 border-blue-200' : 'bg-white/5 border border-blue-500/20'
        }}`}>
          <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-800' : 'text-blue-600'}`}>
            {events.length}
          </div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Записей</div>
        </div>
        <div className={`p-3 rounded-xl text-center ${
          theme === 'light' ? 'bg-white border-2 border-green-200' : 'bg-white/5 border border-green-500/20'
        }}`}>
          <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-800' : 'text-green-400'}`}>
            {following.length}
          </div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Подписок</div>
        </div>
        <div className={`p-3 rounded-xl text-center ${
          theme === 'light' ? 'bg-white border-2 border-purple-200' : 'bg-white/5 border border-purple-500/20'
        }}`}>
          <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-800' : 'text-purple-400'}`}>
            {followers.length}
          </div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Подписчиков</div>
        </div>
      </div>

      {/* Вкладки: Активность, Подписки, Подписчики */}
      <div className={`flex bg-white/5 rounded-xl p-1 mb-4 ${
        theme === 'light' ? 'border border-gray-200' : 'border border-white/10'
      }`}>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'activity' ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white' : 'text-gray-600'
          }`}
        >
          📰 Активность
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'following' ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white' : 'text-gray-600'
          }`}
        >
          👥 Подписки ({following.length})
        </button>
        <button
          onClick={() => setActiveTab('followers')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'followers' ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white' : 'text-gray-600'
          }`}
        >
          🌟 Подписчики ({followers.length})
        </button>
      </div>

      {activeTab === 'activity' && (
        <div>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">💩</div>
              <p className={`font-semibold ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                {isOwner ? 'Вы ещё не нажимали кнопку 💩' : 'У этого пользователя пока нет записей'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div
                  key={event.id}
                  className={`rounded-xl p-4 transition-all ${
                    theme === 'light'
                      ? 'bg-white border-2 border-cyan-200'
                      : 'bg-white/5 border border-cyan-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg">
                      {profile.avatar || '💩'}
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                        {profile.username}
                      </div>
                      <div className={`text-sm ${theme === 'light' ? 'text-gray-800' : 'text-cyan-400'}`}>
                        {isOwner ? 'У МЕНЯ ВЫШЛО!' : `У ${profile.username} вышло!`}
                      </div>
                      {event.bristol_type && (
                        <div className={`text-xs mt-1 ${
                          event.bristol_type <= 2 ? 'text-red-400' :
                          event.bristol_type === 3 || event.bristol_type === 4 ? 'text-green-400' :
                          'text-orange-400'
                        }`}>
                          Тип {event.bristol_type}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {formatTimeAgo(event.created_at)}
                    </div>
                  </div>

                  <div className={`flex gap-2 mt-3 pt-3 border-t ${theme === 'light' ? 'border-gray-200' : 'border-white/10'}`}>
                    <button
                      onClick={() => handleReaction(event.id, 'thumbs_up')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
                        reactions[event.id]?.userReaction === 'thumbs_up'
                          ? 'bg-blue-500/20 text-blue-400'
                          : theme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      👍 {reactions[event.id]?.thumbs_up || 0}
                    </button>
                    <button
                      onClick={() => handleReaction(event.id, 'heart')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
                        reactions[event.id]?.userReaction === 'heart'
                          ? 'bg-red-500/20 text-red-400'
                          : theme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      ❤️ {reactions[event.id]?.heart || 0}
                    </button>
                    <button
                      onClick={() => handleReaction(event.id, 'poop')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
                        reactions[event.id]?.userReaction === 'poop'
                          ? 'bg-amber-500/20 text-amber-400'
                          : theme === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      💩 {reactions[event.id]?.poop || 0}
                    </button>
                  </div>

                  {comments[event.id] && comments[event.id].length > 0 && (
                    <div className="mt-3 space-y-2">
                      {comments[event.id].map(comment => (
                        <div
                          key={comment.id}
                          className={`rounded-lg p-2 ${theme === 'light' ? 'bg-gray-50' : 'bg-white/5'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-cyan-400">{comment.username}</span>
                            <span className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                              {formatTimeAgo(comment.created_at)}
                            </span>
                          </div>
                          <p className={`text-sm mt-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={newComment[event.id] || ''}
                      onChange={e => setNewComment(prev => ({ ...prev, [event.id]: e.target.value }))}
                      placeholder="Добавить комментарий..."
                      className={`flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 ${
                        theme === 'light'
                          ? 'bg-white border-2 border-gray-200 text-gray-800 placeholder-gray-400'
                          : 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                      }`}
                    />
                    <button
                      onClick={() => handleAddComment(event.id)}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-lg text-white text-sm font-semibold"
                    >
                      Отправить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'following' && (
        <div>
          {following.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">👀</div>
              <p className={`font-semibold ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                {isOwner ? 'Вы ни на кого не подписаны' : 'Этот пользователь ни на кого не подписан'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {following.map(f => (
                <div
                  key={f.id}
                  onClick={() => handleViewUser(f.user_id)}
                  className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer hover:bg-white/5 transition-colors ${
                    theme === 'light' ? 'bg-white border-2 border-blue-200' : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg">
                    {f.avatar}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                      {f.username}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'followers' && (
        <div>
          {followers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">💩</div>
              <p className={`font-semibold ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                {isOwner ? 'У вас пока нет подписчиков' : 'У этого пользователя пока нет подписчиков'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {followers.map(f => (
                <div
                  key={f.id}
                  onClick={() => handleViewUser(f.user_id)}
                  className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer hover:bg-white/5 transition-colors ${
                    theme === 'light' ? 'bg-white border-2 border-blue-200' : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg">
                    {f.avatar}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                      {f.username}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
