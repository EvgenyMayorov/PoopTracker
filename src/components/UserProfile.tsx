import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'
import { t } from '../i18n'
import { getBristolDescription } from '../lib/bristol'
import { ConfirmModal } from './ConfirmModal'
import { CommentInput } from './CommentInput'
import { UserAvatar } from './UserAvatar'
import { BottomNav } from './BottomNav'

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
  avatar: string
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

  // Состояния для подтверждения отписки
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)
  const [isUnfollowing, setIsUnfollowing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Состояния для подтверждения удаления записи
  const [deleteConfirmEventId, setDeleteConfirmEventId] = useState<string | null>(null)
  const [isDeletingEvent, setIsDeletingEvent] = useState(false)
  const [mainTab, setMainTab] = useState<'home' | 'people' | 'feed' | 'settings'>('home')

  const weekData = useMemo(() => {
    const data: Array<{ day: string; count: number; isToday: boolean }> = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const count = events.filter(e => {
        const eventDate = new Date(e.created_at)
        return eventDate.toDateString() === date.toDateString()
      }).length
      data.push({
        day: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
        count,
        isToday: i === 0,
      })
    }
    return data
  }, [events])

  const maxCount = Math.max(...weekData.map(d => d.count), 1)

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
      const { data: profilesData } = await supabase.from('profiles').select('id, username, email, avatar').in('id', userIds)
      const commentsWithProfiles: Comment[] = commentsData.map(comment => {
        const p = profilesData?.find(p => p.id === comment.user_id)
        return {
          id: comment.id,
          user_id: comment.user_id,
          username: p ? getDisplayName(p) : '',
          avatar: p?.avatar || '💩',
          text: comment.comment_text,
          created_at: comment.created_at,
        }
      })
      setComments(prev => ({ ...prev, [eventId]: commentsWithProfiles }))
    } else {
      setComments(prev => ({ ...prev, [eventId]: [] }))
    }
  }

  const handleToggleFollow = () => {
    if (isOwner || !userId) return
    setShowUnfollowConfirm(true)
  }

  const confirmUnfollow = async () => {
    setIsUnfollowing(true)
    setErrorMessage(null)
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', userId)
        .eq('follower_id', currentUserProfile.id)
      if (error) {
        console.error('[Unfollow] Ошибка:', error)
        setErrorMessage(`Ошибка при отписке: ${error.message || 'Неизвестная ошибка'}`)
        return
      }
      setIsFollowing(false)
      setShowUnfollowConfirm(false)
      fetchFollowers()
      fetchFollowing()
    } catch (err: any) {
      console.error('[Unfollow] Исключение:', err)
      setErrorMessage(`Ошибка при отписке: ${err.message || 'Неизвестная ошибка'}`)
    } finally {
      setIsUnfollowing(false)
    }
  }

  const handleFollow = async () => {
    if (isOwner || !userId) return
    setErrorMessage(null)
    try {
      const { error } = await supabase.from('friends').insert({
        user_id: userId,
        follower_id: currentUserProfile.id,
      })
      if (error) {
        console.error('[Follow] Ошибка:', error)
        if (error.code === '23505') {
          setErrorMessage('Вы уже подписаны на этого пользователя')
        } else {
          setErrorMessage(`Ошибка при подписке: ${error.message || 'Неизвестная ошибка'}`)
        }
      } else {
        setIsFollowing(true)
        fetchFollowers()
        fetchFollowing()
      }
    } catch (err: any) {
      console.error('[Follow] Исключение:', err)
      setErrorMessage(`Ошибка при подписке: ${err.message || 'Неизвестная ошибка'}`)
    }
  }

  const handleDeleteEvent = (eventId: string) => {
    setDeleteConfirmEventId(eventId)
  }

  const confirmDeleteEvent = async () => {
    if (!deleteConfirmEventId) return
    const eventId = deleteConfirmEventId
    setIsDeletingEvent(true)
    setErrorMessage(null)
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', currentUserProfile.id)
      
      if (error) {
        console.error('[DeleteEvent] Ошибка удаления:', error)
        setErrorMessage(`Не удалось удалить запись: ${error.message || 'Неизвестная ошибка'}`)
        return
      }
      
      setEvents(prev => prev.filter(e => e.id !== eventId))
      setComments(prev => Object.fromEntries(
        Object.entries(prev).filter(([eid]) => eid !== eventId)
      ))
      setReactions(prev => Object.fromEntries(
        Object.entries(prev).filter(([eid]) => eid !== eventId)
      ))
      setDeleteConfirmEventId(null)
      
      fetchEvents()
      setErrorMessage(null)
    } catch (err: any) {
      console.error('[DeleteEvent] Исключение при удалении:', err)
      setErrorMessage(`Не удалось удалить запись: ${err.message || 'Неизвестная ошибка'}`)
    } finally {
      setIsDeletingEvent(false)
    }
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

  const handleGoBack = () => {
    const from = sessionStorage.getItem('pooptrack_last_tab')
    if (from === 'people') {
      navigate('/', { state: { fromPeople: true } })
    } else {
      navigate(-1)
    }
  }

  const handleViewUser = (targetUserId: string) => {
    if (targetUserId === currentUserProfile.id) return
    navigate(`/user/${targetUserId}`)
  }

  // Навигация из BottomNav внутри профиля друга: переключаем экран Главной
  // на выбранную вкладку через navigate('/') + location.state.activeTab,
  // который MainScreen.tsx считывает при монтировании.
  const handleBottomNavTabChange = (tab: 'home' | 'people' | 'feed' | 'settings') => {
    setMainTab(tab)
    navigate('/', { state: { activeTab: tab } })
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
          <p className={`text-sm ${'text-gray-600'}`}>Загрузка профиля…</p>
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
          <p className={`font-semibold ${'text-gray-600'}`}>Пользователь не найден</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-container pb-28">
      <header className={`p-4 rounded-2xl mb-4 flex items-center justify-between gap-3 ${
        'bg-white border-2 border-blue-200'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleGoBack} className="text-lg shrink-0">←</button>
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
            <UserAvatar avatar={profile?.avatar || null} className="w-14 h-14 rounded-full overflow-hidden shrink-0" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-extrabold text-slate-900 truncate">{profile.username}</div>
          </div>
        </div>
        {isOwner ? (
          <button
            onClick={onLogout}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700"
          >
            Выйти
          </button>
        ) : (
          <button
            onClick={handleToggleFollow}
            className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold bg-red-50 border-2 border-red-200 text-red-600`}
          >
            {isFollowing ? 'Отписаться' : 'Подписаться'}
          </button>
        )}
      </header>

      {/* Статистика */}
      <div className={`grid grid-cols-3 gap-3 mb-4`}>
        <div className={`p-3 rounded-xl text-center ${
          'bg-white border-2 border-blue-200'
        }}`}>
          <div className={`text-2xl font-bold ${'text-gray-800'}`}>
            {events.length}
          </div>
          <div className={`text-xs ${'text-gray-600'}`}>Записей</div>
        </div>
        <div className={`p-3 rounded-xl text-center ${
          'bg-white border-2 border-green-200'
        }}`}>
          <div className={`text-2xl font-bold ${'text-gray-800'}`}>
            {following.length}
          </div>
          <div className={`text-xs ${'text-gray-600'}`}>Подписок</div>
        </div>
        <div className={`p-3 rounded-xl text-center ${
          'bg-white border-2 border-purple-200'
        }}`}>
          <div className={`text-2xl font-bold ${'text-gray-800'}`}>
            {followers.length}
          </div>
          <div className={`text-xs ${'text-gray-600'}`}>Подписчиков</div>
        </div>
      </div>

      {/* Вкладки: Активность, Подписки, Подписчики */}
      <div className={`flex bg-white/5 rounded-xl p-1 mb-4 ${
        'border border-gray-200'
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
          {events.length > 0 && (
            <div className={`mb-6 p-4 rounded-2xl ${
              'bg-white border-2 border-gray-200'
            }`}>
              <h3 className={`text-sm font-semibold mb-4 ${'text-gray-600'}`}>
                📊 За последние 7 дней
              </h3>
              <div className="flex items-end justify-between gap-2 h-32">
                {weekData.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col justify-end h-20">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          day.isToday
                            ? 'bg-gradient-to-t from-cyan-500 to-fuchsia-500'
                            : 'bg-gradient-to-t from-blue-300 to-blue-400'
                        }`}
                        style={{ height: `${day.count > 0 ? Math.max((day.count / maxCount) * 100, 10) : 5}%` }}
                      />
                    </div>
                    <div className={`text-xs font-medium ${
                      day.isToday
                        ? 'text-cyan-600'
                        : 'text-gray-600'
                    }`}>
                      {day.day}
                    </div>
                    <div className={`text-xs ${
                      day.count > 0
                        ? 'text-gray-800'
                        : 'text-gray-400'
                    }`}>
                      {day.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {events.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">💩</div>
              <p className={`font-semibold ${'text-gray-600'}`}>
                {isOwner ? 'Вы ещё не нажимали кнопку 💩' : 'У этого пользователя пока нет записей'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div
                  key={event.id}
                  className={`rounded-xl p-4 transition-all ${
                    'bg-white border-2 border-cyan-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-100 text-xs flex items-center justify-center shrink-0">
                      <UserAvatar avatar={profile.avatar || null} className="w-11 h-11 rounded-full overflow-hidden shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold ${'text-gray-800'}`}>
                        {profile.username}
                      </div>
                      <div className={`text-sm ${'text-gray-800'}`}>
                        {isOwner ? 'У МЕНЯ ВЫШЛО!' : `У ${profile.username} вышло!`}
                      </div>
                      {event.bristol_type && (
                        <div className={`text-xs mt-1 leading-snug break-words ${
                          event.bristol_type <= 2 ? 'text-slate-700' :
                          event.bristol_type === 3 || event.bristol_type === 4 ? 'text-slate-700' :
                          'text-slate-700'
                        }`}>
                          {getBristolDescription(event.bristol_type)}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs shrink-0 ${'text-gray-500'}`}>
                      {formatTimeAgo(event.created_at)}
                    </div>
                  </div>

                  <div className={`flex gap-2 mt-3 pt-3 border-t ${'border-gray-200'}`}>
                    <button
                      onClick={() => handleReaction(event.id, 'thumbs_up')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
                        reactions[event.id]?.userReaction === 'thumbs_up'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      👍 {reactions[event.id]?.thumbs_up || 0}
                    </button>
                    <button
                      onClick={() => handleReaction(event.id, 'heart')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
                        reactions[event.id]?.userReaction === 'heart'
                          ? 'bg-red-500/20 text-slate-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      ❤️ {reactions[event.id]?.heart || 0}
                    </button>
                    <button
                      onClick={() => handleReaction(event.id, 'poop')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${
                        reactions[event.id]?.userReaction === 'poop'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-gray-100 text-gray-600'
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
                          className={`rounded-lg p-2 ${'bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-xs flex items-center justify-center shrink-0">
                              <UserAvatar avatar={comment.avatar || null} className="w-7 h-7 rounded-full overflow-hidden shrink-0" />
                            </div>
                            <span className="text-xs font-semibold text-cyan-400">{comment.username}</span>
                            <span className={`text-xs ${'text-gray-500'}`}>
                              {formatTimeAgo(comment.created_at)}
                            </span>
                          </div>
                          <p className={`text-sm mt-1 ${'text-gray-700'}`}>{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <CommentInput
                    eventId={event.id}
                    value={newComment[event.id] || ''}
                    onChange={(value) =>
                      setNewComment(prev => ({ ...prev, [event.id]: value }))
                    }
                    onSubmit={handleAddComment}
                  />

                  {isOwner && (
                    <button
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation()
                        handleDeleteEvent(event.id)
                      }}
                      className={`w-full mt-2 px-3 py-2 rounded-lg text-sm font-semibold ${
                        'bg-red-50 border-2 border-red-200 text-red-600'
                      }`}
                    >
                      🗑️ Удалить запись
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'following' && (
        <div>
          {following.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 text-center">
              <div className="text-2xl mb-2">👀</div>
              <p className="text-sm font-semibold text-slate-900">
                {isOwner ? 'Вы ни на кого не подписаны' : 'Этот пользователь ни на кого не подписан'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {following.map(f => (
                <div
                  key={f.id}
                  onClick={() => handleViewUser(f.user_id)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="w-[52px] h-[52px] rounded-full overflow-hidden shrink-0">
                    <UserAvatar avatar={f.avatar || null} className="w-[52px] h-[52px] rounded-full overflow-hidden" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{f.username}</div>
                  </div>
                  <span className="text-xs text-slate-400">→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'followers' && (
        <div>
          {followers.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 text-center">
              <div className="text-2xl mb-2">💩</div>
              <p className="text-sm font-semibold text-slate-900">
                {isOwner ? 'У вас пока нет подписчиков' : 'У этого пользователя пока нет подписчиков'}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {followers.map(f => (
                <div
                  key={f.id}
                  onClick={() => handleViewUser(f.user_id)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="w-[52px] h-[52px] rounded-full overflow-hidden shrink-0">
                    <UserAvatar avatar={f.avatar || null} className="w-[52px] h-[52px] rounded-full overflow-hidden" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{f.username}</div>
                  </div>
                  <span className="text-xs text-slate-400">→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
            {/* Confirm Modal for Delete Event */}
        <ConfirmModal
          isOpen={!!deleteConfirmEventId}
          title="Удаление записи"
          message="Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить."
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={confirmDeleteEvent}
          onCancel={() => setDeleteConfirmEventId(null)}
          confirmClassName="bg-red-500 hover:bg-red-600 text-white"
        />

        {/* Error Message Toast */}
        {errorMessage && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 sm:px-6">
            <div className="bg-red-600/95 border border-red-500/50 rounded-xl p-4 shadow-2xl max-w-md animate-slide-up">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="text-white font-medium">{errorMessage}</p>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-white/70 hover:text-white flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
        <BottomNav activeTab={mainTab} setActiveTab={handleBottomNavTabChange} onPoop={() => {}} />
      </div>
  )
}
