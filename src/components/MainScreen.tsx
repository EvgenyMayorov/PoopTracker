import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName, isNicknameMissing } from '../lib/displayName'
import { t } from '../i18n'
import { getBristolDescription } from '../lib/bristol'
import { PWAInstallBanner } from './PWAInstallBanner'
import { SuccessAnimation } from './SuccessAnimation'
import { SettingsTab } from './SettingsTab'
import { ConfirmModal } from './ConfirmModal'
import { CommentInput } from './CommentInput'
import { FeedTab as FeedTabView } from './FeedTab'

type Props = {
  profile: Profile
  onLogout: () => void
}

type Tab = 'home' | 'people' | 'feed' | 'settings'
type FeedTab = 'friends' | 'my'

interface Friend {
  id: string
  user_id: string
  username: string
  avatar: string
}

interface Notification {
  id: string
  friend_id: string
  friend_username: string
  avatar: string
  created_at: string
}

export function MainScreen({ profile, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [events, setEvents] = useState<any[]>([])
  const [followers, setFollowers] = useState<Friend[]>([])
  const [following, setFollowing] = useState<Friend[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [feedTab, setFeedTab] = useState<FeedTab>('friends')
  const [friendsEvents, setFriendsEvents] = useState<any[]>([])
  const [showBristolModal, setShowBristolModal] = useState(false)
  const [currentEventId, setCurrentEventId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<number | null>(null)
  const [showPWAGuide, setShowPWAGuide] = useState(false)
  const [profileUsername, setProfileUsername] = useState(profile.username)
  const [avatar, setAvatar] = useState<string>(() =>
    profile?.avatar || localStorage.getItem('poop_avatar') || '💩'
  )
  const [showSuccess, setShowSuccess] = useState(false)
  const [successBristolType, setSuccessBristolType] = useState<number | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [reactions, setReactions] = useState<Record<string, { thumbs_up: number; heart: number; poop: number; userReaction?: string }>>({})
  const [comments, setComments] = useState<Record<string, Array<{ id: string; user_id: string; username: string; avatar: string; text: string; created_at: string }>>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)
  
  // Модальное окно поиска друзей
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [friendEmail, setFriendEmail] = useState('')
  const [friendSearchResult, setFriendSearchResult] = useState<any>(null)
  const [isSearchingFriend, setIsSearchingFriend] = useState(false)

  // Состояния для подтверждения удаления записи
  const [deleteConfirmEventId, setDeleteConfirmEventId] = useState<string | null>(null)
  const [isDeletingEvent, setIsDeletingEvent] = useState(false)

  // Состояния для подтверждения отписки
  const [unfollowConfirmUserId, setUnfollowConfirmUserId] = useState<string | null>(null)
  const [unfollowConfirmUsername, setUnfollowConfirmUsername] = useState<string>('')
  const [isUnfollowing, setIsUnfollowing] = useState(false)

  // Ошибка, отображаемая пользователю
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Состояние подписки на найденного пользователя
  const [friendIsFollowing, setFriendIsFollowing] = useState(false)

  const navigate = useNavigate()

  // Уведомления
  const showNotification = async (title: string, options: NotificationOptions) => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, options)
      } else {
        new Notification(title, options)
      }
    } catch (error: any) {
      console.error('[Notification] Ошибка:', error)
    }
  }

  // Загрузка данных
  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data && !error) {
      setEvents(data)
      data.forEach(event => {
        fetchReactions(event.id)
        fetchComments(event.id)
      })
    }
  }, [profile.id])

  const fetchFollowers = useCallback(async () => {
    const { data } = await supabase
      .from('friends')
      .select('id, user_id, follower_id')
      .eq('user_id', profile.id)
    
    if (data && data.length > 0) {
      const followerIds = data.map(f => f.follower_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', followerIds)
      
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
  }, [profile.id])

  const fetchFollowing = useCallback(async () => {
    const { data } = await supabase
      .from('friends')
      .select('id, user_id, follower_id')
      .eq('follower_id', profile.id)
    
    if (data && data.length > 0) {
      const userIds = data.map(f => f.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', userIds)
      
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
  }, [profile.id])


  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (data && data.length > 0) {
      const friendIds = data.map(n => n.friend_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', friendIds)
      
      const notificationsWithAvatar = data.map(notif => {
        const p = profiles?.find(p => p.id === notif.friend_id)
        return {
          ...notif,
          avatar: p?.avatar || '💩'
        }
      })
      setNotifications(notificationsWithAvatar)
    } else {
      setNotifications(data || [])
    }
  }, [profile.id])

  const fetchFriendsEvents = useCallback(async () => {
    if (following.length === 0) {
      setFriendsEvents([])
      return
    }
    
    const friendIds = following.map(f => f.user_id)
    
    // Получаем события
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (eventsError) {
      console.error('[FetchFriendsEvents] Ошибка получения событий:', eventsError)
      return
    }
    
    if (eventsData && eventsData.length > 0) {
      // Получаем имена пользователей и аватарки для каждого события
      const userIds = [...new Set(eventsData.map(e => e.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', userIds)
      
      // Объединяем данные
      const eventsWithProfiles = eventsData.map(event => {
        const profile = profilesData?.find(p => p.id === event.user_id)
        return {
          ...event,
          profiles: profile ? { id: profile.id, username: profile.username, email: profile.email, avatar: profile.avatar || '💩' } : null
        }
      })
      
      setFriendsEvents(eventsWithProfiles)
      eventsData.forEach(event => {
        fetchReactions(event.id)
        fetchComments(event.id)
      })
    } else {
      setFriendsEvents([])
    }
  }, [following])

  const fetchReactions = async (eventId: string) => {
    const { data } = await supabase
      .from('reactions')
      .select('*')
      .eq('event_id', eventId)
    
    if (data) {
      const reactionCounts = {
        thumbs_up: data.filter(r => r.reaction_type === 'thumbs_up').length,
        heart: data.filter(r => r.reaction_type === 'heart').length,
        poop: data.filter(r => r.reaction_type === 'poop').length,
        userReaction: data.find(r => r.user_id === profile.id)?.reaction_type,
      }
      setReactions(prev => ({ ...prev, [eventId]: reactionCounts }))
    }
  }

  const fetchComments = async (eventId: string) => {
    // Получаем комментарии
    const { data: commentsData, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
    
    if (commentsError) {
      console.error('[FetchComments] Ошибка:', commentsError)
      return
    }
    
    if (commentsData && commentsData.length > 0) {
      // Получаем имена пользователей
      const userIds = [...new Set(commentsData.map(c => c.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, email, avatar')
        .in('id', userIds)
      
      // Объединяем данные
      const commentsWithProfiles = commentsData.map(comment => {
        const profile = profilesData?.find(p => p.id === comment.user_id)
        return {
          id: comment.id,
          user_id: comment.user_id,
          username: profile ? getDisplayName(profile) : '',
          avatar: profile?.avatar || '💩',
          text: comment.comment_text,
          created_at: comment.created_at,
        }
      })
      
      setComments(prev => ({
        ...prev,
        [eventId]: commentsWithProfiles
      }))
    } else {
      setComments(prev => ({
        ...prev,
        [eventId]: []
      }))
    }
  }

  useEffect(() => {
    fetchEvents()
    fetchFollowers()
    fetchFollowing()
    fetchNotifications()
  }, [fetchEvents, fetchFollowers, fetchFollowing, fetchNotifications])

  useEffect(() => {
    fetchFriendsEvents()
  }, [fetchFriendsEvents])

  // Действия
  const handlePoop = async () => {
    const { data, error } = await supabase
      .from('events')
      .insert({ user_id: profile.id })
      .select()
      .single()
    
    if (data) {
      setCurrentEventId(data.id)
      setShowBristolModal(true)
      setSelectedType(null)
    }
    fetchEvents()
  }

  const handleBristolSelect = async (type: number) => {
    if (currentEventId) {
      await supabase
        .from('events')
        .update({ bristol_type: type })
        .eq('id', currentEventId)
      
      fetchEvents()
      fetchFriendsEvents()
    }
    setShowBristolModal(false)
    setCurrentEventId(null)
    setSelectedType(null)
    setEditingEventId(null)
    setSuccessBristolType(type)
    
    if (!editingEventId) {
      setShowSuccess(true)
    }
  }

  const handleBristolSkip = () => {
    setShowBristolModal(false)
    setCurrentEventId(null)
    setSelectedType(null)
    setEditingEventId(null)
  }

  const handleReaction = async (eventId: string, reactionType: 'thumbs_up' | 'heart' | 'poop') => {
    const currentReaction = reactions[eventId]?.userReaction
    
    if (currentReaction === reactionType) {
      await supabase
        .from('reactions')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', profile.id)
    } else {
      if (currentReaction) {
        await supabase
          .from('reactions')
          .update({ reaction_type: reactionType })
          .eq('event_id', eventId)
          .eq('user_id', profile.id)
      } else {
        await supabase
          .from('reactions')
          .insert({
            event_id: eventId,
            user_id: profile.id,
            reaction_type: reactionType,
          })
      }
    }
    
    fetchReactions(eventId)
  }

  const handleAddComment = async (eventId: string) => {
    const text = newComment[eventId]?.trim()
    if (!text) return
    
    await supabase
      .from('comments')
      .insert({
        event_id: eventId,
        user_id: profile.id,
        comment_text: text,
      })
    
    setNewComment(prev => ({ ...prev, [eventId]: '' }))
    fetchComments(eventId)
  }

  const handleDeleteEvent = async (eventId: string) => {
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
        .eq('user_id', profile.id)

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

  const handleEventClick = (eventId: string) => {
    setHighlightedEventId(eventId)
    setActiveTab('feed')
    setFeedTab('my')
  }

  // Поиск друга по email
  const handleSearchFriend = async () => {
    if (!friendEmail.trim()) return

    setIsSearchingFriend(true)
    setFriendSearchResult(null)

    console.log('[SearchFriend] Ищем пользователя с email:', friendEmail)

    // Пробуем RPC функцию
    const { data: rpcData, error: rpcError } = await supabase.rpc('search_users_by_email', {
      search_email: friendEmail.trim(),
      current_user_id: profile.id
    })

    console.log('[SearchFriend] RPC результат:', rpcData)
    console.log('[SearchFriend] RPC ошибка:', rpcError)

    // Если RPC не сработал, пробуем через view
    if (rpcError || !rpcData || rpcData.length === 0) {
      console.log('[SearchFriend] RPC не сработал, пробуем через view...')
      
      const { data: viewData, error: viewError } = await supabase
        .from('user_search')
        .select('id, username, email')
        .ilike('email', `%${friendEmail.trim()}%`)
        .neq('id', profile.id)
        .limit(20)

      console.log('[SearchFriend] View результат:', viewData)
      console.log('[SearchFriend] View ошибка:', viewError)

      setIsSearchingFriend(false)

      if (viewError) {
        console.error('[SearchFriend] Ошибка view:', viewError)
        setFriendSearchResult(null)
        return
      }

      if (viewData && viewData.length > 0) {
        setFriendSearchResult(viewData[0])
      } else {
        setFriendSearchResult(null)
      }
    } else {
      setIsSearchingFriend(false)
      setFriendSearchResult(rpcData[0])
    }
  }

  const handleFollowFriend = async (userId: string, username: string) => {
    // Проверяем, не подписаны ли уже
    const { data: existingSub } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', profile.id)
      .eq('follower_id', userId)
      .single()
    
    if (existingSub) {
      setFriendIsFollowing(true)
      return
    }
    
    // Подписываемся
    const { error: followError } = await supabase.from('friends').insert({
      user_id: profile.id,
      follower_id: userId
    })
    
    if (followError) {
      console.error('[FollowFriend] Ошибка подписки:', followError)
      if (followError.code === '23505') {
        setFriendIsFollowing(true)
      } else {
        setFriendIsFollowing(true)
      }
      return
    }
    
    fetchFollowing()
    setShowAddFriendModal(false)
    setFriendEmail('')
    setFriendSearchResult(null)
    setFriendIsFollowing(true)
    alert(`Вы подписались на ${username}`)
  }

  const handleUnfollowFriend = async (userId: string, username: string) => {
    setUnfollowConfirmUserId(userId)
    setUnfollowConfirmUsername(username)
  }

  const confirmUnfollow = async () => {
    if (!unfollowConfirmUserId) return
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', unfollowConfirmUserId)
        .eq('follower_id', profile.id)
      
      if (error) {
        console.error('[Unfollow] Ошибка:', error)
        setErrorMessage(`Ошибка при отписке: ${error.message || 'Неизвестная ошибка'}`)
      } else {
        fetchFollowing()
        fetchFollowers()
        setUnfollowConfirmUserId(null)
        setUnfollowConfirmUsername('')
        setErrorMessage(null)
      }
    } catch (err: any) {
      console.error('[Unfollow] Исключение:', err)
      setErrorMessage(`Ошибка при отписке: ${err.message || 'Неизвестная ошибка'}`)
    }
  }

  // Статистика
  const todayCount = events.filter(e => 
    new Date(e.created_at).toDateString() === new Date().toDateString()
  ).length
  const weekCount = events.filter(e => 
    new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length

  const weekData = (() => {
    const data = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayStart = new Date(date.setHours(0, 0, 0, 0))
      const dayEnd = new Date(date.setHours(23, 59, 59, 999))
      const count = events.filter(e => {
        const eventDate = new Date(e.created_at)
        return eventDate >= dayStart && eventDate <= dayEnd
      }).length
      data.push({
        day: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
        count,
        isToday: i === 0
      })
    }
    return data
  })()
  const maxCount = Math.max(...weekData.map(d => d.count), 1)

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

  // Рендер вкладок
  const HomeTab = () => (
    <div className="p-4">
      <div className="mb-4">
        <PWAInstallBanner />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className={`rounded-xl p-3 text-center ${
          'bg-white border-2 border-blue-200'
        }`}>
          <div className="text-2xl font-bold text-blue-400">{todayCount}</div>
          <div className={`text-xs ${'text-gray-600'}`}>Сегодня</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${
          'bg-white border-2 border-cyan-200'
        }`}>
          <div className={`text-2xl font-bold ${'text-cyan-600'}`}>{weekCount}</div>
          <div className={`text-xs ${'text-gray-600'}`}>Неделя</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${
          'bg-white border-2 border-sky-200'
        }`}>
          <div className={`text-2xl font-bold ${'text-sky-600'}`}>{events.length}</div>
          <div className={`text-xs ${'text-gray-600'}`}>Всего</div>
        </div>
      </div>

      <div className="flex justify-center my-6">
        <button
          onClick={handlePoop}
          className={`relative w-48 h-48 rounded-full shadow-2xl border-4 transition-all duration-200 hover:scale-105 active:scale-90 group ${
            'bg-gradient-to-br from-blue-400 via-cyan-400 to-sky-400 shadow-blue-500/40 border-blue-300/50'
          }`}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <svg className="w-20 h-20 text-white transition-transform duration-200 group-active:scale-125" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 21h10c1.1 0 2-.9 2-2v-1c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
              <path d="M8 16h8c1.1 0 2-.9 2-2v-1c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
              <path d="M9 11h6c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
              <path d="M11 6c0-1.1.9-2 2-2s2 .9 2 2" />
              <circle cx="10" cy="14" r="0.5" fill="currentColor" />
              <circle cx="14" cy="14" r="0.5" fill="currentColor" />
            </svg>
            <span className="text-sm font-bold mt-2 text-white px-4 text-center leading-tight">
              У МЕНЯ ВЫШЛО!
            </span>
          </div>
        </button>
      </div>

      <div className={`text-center mb-6 p-4 rounded-2xl ${
        'bg-blue-50 border-2 border-blue-200'
      }`}>
        <div className={`text-3xl font-bold ${'text-blue-600'}`}>
          {todayCount}
        </div>
        <div className={`text-sm ${'text-gray-600'}`}>
          💩 Сегодня
        </div>
      </div>

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

      {events.length > 0 && (
        <div className={`mb-6 p-4 rounded-2xl ${
          'bg-white border-2 border-blue-200'
        }`}>
          <h3 className={`text-sm font-semibold mb-3 ${'text-gray-600'}`}>
            📋 Последние записи
          </h3>
          <div className="space-y-2">
            {events.slice(0, 7).map(event => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  'bg-blue-50 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{avatar}</span>
                    <div>
                      <div className={`text-sm font-medium ${'text-gray-800'}`}>
                        {new Date(event.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className={`text-xs ${'text-gray-500'}`}>
                        {new Date(event.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  {event.bristol_type && (
                    <div className={`text-xs px-2 py-1 rounded ${
                      event.bristol_type <= 2 ? 'bg-red-100 text-slate-700' :
                      event.bristol_type <= 4 ? 'bg-green-100 text-slate-700' :
                      'bg-orange-100 text-slate-700'
                    }`}>
                      {getBristolDescription(event.bristol_type)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="mt-6">
          <h3 className={`text-sm font-semibold mb-3 ${'text-gray-600'}`}>
            🔔 Уведомления
          </h3>
          <div className="space-y-2">
            {notifications.slice(0, 5).map(notif => (
              <div key={notif.id} className={`rounded-xl p-3 ${'bg-white border-2 border-cyan-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg shrink-0">
                    {notif.avatar || '💩'}
                  </div>
                  <div>
                    <div className={`text-sm ${'text-gray-800'}`}>
                      💩 У {notif.friend_username} вышло!
                    </div>
                    <div className={`text-xs mt-1 ${'text-gray-500'}`}>
                      {new Date(notif.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const PeopleTab = () => (
    <div className="p-4">
      <button
        onClick={() => setShowAddFriendModal(true)}
        className={`w-full mb-6 py-3 rounded-xl font-semibold transition-all ${
          'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
        }`}
      >
        ➕ Добавить друга
      </button>

      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${'text-gray-600'}`}>
          👥 Подписки ({following.length})
        </h3>
        {following.length === 0 ? (
          <p className="text-gray-500 text-sm">Никого не найдено</p>
        ) : (
          <div className="space-y-2">
            {following.map(friend => (
              <div
                key={friend.id}
                onClick={() => navigate(`/user/${friend.user_id}`)}
                className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer hover:bg-white/5 transition-colors ${
                  'bg-white border-2 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg shrink-0">
                    {friend.avatar || '💩'}
                  </div>
                  <span className={'text-gray-800'}>{friend.username}</span>
                </div>
                <span className="text-xs text-gray-400">→</span>
                <button
                  onClick={async (e: React.MouseEvent) => {
                    e.stopPropagation()
                    await supabase.from('friends').delete().eq('id', friend.id)
                    fetchFollowing()
                  }}
                  className={`px-4 py-1 rounded-lg text-sm font-semibold ${
                    'bg-red-50 border-2 border-red-200 text-red-600'
                  }`}
                >
                  Отписаться
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className={`text-sm font-semibold mb-3 ${'text-gray-600'}`}>
          🌟 Подписчики ({followers.length})
        </h3>
        {followers.length === 0 ? (
          <p className="text-gray-500 text-sm">Никого не найдено</p>
        ) : (
          <div className="space-y-2">
            {followers.map(follower => (
              <div
                key={follower.id}
                onClick={() => navigate(`/user/${follower.user_id}`)}
                className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer hover:bg-white/5 transition-colors ${
                  'bg-white border-2 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg shrink-0">
                    {follower.avatar || '💩'}
                  </div>
                  <span className={'text-gray-800'}>{follower.username}</span>
                </div>
                <span className="text-xs text-gray-400">→</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )



  return (
    <div className={`min-h-screen flex flex-col ${
      'bg-gradient-to-br from-sky-50 via-white to-blue-50'
    }`}>
      {showSuccess && <SuccessAnimation bristolType={successBristolType} onComplete={() => setShowSuccess(false)} />}

      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'feed' && (
          <FeedTabView
            feedTab={feedTab}
            setFeedTab={setFeedTab}
            friendsEvents={friendsEvents}
            events={events}
            profile={profile}
            profileUsername={profileUsername}
            avatar={avatar}
            reactions={reactions}
            comments={comments}
            newComment={newComment}
            setNewComment={setNewComment}
            formatTimeAgo={formatTimeAgo}
            handleReaction={handleReaction}
            handleAddComment={handleAddComment}
            fetchFriendsEvents={fetchFriendsEvents}
            handleDeleteEvent={handleDeleteEvent}
            highlightedEventId={highlightedEventId}
            setEditingEventId={setEditingEventId}
            setShowBristolModal={setShowBristolModal}
            setCurrentEventId={setCurrentEventId}
            navigate={navigate}
          />
        )}
        {activeTab === 'settings' && <SettingsTab profile={profile} onLogout={onLogout} />}
      </div>

      {/* Модальное окно подтверждения удаления записи */}
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

      {/* Модальное окно Бристольской шкалы */}
      {showBristolModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-950 border-2 border-cyan-500/30 rounded-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white text-center mb-1">Какой формы?</h2>
            <p className="text-cyan-400 text-xs text-center mb-4">Шкала Бристольской формы стула</p>

            <div className="space-y-2 mb-3">
              {[1, 2, 3, 4, 5, 6, 7].map(type => (
                <button
                  key={type}
                  onClick={() => handleBristolSelect(type)}
                  className={`w-full p-3 rounded-xl border-2 transition-all active:scale-98 text-left ${
                    type <= 2 ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20' :
                    type === 3 || type === 4 ? 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20' :
                    'border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {type === 1 && '⚫'}{type === 2 && '🟫'}{type === 3 && '🟤'}{type === 4 && '🟢'}
                      {type === 5 && '🟡'}{type === 6 && '🟠'}{type === 7 && '🔵'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-sm">Тип {type}</span>
                        <span className={`text-xs font-semibold ${
                          type <= 2 ? 'text-slate-700' : type === 3 || type === 4 ? 'text-slate-700' : 'text-slate-700'
                        }`}>
                          {type === 1 && 'Запор'}{type === 2 && 'Лёгкий запор'}{type === 3 && 'Норма'}{type === 4 && 'Идеал'}
                          {type === 5 && 'Склонность к диарее'}{type === 6 && 'Диарея'}{type === 7 && 'Сильная диарея'}
                        </span>
                      </div>
                      <div className="text-gray-300 text-xs leading-relaxed">
                        {type === 1 && 'Отдельные твёрдые комочки'}
                        {type === 2 && 'Комковатая и плотная'}
                        {type === 3 && 'Колбаска с трещинами'}
                        {type === 4 && 'Гладкая колбаска'}
                        {type === 5 && 'Мягкие кусочки'}
                        {type === 6 && 'Пушистые кусочки'}
                        {type === 7 && 'Водянистый'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleBristolSkip}
              className="w-full py-2 bg-white/5 border border-white/20 rounded-xl text-gray-400 text-sm font-semibold hover:bg-white/10"
            >
              Пропустить
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно поиска друга */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-3xl p-6 w-full max-w-md ${
            'bg-white border-2 border-blue-200'
          }`}>
            <h2 className={`text-xl font-bold text-center mb-4 ${'text-gray-800'}`}>
              Добавить друга
            </h2>
            <p className={`text-sm text-center mb-4 ${'text-gray-600'}`}>
              Введите email друга для поиска
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={friendEmail}
                onChange={e => setFriendEmail(e.target.value)}
                placeholder="friend@example.com"
                className={`flex-1 px-4 py-3 rounded-xl focus:outline-none focus:border-blue-400 ${
                  'bg-gray-50 border-2 border-gray-200 text-gray-800 placeholder-gray-400'
                }`}
              />
              <button
                onClick={handleSearchFriend}
                disabled={isSearchingFriend || !friendEmail.trim()}
                className="px-6 py-3 bg-blue-500 rounded-xl text-white font-semibold disabled:opacity-50 hover:bg-blue-600 transition-colors"
              >
                {isSearchingFriend ? '...' : 'Искать'}
              </button>
            </div>

            {friendSearchResult && (
              <div className={`rounded-xl p-4 mb-4 ${
                'bg-blue-50 border-2 border-blue-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-2xl shrink-0">
                    {friendSearchResult.avatar || '💩'}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold mb-1 ${'text-gray-800'}`}>
                      {friendSearchResult.username}
                    </div>
                    <div className={`text-xs mb-3 ${'text-gray-500'}`}>
                      {friendSearchResult.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleFollowFriend(friendSearchResult.id, friendSearchResult.username)}
                  className="w-full py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-lg text-white font-semibold"
                >
                  Подписаться
                </button>
              </div>
            )}

            {friendSearchResult === null && friendEmail && !isSearchingFriend && (
              <div className={`text-center py-6 rounded-xl ${
                'bg-gray-50 border-2 border-gray-200'
              }`}>
                <div className="text-4xl mb-2">🔍</div>
                <p className={`text-sm ${'text-gray-600'}`}>
                  Пользователь не найден
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setShowAddFriendModal(false)
                setFriendEmail('')
                setFriendSearchResult(null)
              }}
              className={`w-full mt-4 py-3 rounded-xl font-semibold ${
                'bg-gray-100 text-gray-700'
              }`}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Нижняя навигация */}
      <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 backdrop-blur-xl border-t ${
        'bg-white/95 border-blue-200'
      }`}>
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-1 ${
              activeTab === 'home' ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-semibold">Главная</span>
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-1 ${
              activeTab === 'people' ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[10px] font-semibold">Люди</span>
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-1 ${
              activeTab === 'feed' ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span className="text-[10px] font-semibold">Лента</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-1 ${
              activeTab === 'settings' ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94 1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-semibold">Настройки</span>
          </button>
        </div>
      </div>
    </div>
  )
}