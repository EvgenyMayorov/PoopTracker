import { useState, useEffect, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { Lang, LANG_NAMES, LANG_FLAGS, t } from '../i18n'
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
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('poop_lang') as Lang) || 'ru')
  const [events, setEvents] = useState<any[]>([])
  const [followers, setFollowers] = useState<Friend[]>([])
  const [following, setFollowing] = useState<Friend[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
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
  const [notifSettings, setNotifSettings] = useState(() => {
    const saved = localStorage.getItem('poop_notif_settings')
    return saved ? JSON.parse(saved) : {
      friendPooped: true,
      friendReaction: true,
      friendComment: true,
      friendFollowed: true
    }
  })

  // Загрузка событий
  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) {
      setEvents(data)
      // Загружаем реакции и комментарии для каждого события
      data.forEach(event => {
        fetchReactions(event.id)
        fetchComments(event.id)
      })
    }
  }, [])

  // Загрузка подписчиков
  const fetchFollowers = useCallback(async () => {
    const { data } = await supabase
      .from('friends')
      .select('id, user_id, follower_id')
      .eq('follower_id', profile.id)
    
    if (data && data.length > 0) {
      // Получаем имена подписчиков
      const userIds = data.map(f => f.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds)
      
      if (profiles) {
        setFollowers(data.map(f => {
          const profile = profiles.find(p => p.id === f.user_id)
          return {
            id: f.id,
            user_id: f.user_id,
            username: profile?.username || 'Unknown'
          }
        }))
      }
    } else {
      setFollowers([])
    }
  }, [profile.id])

  // Загрузка подписок
  const fetchFollowing = useCallback(async () => {
    const { data } = await supabase
      .from('friends')
      .select('id, user_id, follower_id')
      .eq('user_id', profile.id)
    
    if (data && data.length > 0) {
      // Получаем имена подписок
      const followerIds = data.map(f => f.follower_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', followerIds)
      
      if (profiles) {
        setFollowing(data.map(f => {
          const profile = profiles.find(p => p.id === f.follower_id)
          return {
            id: f.id,
            user_id: f.follower_id,
            username: profile?.username || 'Unknown'
          }
        }))
      }
    } else {
      setFollowing([])
    }
  }, [profile.id])

  // Загрузка уведомлений
  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (data) setNotifications(data)
  }, [profile.id])

  // Загрузка событий друзей
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
      // Загружаем реакции и комментарии для каждого события
      data.forEach(event => {
        fetchReactions(event.id)
        fetchComments(event.id)
      })
    }
  }, [following])

  // Загрузка реакций для события
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

  // Загрузка комментариев для события
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

  // Добавить реакцию
  const handleReaction = async (eventId: string, reactionType: 'thumbs_up' | 'heart' | 'poop') => {
    const currentReaction = reactions[eventId]?.userReaction
    
    if (currentReaction === reactionType) {
      // Удалить реакцию
      await supabase
        .from('reactions')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', profile.id)
    } else {
      if (currentReaction) {
        // Изменить реакцию
        await supabase
          .from('reactions')
          .update({ reaction_type: reactionType })
          .eq('event_id', eventId)
          .eq('user_id', profile.id)
      } else {
        // Добавить новую реакцию
        await supabase
          .from('reactions')
          .insert({
            event_id: eventId,
            user_id: profile.id,
            reaction_type: reactionType,
          })
        
        // Создать уведомление для владельца события
        const { data: event } = await supabase
          .from('events')
          .select('user_id')
          .eq('id', eventId)
          .single()
        
        if (event && event.user_id !== profile.id) {
          await supabase.from('notifications').insert({
            user_id: event.user_id,
            friend_id: profile.id,
            friend_username: profile.username,
            notification_type: 'reaction',
            event_id: eventId,
            reaction_type: reactionType,
          })
        }
      }
    }
    
    fetchReactions(eventId)
  }

  // Добавить комментарий
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
    
    // Создать уведомление для владельца события
    const { data: event } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .single()
    
    if (event && event.user_id !== profile.id) {
      await supabase.from('notifications').insert({
        user_id: event.user_id,
        friend_id: profile.id,
        friend_username: profile.username,
        notification_type: 'comment',
        event_id: eventId,
        comment_text: text,
      })
    }
    
    setNewComment(prev => ({ ...prev, [eventId]: '' }))
    fetchComments(eventId)
  }

  // Удалить событие
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm(t(lang, 'deleteConfirm'))) return
    
    await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', profile.id)
    
    fetchEvents()
  }

  // Изменить тип по шкале Бристольской формы
  const handleEditBristolType = async (eventId: string, newType: number) => {
    await supabase
      .from('events')
      .update({ bristol_type: newType })
      .eq('id', eventId)
      .eq('user_id', profile.id)
    
    setEditingEventId(null)
    fetchEvents()
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

  // Realtime подписка на события друзей, реакции и комментарии
  useEffect(() => {
    const channel = supabase
      .channel('friends-events')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'events' },
        async (payload) => {
          // Проверяем, есть ли этот пользователь в подписках
          const friendEvent = payload.new
          const isFriend = following.some(f => f.user_id === friendEvent.user_id)
          
          if (isFriend) {
            // Получаем имя друга
            const { data: friendProfile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', friendEvent.user_id)
              .single()
            
            if (friendProfile) {
              // Создаём уведомление
              await supabase.from('notifications').insert({
                user_id: profile.id,
                friend_id: friendEvent.user_id,
                friend_username: friendProfile.username
              })
              
              // Обновляем список уведомлений
              fetchNotifications()
              
              // Показываем браузерное уведомление
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(t(lang, 'notification'), {
                  body: t(lang, 'friendPooped').replace('{name}', friendProfile.username),
                  icon: '💩'
                })
              }
            }
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        (payload) => {
          // Обновляем реакции для всех событий
          if (payload.new && 'event_id' in payload.new) {
            fetchReactions(payload.new.event_id as string)
          }
          if (payload.old && 'event_id' in payload.old) {
            fetchReactions(payload.old.event_id as string)
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload) => {
          // Обновляем комментарии для всех событий
          if (payload.new && 'event_id' in payload.new) {
            fetchComments(payload.new.event_id as string)
          }
          if (payload.old && 'event_id' in payload.old) {
            fetchComments(payload.old.event_id as string)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [following, profile.id, lang, fetchNotifications])

  // Запрос разрешения на уведомления
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Обработка кнопки "У меня вышло!"
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

  // Сохранение типа стула по Бристольской шкале (автоматически при выборе)
  const handleBristolSelect = async (type: number) => {
    if (currentEventId) {
      await supabase
        .from('events')
        .update({ bristol_type: type })
        .eq('id', currentEventId)
      
      // Обновляем список событий
      fetchEvents()
      fetchFriendsEvents()
    }
    setShowBristolModal(false)
    setCurrentEventId(null)
    setSelectedType(null)
    setEditingEventId(null)
    
    // Показываем анимацию успеха только для новых записей
    if (!editingEventId) {
      setShowSuccess(true)
    }
  }

  // Пропустить выбор типа
  const handleBristolSkip = () => {
    setShowBristolModal(false)
    setCurrentEventId(null)
    setSelectedType(null)
  }

  // Поиск пользователей
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${searchQuery}%`)
      .neq('id', profile.id)
      .limit(20)

    setSearchResults(data || [])
  }

  // Подписаться
  const handleFollow = async (userId: string) => {
    await supabase.from('friends').insert({
      user_id: profile.id,
      follower_id: userId
    })
    fetchFollowing()
    setSearchResults([])
    setSearchQuery('')
  }

  // Отписаться
  const handleUnfollow = async (friendId: string) => {
    await supabase.from('friends').delete().eq('id', friendId)
    fetchFollowing()
  }

  // Сохранить имя
  const handleSaveUsername = async () => {
    if (tempUsername.trim()) {
      await supabase
        .from('profiles')
        .update({ username: tempUsername.trim() })
        .eq('id', profile.id)
      
      setEditingUsername(false)
      // Перезагружаем страницу для обновления профиля
      window.location.reload()
    }
  }

  // Обновить настройки уведомлений
  const handleNotifSettingChange = (key: string, value: boolean) => {
    const newSettings = { ...notifSettings, [key]: value }
    setNotifSettings(newSettings)
    localStorage.setItem('poop_notif_settings', JSON.stringify(newSettings))
  }

  // Отправить тестовое уведомление
  const handleTestNotification = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(t(lang, 'testNotification'), {
          body: t(lang, 'testNotificationText'),
          icon: '💩'
        })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(t(lang, 'testNotification'), {
              body: t(lang, 'testNotificationText'),
              icon: '💩'
            })
          }
        })
      }
    }
  }

  // Статистика
  const todayCount = events.filter(e => 
    new Date(e.created_at).toDateString() === new Date().toDateString()
  ).length
  const weekCount = events.filter(e => 
    new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length

  // Данные для графика за последние 7 дней
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
        day: date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' }),
        count,
        isToday: i === 0
      })
    }
    return data
  })()
  const maxCount = Math.max(...weekData.map(d => d.count), 1)

  // Функция форматирования времени
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return t(lang, 'justNow')
    if (diffMin < 60) return t(lang, 'timeAgo').replace('{time}', `${diffMin} ${t(lang, 'minutes')}`)
    if (diffHours < 24) return t(lang, 'timeAgo').replace('{time}', `${diffHours} ${t(lang, 'hours')}`)
    return t(lang, 'timeAgo').replace('{time}', `${diffDays} ${t(lang, 'days')}`)
  }

  // Вкладка Лента
  const FeedTab = () => (
    <div className="p-4">
      {/* Переключатель подвкладок */}
      <div className="flex bg-white/5 rounded-xl p-1 mb-4">
        <button
          onClick={() => setFeedTab('friends')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            feedTab === 'friends' 
              ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white' 
              : 'text-gray-400'
          }`}
        >
          👥 {t(lang, 'feedFriends')}
        </button>
        <button
          onClick={() => setFeedTab('my')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            feedTab === 'my' 
              ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white' 
              : 'text-gray-400'
          }`}
        >
          💩 {t(lang, 'feedMy')}
        </button>
      </div>

      {/* Контент подвкладки */}
      {feedTab === 'friends' ? (
        <div>
          {friendsEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">👀</div>
              <p className={`font-semibold ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t(lang, 'feedEmpty')}</p>
              <p className={`text-sm mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{t(lang, 'feedEmptyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friendsEvents.map(event => (
                <div key={event.id} className={`rounded-xl p-4 ${
                  theme === 'light'
                    ? 'bg-white border-2 border-fuchsia-200'
                    : 'bg-white/5 border border-fuchsia-500/20'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-purple-500 rounded-full flex items-center justify-center text-lg">
                      💩
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                        {event.profiles?.username || 'Unknown'}
                      </div>
                      <div className="text-fuchsia-400 text-sm">
                        {t(lang, 'friendPooped').replace('{name}', event.profiles?.username || '')}
                      </div>
                      {event.bristol_type && (
                        <div className={`text-xs mt-1 ${
                          event.bristol_type <= 2 ? 'text-red-400' :
                          event.bristol_type === 3 || event.bristol_type === 4 ? 'text-green-400' :
                          'text-orange-400'
                        }`}>
                          {t(lang, `bristolType${event.bristol_type}`)} • {t(lang, `bristolLabel${event.bristol_type}`)}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {formatTimeAgo(event.created_at)}
                    </div>
                  </div>

                  {/* Реакции */}
                  <div className={`flex gap-2 mt-3 pt-3 border-t ${
                    theme === 'light' ? 'border-gray-200' : 'border-white/10'
                  }`}>
                    <button
                      onClick={() => handleReaction(event.id, 'thumbs_up')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-all ${
                        reactions[event.id]?.userReaction === 'thumbs_up'
                          ? 'bg-blue-500/20 text-blue-400'
                          : theme === 'light'
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      👍 {reactions[event.id]?.thumbs_up || 0}
                    </button>
                    <button
                      onClick={() => handleReaction(event.id, 'heart')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-all ${
                        reactions[event.id]?.userReaction === 'heart'
                          ? 'bg-red-500/20 text-red-400'
                          : theme === 'light'
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      ❤️ {reactions[event.id]?.heart || 0}
                    </button>
                    <button
                      onClick={() => handleReaction(event.id, 'poop')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-all ${
                        reactions[event.id]?.userReaction === 'poop'
                          ? 'bg-amber-500/20 text-amber-400'
                          : theme === 'light'
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      💩 {reactions[event.id]?.poop || 0}
                    </button>
                  </div>

                  {/* Комментарии */}
                  {comments[event.id] && comments[event.id].length > 0 && (
                    <div className="mt-3 space-y-2">
                      {comments[event.id].map(comment => (
                        <div key={comment.id} className={`rounded-lg p-2 ${
                          theme === 'light' ? 'bg-gray-50' : 'bg-white/5'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-cyan-400">{comment.username}</span>
                            <span className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>{formatTimeAgo(comment.created_at)}</span>
                          </div>
                          <p className={`text-sm mt-1 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Поле для добавления комментария */}
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={newComment[event.id] || ''}
                      onChange={(e) => setNewComment(prev => ({ ...prev, [event.id]: e.target.value }))}
                      placeholder={t(lang, 'commentPlaceholder')}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 ${
                        theme === 'light'
                          ? 'bg-white border-2 border-gray-200 text-gray-800 placeholder-gray-400'
                          : 'bg-white/5 border border-white/10 text-white placeholder-gray-500'
                      }`}
                    />
                    <button
                      onClick={() => handleAddComment(event.id)}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-lg text-white text-sm font-semibold hover:opacity-90"
                    >
                      {t(lang, 'commentSend')}
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
              <p className={`font-semibold ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t(lang, 'myEventsEmpty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className={`rounded-xl p-4 ${
                  theme === 'light'
                    ? 'bg-white border-2 border-cyan-200'
                    : 'bg-white/5 border border-cyan-500/20'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg">
                      💩
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>{profile.username}</div>
                      <div className="text-cyan-400 text-sm">{t(lang, 'poopButton')}</div>
                      {event.bristol_type && (
                        <div className={`text-xs mt-1 ${
                          event.bristol_type <= 2 ? 'text-red-400' :
                          event.bristol_type === 3 || event.bristol_type === 4 ? 'text-green-400' :
                          'text-orange-400'
                        }`}>
                          {t(lang, `bristolType${event.bristol_type}`)} • {t(lang, `bristolLabel${event.bristol_type}`)}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {formatTimeAgo(event.created_at)}
                    </div>
                  </div>
                  <div className={`mt-2 text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                    {new Date(event.created_at).toLocaleString()}
                  </div>

                  {/* Кнопки редактирования и удаления */}
                  <div className={`flex gap-2 mt-3 pt-3 border-t ${
                    theme === 'light' ? 'border-gray-200' : 'border-white/10'
                  }`}>
                    <button
                      onClick={() => {
                        setEditingEventId(event.id)
                        setShowBristolModal(true)
                        setCurrentEventId(event.id)
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${
                        theme === 'light'
                          ? 'bg-blue-50 border-2 border-blue-200 text-blue-600 hover:bg-blue-100'
                          : 'bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
                      }`}
                    >
                      ✏️ {t(lang, 'editEvent')}
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${
                        theme === 'light'
                          ? 'bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100'
                          : 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      🗑️ {t(lang, 'deleteEvent')}
                    </button>
                  </div>

                  {/* Реакции от друзей */}
                  {reactions[event.id] && (reactions[event.id].thumbs_up > 0 || reactions[event.id].heart > 0 || reactions[event.id].poop > 0) && (
                    <div className={`flex gap-2 mt-3 pt-3 border-t ${
                      theme === 'light' ? 'border-gray-200' : 'border-white/10'
                    }`}>
                      {reactions[event.id].thumbs_up > 0 && (
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          👍 {reactions[event.id].thumbs_up}
                        </span>
                      )}
                      {reactions[event.id].heart > 0 && (
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          theme === 'light' ? 'bg-red-50 text-red-600' : 'bg-red-500/10 text-red-400'
                        }`}>
                          ❤️ {reactions[event.id].heart}
                        </span>
                      )}
                      {reactions[event.id].poop > 0 && (
                        <span className={`px-2 py-1 rounded-lg text-xs ${
                          theme === 'light' ? 'bg-amber-50 text-amber-600' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          💩 {reactions[event.id].poop}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Комментарии от друзей */}
                  {comments[event.id] && comments[event.id].length > 0 && (
                    <div className="mt-3 space-y-2">
                      {comments[event.id].map(comment => (
                        <div key={comment.id} className={`rounded-lg p-2 ${
                          theme === 'light' ? 'bg-gray-50' : 'bg-white/5'
                        }`}>
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

  // Главная вкладка
  const HomeTab = () => (
    <div className="p-4">
      {/* PWA Баннер */}
      <div className="mb-4">
        <PWAInstallBanner lang={lang} />
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className={`rounded-xl p-3 text-center ${
          theme === 'light' 
            ? 'bg-white border-2 border-blue-200' 
            : 'bg-white/5 border border-blue-500/20'
        }`}>
          <div className="text-2xl font-bold text-blue-400">{todayCount}</div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t(lang, 'today')}</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${
          theme === 'light' 
            ? 'bg-white border-2 border-purple-200' 
            : 'bg-white/5 border border-purple-500/20'
        }`}>
          <div className="text-2xl font-bold text-purple-400">{weekCount}</div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t(lang, 'week')}</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${
          theme === 'light' 
            ? 'bg-white border-2 border-pink-200' 
            : 'bg-white/5 border border-pink-500/20'
        }`}>
          <div className="text-2xl font-bold text-pink-400">{events.length}</div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t(lang, 'total')}</div>
        </div>
      </div>

      {/* Круглая кнопка */}
      <div className="flex justify-center my-6">
        <button
          onClick={handlePoop}
          className="relative w-48 h-48 rounded-full bg-gradient-to-br from-cyan-500 via-fuchsia-500 to-purple-500 shadow-2xl shadow-fuchsia-500/40 border-4 border-cyan-400/30 transition-all duration-200 hover:shadow-fuchsia-500/60 hover:scale-105 active:scale-90 group"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10" />
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-6xl transition-transform duration-200 group-active:scale-125">
              💩
            </span>
            <span className="text-sm font-bold mt-2 text-white px-4 text-center leading-tight">
              {t(lang, 'poopButton')}
            </span>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ping" />
        </button>
      </div>

      {/* Статистика сегодня */}
      <div className={`text-center mb-6 p-4 rounded-2xl ${
        theme === 'light' 
          ? 'bg-blue-50 border-2 border-blue-200' 
          : 'bg-white/5 border border-white/10'
      }`}>
        <div className={`text-3xl font-bold ${
          theme === 'light' ? 'text-blue-600' : 'text-cyan-400'
        }`}>
          {todayCount}
        </div>
        <div className={`text-sm ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-400'
        }`}>
          💩 {t(lang, 'today')}
        </div>
      </div>

      {/* График за последние 7 дней */}
      <div className={`mb-6 p-4 rounded-2xl ${
        theme === 'light' 
          ? 'bg-white border-2 border-gray-200' 
          : 'bg-white/5 border border-white/10'
      }`}>
        <h3 className={`text-sm font-semibold mb-4 ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-400'
        }`}>
          📊 {t(lang, 'weekChart')}
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
                  style={{ 
                    height: `${day.count > 0 ? Math.max((day.count / maxCount) * 100, 10) : 5}%`,
                    minHeight: day.count > 0 ? '8px' : '4px'
                  }}
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

      {/* Уведомления */}
      {notifications.length > 0 && (
        <div className="mt-6">
          <h3 className={`text-sm font-semibold mb-3 ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
          }`}>
            🔔 {t(lang, 'notification')}
          </h3>
          <div className="space-y-2">
            {notifications.slice(0, 5).map(notif => (
              <div key={notif.id} className={`rounded-xl p-3 ${
                theme === 'light'
                  ? 'bg-white border-2 border-cyan-200'
                  : 'bg-white/5 border border-cyan-500/20'
              }`}>
                <div className={`text-sm ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                  💩 {t(lang, 'friendPooped').replace('{name}', notif.friend_username)}
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

  // Вкладка Люди
  const PeopleTab = () => (
    <div className="p-4">
      {/* Поиск */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyUp={handleSearch}
          placeholder={t(lang, 'searchPlaceholder')}
          className="w-full px-4 py-3 bg-white/5 border border-blue-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
        />
        
        {/* Результаты поиска */}
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map(user => (
              <div key={user.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-white">{user.username}</span>
                <button
                  onClick={() => handleFollow(user.id)}
                  className="px-4 py-1 bg-blue-500 rounded-lg text-white text-sm font-semibold"
                >
                  {t(lang, 'follow')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Подписки */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          👥 {t(lang, 'following')} ({following.length})
        </h3>
        {following.length === 0 ? (
          <p className="text-gray-500 text-sm">{t(lang, 'noResults')}</p>
        ) : (
          <div className="space-y-2">
            {following.map(friend => (
              <div key={friend.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-white">{friend.username}</span>
                <button
                  onClick={() => handleUnfollow(friend.id)}
                  className="px-4 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-semibold"
                >
                  {t(lang, 'unfollow')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Подписчики */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          🌟 {t(lang, 'followers')} ({followers.length})
        </h3>
        {followers.length === 0 ? (
          <p className="text-gray-500 text-sm">{t(lang, 'noResults')}</p>
        ) : (
          <div className="space-y-2">
            {followers.map(follower => (
              <div key={follower.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-white">{follower.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // Вкладка Настройки
  const SettingsTab = () => (
    <div className="p-4">
      <h2 className={`text-xl font-bold mb-6 ${
        theme === 'light' ? 'text-gray-800' : 'text-white'
      }`}>{t(lang, 'settings')}</h2>

      {/* Профиль */}
      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-400'
        }`}>
          👤 {t(lang, 'account')}
        </h3>
        <div className={`rounded-xl p-4 ${
          theme === 'light'
            ? 'bg-white border-2 border-gray-200'
            : 'bg-white/5 border border-white/10'
        }`}>
          {editingUsername ? (
            <div className="space-y-3">
              <input
                type="text"
                value={tempUsername}
                onChange={e => setTempUsername(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:border-blue-400 ${
                  theme === 'light'
                    ? 'bg-gray-50 border-2 border-gray-200 text-gray-800'
                    : 'bg-white/5 border border-blue-500/30 text-white'
                }`}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveUsername}
                  className="flex-1 py-2 bg-blue-500 rounded-lg text-white font-semibold"
                >
                  {t(lang, 'save')}
                </button>
                <button
                  onClick={() => {
                    setEditingUsername(false)
                    setTempUsername(profile.username)
                  }}
                  className={`flex-1 py-2 rounded-lg font-semibold ${
                    theme === 'light'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-gray-500/20 border border-gray-500/30 text-gray-300'
                  }`}
                >
                  {t(lang, 'cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className={`font-semibold ${
                  theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>{profile.username}</div>
                <div className={`text-xs ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-500'
                }`}>{profile.id.substring(0, 8)}...</div>
              </div>
              <button
                onClick={() => setEditingUsername(true)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  theme === 'light'
                    ? 'bg-blue-50 border-2 border-blue-200 text-blue-600'
                    : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                }`}
              >
                {t(lang, 'editProfile')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Тема */}
      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-400'
        }`}>
          🎨 {t(lang, 'theme')}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setTheme('light')
              localStorage.setItem('poop_theme', 'light')
            }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              theme === 'light'
                ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            ☀️ {t(lang, 'themeLight')}
          </button>
          <button
            onClick={() => {
              setTheme('dark')
              localStorage.setItem('poop_theme', 'dark')
            }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            🌙 {t(lang, 'themeDark')}
          </button>
        </div>
      </div>

      {/* Язык - выпадающий список */}
      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-400'
        }`}>
          🌐 {t(lang, 'language')}
        </h3>
        <select
          value={lang}
          onChange={(e) => {
            setLang(e.target.value as Lang)
            localStorage.setItem('poop_lang', e.target.value)
          }}
          className={`w-full p-3 rounded-xl font-medium transition-all ${
            theme === 'light'
              ? 'bg-white border-2 border-blue-300 text-gray-800'
              : 'bg-white/5 border-2 border-white/10 text-gray-300'
          }`}
        >
          {(Object.keys(LANG_NAMES) as Lang[]).map(l => (
            <option key={l} value={l} className="bg-slate-900">
              {LANG_FLAGS[l]} {LANG_NAMES[l]}
            </option>
          ))}
        </select>
      </div>

      {/* Статистика */}
      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-400'
        }`}>
          📊 {t(lang, 'stats')}
        </h3>
        <div className={`rounded-xl p-4 space-y-2 ${
          theme === 'light'
            ? 'bg-white border-2 border-gray-200'
            : 'bg-white/5 border border-white/10'
        }`}>
          <div className="flex justify-between">
            <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>{t(lang, 'totalEvents')}</span>
            <span className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>{events.length}</span>
          </div>
          <div className="flex justify-between">
            <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>{t(lang, 'dailyRecord')}</span>
            <span className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
              {(() => {
                const dayMap: Record<string, number> = {}
                events.forEach(e => {
                  const day = new Date(e.created_at).toDateString()
                  dayMap[day] = (dayMap[day] || 0) + 1
                })
                return Math.max(0, ...Object.values(dayMap))
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Настройки уведомлений */}
      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-400'
        }`}>
          🔔 {t(lang, 'notificationSettings')}
        </h3>
        <div className={`rounded-xl p-4 space-y-3 ${
          theme === 'light'
            ? 'bg-white border-2 border-gray-200'
            : 'bg-white/5 border border-white/10'
        }`}>
          {/* Чекбокс: У друга вышло */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifSettings.friendPooped}
              onChange={(e) => handleNotifSettingChange('friendPooped', e.target.checked)}
              className="w-5 h-5 rounded border-2 border-gray-300 text-cyan-500 focus:ring-cyan-500 focus:ring-2"
            />
            <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              💩 {t(lang, 'notifFriendPooped')}
            </span>
          </label>

          {/* Чекбокс: Друг поставил реакцию */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifSettings.friendReaction}
              onChange={(e) => handleNotifSettingChange('friendReaction', e.target.checked)}
              className="w-5 h-5 rounded border-2 border-gray-300 text-cyan-500 focus:ring-cyan-500 focus:ring-2"
            />
            <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              👍 {t(lang, 'notifFriendReaction')}
            </span>
          </label>

          {/* Чекбокс: Друг оставил комментарий */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifSettings.friendComment}
              onChange={(e) => handleNotifSettingChange('friendComment', e.target.checked)}
              className="w-5 h-5 rounded border-2 border-gray-300 text-cyan-500 focus:ring-cyan-500 focus:ring-2"
            />
            <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              💬 {t(lang, 'notifFriendComment')}
            </span>
          </label>

          {/* Чекбокс: Друг подписался на меня */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifSettings.friendFollowed}
              onChange={(e) => handleNotifSettingChange('friendFollowed', e.target.checked)}
              className="w-5 h-5 rounded border-2 border-gray-300 text-cyan-500 focus:ring-cyan-500 focus:ring-2"
            />
            <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              👥 {t(lang, 'notifFriendFollowed')}
            </span>
          </label>

          {/* Кнопка тестового уведомления */}
          <button
            onClick={handleTestNotification}
            className={`w-full mt-3 py-3 rounded-xl font-semibold transition-all ${
              theme === 'light'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600'
                : 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:from-cyan-600 hover:to-fuchsia-600'
            }`}
          >
            🔔 {t(lang, 'testNotification')}
          </button>
        </div>
      </div>

      {/* Памятка по PWA */}
      <div className="mb-6">
        <button
          onClick={() => setShowPWAGuide(true)}
          className={`w-full rounded-xl p-4 text-left transition-colors ${
            theme === 'light'
              ? 'bg-white border-2 border-gray-200 hover:bg-gray-50'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>{t(lang, 'pwaSettingsTitle')}</div>
              <div className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t(lang, 'pwaSettingsDesc')}</div>
            </div>
            <span className="text-2xl">📲</span>
          </div>
        </button>
      </div>

      {/* Выход */}
      <button
        onClick={onLogout}
        className={`w-full py-3 rounded-xl font-semibold ${
          theme === 'light'
            ? 'bg-red-50 border-2 border-red-200 text-red-600'
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}
      >
        {t(lang, 'logout')}
      </button>
    </div>
  )

  return (
    <div className={`min-h-screen flex flex-col ${
      theme === 'light' 
        ? 'bg-gradient-to-br from-blue-50 via-white to-cyan-50' 
        : 'bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950'
    }`}>
      {/* Контент */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'feed' && <FeedTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

      {/* Анимация успеха */}
      {showSuccess && (
        <SuccessAnimation lang={lang} onComplete={() => setShowSuccess(false)} />
      )}

      {/* Нижняя навигация */}
      <div className={`fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t ${
        theme === 'light'
          ? 'bg-white/95 border-blue-200'
          : 'bg-slate-900/95 border-white/10'
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
            <span className="text-[10px] font-semibold">{t(lang, 'tabHome')}</span>
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
            <span className="text-[10px] font-semibold">{t(lang, 'tabPeople')}</span>
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
            <span className="text-[10px] font-semibold">{t(lang, 'tabFeed')}</span>
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
            <span className="text-[10px] font-semibold">{t(lang, 'tabSettings')}</span>
          </button>
        </div>
      </div>

      {/* Модальное окно Бристольской шкалы */}
      {showBristolModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-950 border-2 border-cyan-500/30 rounded-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white text-center mb-1">
              {t(lang, 'bristolTitle')}
            </h2>
            <p className="text-cyan-400 text-xs text-center mb-4">
              {t(lang, 'bristolSubtitle')}
            </p>

            {/* Вертикальный список с подробными описаниями */}
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
                      {type === 1 && '⚫'}
                      {type === 2 && '🟫'}
                      {type === 3 && '🟤'}
                      {type === 4 && '🟢'}
                      {type === 5 && '🟡'}
                      {type === 6 && '🟠'}
                      {type === 7 && '🔵'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-sm">
                          {t(lang, `bristolType${type}`)}
                        </span>
                        <span className={`text-xs font-semibold ${
                          type <= 2 ? 'text-red-400' :
                          type === 3 || type === 4 ? 'text-green-400' :
                          'text-orange-400'
                        }`}>
                          {t(lang, `bristolLabel${type}`)}
                        </span>
                      </div>
                      <div className="text-gray-300 text-xs leading-relaxed">
                        {t(lang, `bristolDesc${type}`)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Кнопка пропустить */}
            <button
              onClick={handleBristolSkip}
              className="w-full py-2 bg-white/5 border border-white/20 rounded-xl text-gray-400 text-sm font-semibold hover:bg-white/10"
            >
              {t(lang, 'bristolSkip')}
            </button>
          </div>
        </div>
      )}

      {/* Модалка PWA инструкции */}
      {showPWAGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-950 border-2 border-cyan-500/30 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              {t(lang, 'pwaGuideTitle')}
            </h2>

            {/* Android инструкция */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-cyan-400 mb-3">
                {t(lang, 'pwaAndroidTitle')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaAndroidStep1')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaAndroidStep2')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaAndroidStep3')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold flex-shrink-0">
                    4
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaAndroidStep4')}</p>
                </div>
              </div>
            </div>

            {/* iOS инструкция */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-fuchsia-400 mb-3">
                {t(lang, 'pwaIOSTitle')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-fuchsia-400 font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaIOSStep1')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-fuchsia-400 font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaIOSStep2')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-fuchsia-400 font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaIOSStep3')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-fuchsia-400 font-bold flex-shrink-0">
                    4
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaIOSStep4')}</p>
                </div>
              </div>
            </div>

            {/* Кнопка закрытия */}
            <button
              onClick={() => setShowPWAGuide(false)}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
            >
              {t(lang, 'pwaClose')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
