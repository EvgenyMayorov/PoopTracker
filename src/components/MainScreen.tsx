import { useState, useEffect, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { PWAInstallBanner } from './PWAInstallBanner'
import { SuccessAnimation } from './SuccessAnimation'

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
  avatar?: string
}

interface Notification {
  id: string
  friend_id: string
  friend_username: string
  created_at: string
}

export function MainScreen({ profile, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [events, setEvents] = useState<any[]>([])
  const [followers, setFollowers] = useState<Friend[]>([])
  const [following, setFollowing] = useState<Friend[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [editingUsername, setEditingUsername] = useState(false)
  const [tempUsername, setTempUsername] = useState(profile.username)
  const [feedTab, setFeedTab] = useState<FeedTab>('friends')
  const [friendsEvents, setFriendsEvents] = useState<any[]>([])
  const [showBristolModal, setShowBristolModal] = useState(false)
  const [currentEventId, setCurrentEventId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<number | null>(null)
  const [showPWAGuide, setShowPWAGuide] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 
    (localStorage.getItem('poop_theme') as 'light' | 'dark') || 'dark'
  )
  const [showSuccess, setShowSuccess] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [reactions, setReactions] = useState<Record<string, { thumbs_up: number; heart: number; poop: number; userReaction?: string }>>({})
  const [comments, setComments] = useState<Record<string, Array<{ id: string; user_id: string; username: string; text: string; created_at: string }>>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [avatar, setAvatar] = useState<string>(() => 
    localStorage.getItem('poop_avatar') || '💩'
  )
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)
  
  // Модальное окно поиска друзей
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [friendEmail, setFriendEmail] = useState('')
  const [friendSearchResult, setFriendSearchResult] = useState<any>(null)
  const [isSearchingFriend, setIsSearchingFriend] = useState(false)
  
  const avatarEmojis = ['💩', '🎉', '🔥', '⭐', '🌟', '✨', '💎', '🎨', '🎯', '🚀', '🌈', '🦄', '🐱', '🐶', '🦊', '🐼', '🐨', '🦁', '🐸', '🐵']

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
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) {
      setEvents(data)
      data.forEach(event => {
        fetchReactions(event.id)
        fetchComments(event.id)
      })
    }
  }, [])

  const fetchFollowers = useCallback(async () => {
    const { data } = await supabase
      .from('friends')
      .select('id, user_id, follower_id')
      .eq('follower_id', profile.id)
    
    if (data && data.length > 0) {
      const userIds = data.map(f => f.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds)
      
      if (profiles) {
        setFollowers(data.map(f => {
          const p = profiles.find(p => p.id === f.user_id)
          return { id: f.id, user_id: f.user_id, username: p?.username || 'Unknown' }
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
      .eq('user_id', profile.id)
    
    if (data && data.length > 0) {
      const followerIds = data.map(f => f.follower_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', followerIds)
      
      if (profiles) {
        setFollowing(data.map(f => {
          const p = profiles.find(p => p.id === f.follower_id)
          return { id: f.id, user_id: f.follower_id, username: p?.username || 'Unknown' }
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
    
    if (data) setNotifications(data)
  }, [profile.id])

  const fetchFriendsEvents = useCallback(async () => {
    if (following.length === 0) {
      setFriendsEvents([])
      return
    }
    
    const friendIds = following.map(f => f.user_id)
    const { data } = await supabase
      .from('events')
      .select('*, profiles(username)')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) {
      setFriendsEvents(data)
      data.forEach(event => {
        fetchReactions(event.id)
        fetchComments(event.id)
      })
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
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
    
    if (data) {
      setComments(prev => ({
        ...prev,
        [eventId]: data.map(c => ({
          id: c.id,
          user_id: c.user_id,
          username: c.profiles?.username || 'Unknown',
          text: c.comment_text,
          created_at: c.created_at,
        }))
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
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) return
    
    await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', profile.id)
    
    fetchEvents()
  }

  const handleSaveUsername = async () => {
    if (tempUsername.trim()) {
      await supabase
        .from('profiles')
        .update({ username: tempUsername.trim() })
        .eq('id', profile.id)
      
      setEditingUsername(false)
      window.location.reload()
    }
  }

  const handleSaveAvatar = (emoji: string) => {
    setAvatar(emoji)
    localStorage.setItem('poop_avatar', emoji)
    setShowAvatarPicker(false)
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
    await supabase.from('friends').insert({
      user_id: profile.id,
      follower_id: userId
    })
    
    await supabase.from('notifications').insert({
      user_id: userId,
      friend_id: profile.id,
      friend_username: profile.username,
      notification_type: 'follow'
    })
    
    fetchFollowing()
    setShowAddFriendModal(false)
    setFriendEmail('')
    setFriendSearchResult(null)
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
          theme === 'light' ? 'bg-white border-2 border-blue-200' : 'bg-white/5 border border-blue-500/20'
        }`}>
          <div className="text-2xl font-bold text-blue-400">{todayCount}</div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Сегодня</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${
          theme === 'light' ? 'bg-white border-2 border-cyan-200' : 'bg-white/5 border border-purple-500/20'
        }`}>
          <div className={`text-2xl font-bold ${theme === 'light' ? 'text-cyan-600' : 'text-purple-400'}`}>{weekCount}</div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Неделя</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${
          theme === 'light' ? 'bg-white border-2 border-sky-200' : 'bg-white/5 border border-pink-500/20'
        }`}>
          <div className={`text-2xl font-bold ${theme === 'light' ? 'text-sky-600' : 'text-pink-400'}`}>{events.length}</div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Всего</div>
        </div>
      </div>

      <div className="flex justify-center my-6">
        <button
          onClick={handlePoop}
          className={`relative w-48 h-48 rounded-full shadow-2xl border-4 transition-all duration-200 hover:scale-105 active:scale-90 group ${
            theme === 'light'
              ? 'bg-gradient-to-br from-blue-400 via-cyan-400 to-sky-400 shadow-blue-500/40 border-blue-300/50'
              : 'bg-gradient-to-br from-cyan-500 via-fuchsia-500 to-purple-500 shadow-fuchsia-500/40 border-cyan-400/30'
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
        theme === 'light' ? 'bg-blue-50 border-2 border-blue-200' : 'bg-white/5 border border-white/10'
      }`}>
        <div className={`text-3xl font-bold ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`}>
          {todayCount}
        </div>
        <div className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
          💩 Сегодня
        </div>
      </div>

      <div className={`mb-6 p-4 rounded-2xl ${
        theme === 'light' ? 'bg-white border-2 border-gray-200' : 'bg-white/5 border border-white/10'
      }`}>
        <h3 className={`text-sm font-semibold mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
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
                      : theme === 'light'
                        ? 'bg-gradient-to-t from-blue-300 to-blue-400'
                        : 'bg-gradient-to-t from-purple-500/50 to-fuchsia-500/50'
                  }`}
                  style={{ height: `${day.count > 0 ? Math.max((day.count / maxCount) * 100, 10) : 5}%` }}
                />
              </div>
              <div className={`text-xs font-medium ${
                day.isToday
                  ? theme === 'light' ? 'text-cyan-600' : 'text-cyan-400'
                  : theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                {day.day}
              </div>
              <div className={`text-xs ${
                day.count > 0
                  ? theme === 'light' ? 'text-gray-800' : 'text-white'
                  : theme === 'light' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {day.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {events.length > 0 && (
        <div className={`mb-6 p-4 rounded-2xl ${
          theme === 'light' ? 'bg-white border-2 border-blue-200' : 'bg-white/5 border border-white/10'
        }`}>
          <h3 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            📋 Последние записи
          </h3>
          <div className="space-y-2">
            {events.slice(0, 7).map(event => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  theme === 'light'
                    ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{avatar}</span>
                    <div>
                      <div className={`text-sm font-medium ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                        {new Date(event.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(event.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  {event.bristol_type && (
                    <div className={`text-xs px-2 py-1 rounded ${
                      event.bristol_type <= 2 ? 'bg-red-100 text-red-700' :
                      event.bristol_type <= 4 ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      Тип {event.bristol_type}
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
          <h3 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            🔔 Уведомления
          </h3>
          <div className="space-y-2">
            {notifications.slice(0, 5).map(notif => (
              <div key={notif.id} className={`rounded-xl p-3 ${
                theme === 'light' ? 'bg-white border-2 border-cyan-200' : 'bg-white/5 border border-cyan-500/20'
              }`}>
                <div className={`text-sm ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                  💩 У {notif.friend_username} вышло!
                </div>
                <div className={`text-xs mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {new Date(notif.created_at).toLocaleString()}
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
          theme === 'light'
            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
            : 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white'
        }`}
      >
        ➕ Добавить друга
      </button>

      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
          👥 Подписки ({following.length})
        </h3>
        {following.length === 0 ? (
          <p className="text-gray-500 text-sm">Никого не найдено</p>
        ) : (
          <div className="space-y-2">
            {following.map(friend => (
              <div key={friend.id} className={`flex items-center justify-between rounded-xl p-3 ${
                theme === 'light' ? 'bg-white border-2 border-blue-200' : 'bg-white/5 border border-white/10'
              }`}>
                <span className={theme === 'light' ? 'text-gray-800' : 'text-white'}>{friend.username}</span>
                <button
                  onClick={async () => {
                    await supabase.from('friends').delete().eq('id', friend.id)
                    fetchFollowing()
                  }}
                  className={`px-4 py-1 rounded-lg text-sm font-semibold ${
                    theme === 'light'
                      ? 'bg-red-50 border-2 border-red-200 text-red-600'
                      : 'bg-red-500/20 border border-red-500/30 text-red-400'
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
        <h3 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
          🌟 Подписчики ({followers.length})
        </h3>
        {followers.length === 0 ? (
          <p className="text-gray-500 text-sm">Никого не найдено</p>
        ) : (
          <div className="space-y-2">
            {followers.map(follower => (
              <div key={follower.id} className={`rounded-xl p-3 ${
                theme === 'light' ? 'bg-white border-2 border-blue-200' : 'bg-white/5 border border-white/10'
              }`}>
                <span className={theme === 'light' ? 'text-gray-800' : 'text-white'}>{follower.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const FeedTab = () => (
    <div className="p-4">
      <div className="flex bg-white/5 rounded-xl p-1 mb-4">
        <button
          onClick={() => setFeedTab('friends')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            feedTab === 'friends' ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white' : 'text-gray-400'
          }`}
        >
          👥 Друзья
        </button>
        <button
          onClick={() => setFeedTab('my')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            feedTab === 'my' ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white' : 'text-gray-400'
          }`}
        >
          💩 Моя история
        </button>
      </div>

      {feedTab === 'friends' ? (
        <div>
          {friendsEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">👀</div>
              <p className={`font-semibold ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Пока пусто</p>
              <p className={`text-sm mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>Подпишитесь на друзей</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friendsEvents.map(event => (
                <div key={event.id} className={`rounded-xl p-4 ${
                  theme === 'light' ? 'bg-white border-2 border-fuchsia-200' : 'bg-white/5 border border-fuchsia-500/20'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-purple-500 rounded-full flex items-center justify-center text-lg">💩</div>
                    <div className="flex-1">
                      <div className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                        {event.profiles?.username || 'Unknown'}
                      </div>
                      <div className={`text-sm ${theme === 'light' ? 'text-gray-800' : 'text-fuchsia-400'}`}>
                        У {event.profiles?.username} вышло!
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
                        <div key={comment.id} className={`rounded-lg p-2 ${theme === 'light' ? 'bg-gray-50' : 'bg-white/5'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-cyan-400">{comment.username}</span>
                            <span className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{formatTimeAgo(comment.created_at)}</span>
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
                      onChange={(e) => setNewComment(prev => ({ ...prev, [event.id]: e.target.value }))}
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
      ) : (
        <div>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">💩</div>
              <p className={`font-semibold ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Вы ещё не нажимали кнопку 💩</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div 
                  key={event.id} 
                  id={`event-${event.id}`}
                  className={`rounded-xl p-4 transition-all ${
                    highlightedEventId === event.id
                      ? theme === 'light'
                        ? 'bg-blue-100 border-4 border-blue-500 shadow-lg scale-105'
                        : 'bg-blue-500/20 border-4 border-blue-400 shadow-lg scale-105'
                      : theme === 'light'
                        ? 'bg-white border-2 border-cyan-200'
                        : 'bg-white/5 border border-cyan-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg">💩</div>
                    <div className="flex-1">
                      <div className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>{profile.username}</div>
                      <div className={`text-sm ${theme === 'light' ? 'text-gray-800' : 'text-cyan-400'}`}>У меня вышло!</div>
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
                      onClick={() => {
                        setEditingEventId(event.id)
                        setShowBristolModal(true)
                        setCurrentEventId(event.id)
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${
                        theme === 'light'
                          ? 'bg-blue-50 border-2 border-blue-200 text-blue-600'
                          : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                      }`}
                    >
                      ✏️ Редактировать
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${
                        theme === 'light'
                          ? 'bg-red-50 border-2 border-red-200 text-red-600'
                          : 'bg-red-500/20 border border-red-500/30 text-red-400'
                      }`}
                    >
                      🗑️ Удалить
                    </button>
                  </div>

                  {reactions[event.id] && (reactions[event.id].thumbs_up > 0 || reactions[event.id].heart > 0 || reactions[event.id].poop > 0) && (
                    <div className={`flex gap-2 mt-3 pt-3 border-t ${theme === 'light' ? 'border-gray-200' : 'border-white/10'}`}>
                      {reactions[event.id].thumbs_up > 0 && (
                        <span className={`px-2 py-1 rounded-lg text-xs ${theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/10 text-blue-400'}`}>
                          👍 {reactions[event.id].thumbs_up}
                        </span>
                      )}
                      {reactions[event.id].heart > 0 && (
                        <span className={`px-2 py-1 rounded-lg text-xs ${theme === 'light' ? 'bg-red-50 text-red-600' : 'bg-red-500/10 text-red-400'}`}>
                          ❤️ {reactions[event.id].heart}
                        </span>
                      )}
                      {reactions[event.id].poop > 0 && (
                        <span className={`px-2 py-1 rounded-lg text-xs ${theme === 'light' ? 'bg-amber-50 text-amber-600' : 'bg-amber-500/10 text-amber-400'}`}>
                          💩 {reactions[event.id].poop}
                        </span>
                      )}
                    </div>
                  )}

                  {comments[event.id] && comments[event.id].length > 0 && (
                    <div className="mt-3 space-y-2">
                      {comments[event.id].map(comment => (
                        <div key={comment.id} className={`rounded-lg p-2 ${theme === 'light' ? 'bg-gray-50' : 'bg-white/5'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-cyan-400">{comment.username}</span>
                            <span className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{formatTimeAgo(comment.created_at)}</span>
                          </div>
                          <p className={`text-sm mt-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  const SettingsTab = () => (
    <div className="p-4">
      <h2 className={`text-xl font-bold mb-6 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>Настройки</h2>

      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
          👤 Аккаунт
        </h3>
        <div className={`rounded-xl p-4 ${theme === 'light' ? 'bg-white border-2 border-gray-200' : 'bg-white/5 border border-white/10'}`}>
          {editingUsername ? (
            <div className="space-y-3">
              <input
                type="text"
                value={tempUsername}
                onChange={e => setTempUsername(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:border-blue-400 ${
                  theme === 'light' ? 'bg-gray-50 border-2 border-gray-200 text-gray-800' : 'bg-white/5 border border-blue-500/30 text-white'
                }`}
              />
              <div className="flex gap-2">
                <button onClick={handleSaveUsername} className="flex-1 py-2 bg-blue-500 rounded-lg text-white font-semibold">
                  Сохранить
                </button>
                <button
                  onClick={() => { setEditingUsername(false); setTempUsername(profile.username) }}
                  className={`flex-1 py-2 rounded-lg font-semibold ${theme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-gray-500/20 text-gray-300'}`}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setShowAvatarPicker(!showAvatarPicker)} className="text-4xl hover:scale-110 transition-transform">
                  {avatar}
                </button>
                <div>
                  <div className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>{profile.username}</div>
                  <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{profile.id.substring(0, 8)}...</div>
                </div>
              </div>
              <button
                onClick={() => setEditingUsername(true)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  theme === 'light' ? 'bg-blue-50 border-2 border-blue-200 text-blue-600' : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                }`}
              >
                Изменить профиль
              </button>
            </div>
          )}
          
          {showAvatarPicker && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className={`text-sm mb-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Выберите аватарку:</p>
              <div className="grid grid-cols-5 gap-2">
                {avatarEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSaveAvatar(emoji)}
                    className={`text-3xl p-2 rounded-lg transition-all hover:scale-110 ${
                      avatar === emoji
                        ? theme === 'light' ? 'bg-blue-100 border-2 border-blue-400' : 'bg-blue-500/20 border-2 border-blue-400'
                        : theme === 'light' ? 'bg-gray-50 border-2 border-gray-200' : 'bg-white/5 border-2 border-white/10'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
          🎨 Тема
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setTheme('light'); localStorage.setItem('poop_theme', 'light') }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              theme === 'light' ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg' : 'bg-white/5 text-gray-400'
            }`}
          >
            ☀️ Светлая
          </button>
          <button
            onClick={() => { setTheme('dark'); localStorage.setItem('poop_theme', 'dark') }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              theme === 'dark' ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg' : 'bg-white/5 text-gray-400'
            }`}
          >
            🌙 Тёмная
          </button>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={onLogout}
          className={`w-full py-3 rounded-xl font-semibold ${
            theme === 'light' ? 'bg-red-50 border-2 border-red-200 text-red-600' : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}
        >
          Выйти
        </button>
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen flex flex-col ${
      theme === 'light' ? 'bg-gradient-to-br from-sky-50 via-white to-blue-50' : 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950'
    }`}>
      {showSuccess && <SuccessAnimation onComplete={() => setShowSuccess(false)} />}

      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'feed' && <FeedTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

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
                          type <= 2 ? 'text-red-400' : type === 3 || type === 4 ? 'text-green-400' : 'text-orange-400'
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
            theme === 'light' ? 'bg-white border-2 border-blue-200' : 'bg-gradient-to-br from-slate-900 to-purple-950 border-2 border-cyan-500/30'
          }`}>
            <h2 className={`text-xl font-bold text-center mb-4 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
              Добавить друга
            </h2>
            <p className={`text-sm text-center mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              Введите email друга для поиска
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={friendEmail}
                onChange={e => setFriendEmail(e.target.value)}
                placeholder="friend@example.com"
                className={`flex-1 px-4 py-3 rounded-xl focus:outline-none focus:border-blue-400 ${
                  theme === 'light'
                    ? 'bg-gray-50 border-2 border-gray-200 text-gray-800 placeholder-gray-400'
                    : 'bg-white/5 border border-blue-500/30 text-white placeholder-gray-500'
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
                theme === 'light' ? 'bg-blue-50 border-2 border-blue-200' : 'bg-white/5 border border-white/10'
              }`}>
                <div className={`font-semibold mb-1 ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                  {friendSearchResult.username}
                </div>
                <div className={`text-xs mb-3 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                  {friendSearchResult.email}
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
                theme === 'light' ? 'bg-gray-50 border-2 border-gray-200' : 'bg-white/5 border border-white/10'
              }`}>
                <div className="text-4xl mb-2">🔍</div>
                <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
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
                theme === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-white/5 border border-white/10 text-gray-300'
              }`}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Нижняя навигация */}
      <div className={`fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t ${
        theme === 'light' ? 'bg-white/95 border-blue-200' : 'bg-slate-900/95 border-white/10'
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-semibold">Настройки</span>
          </button>
        </div>
      </div>
    </div>
  )
}
