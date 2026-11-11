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
  const [avatar, setAvatar] = useState<string>(() => 
    localStorage.getItem('poop_avatar') || '💩'
  )
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)
  
  // Список эмодзи для аватарки
  const avatarEmojis = ['💩', '🎉', '🔥', '⭐', '🌟', '✨', '💎', '🎨', '🎯', '🚀', '🌈', '🦄', '🐱', '🐶', '🦊', '🐼', '🐨', '🦁', '🐸', '🐵']

  // Вспомогательная функция для отправки уведомлений
  const showNotification = async (title: string, options: NotificationOptions) => {
    try {
      // Проверяем, есть ли Service Worker registration (PWA режим)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, options)
        console.log('[Notification] Отправлено через ServiceWorker')
      } else {
        // Fallback для обычного браузера
        new Notification(title, options)
        console.log('[Notification] Отправлено через Notification API')
      }
    } catch (error: any) {
      console.error('[Notification] Ошибка отправки:', error)
      throw error
    }
  }

  // Загрузка событий
  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (error) {
      console.error('[FetchEvents] Ошибка загрузки:', error)
      return
    }
    
    if (data) {
      console.log('[FetchEvents] Загруженные события:', data)
      console.log('[FetchEvents] Первое событие:', data[0])
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

  // Автоматическая прокрутка к подсвеченной записи
  useEffect(() => {
    if (highlightedEventId) {
      const element = document.getElementById(`event-${highlightedEventId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Убираем подсветку через 3 секунды
        const timer = setTimeout(() => {
          setHighlightedEventId(null)
        }, 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [highlightedEventId, activeTab, feedTab])

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
                try {
                  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    const registration = await navigator.serviceWorker.ready
                    await registration.showNotification(t(lang, 'notification'), {
                      body: t(lang, 'friendPooped').replace('{name}', friendProfile.username),
                      icon: './icon-light.svg'
                    })
                  } else {
                    new Notification(t(lang, 'notification'), {
                      body: t(lang, 'friendPooped').replace('{name}', friendProfile.username),
                      icon: './icon-light.svg'
                    })
                  }
                } catch (error) {
                  console.error('[Notification] Ошибка отправки уведомления другу:', error)
                }
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
    console.log('[HandlePoop] === НАЧАЛО СОЗДАНИЯ СОБЫТИЯ ===')
    console.log('[HandlePoop] profile.id:', profile.id)
    
    try {
      console.log('[HandlePoop] Отправка запроса на создание события...')
      
      const { data, error } = await supabase
        .from('events')
        .insert({ user_id: profile.id })
        .select()
        .single()
      
      console.log('[HandlePoop] Ответ от Supabase:')
      console.log('[HandlePoop] - data:', data)
      console.log('[HandlePoop] - error:', error)
      
      if (error) {
        console.error('[HandlePoop] ❌ Ошибка создания события:', error)
        console.error('[HandlePoop] Код ошибки:', error.code)
        console.error('[HandlePoop] Сообщение:', error.message)
        alert(`Ошибка создания события: ${error.message}`)
        return
      }
      
      if (data) {
        console.log('[HandlePoop] ✅ Событие успешно создано!')
        console.log('[HandlePoop] ID события:', data.id)
        console.log('[HandlePoop] Тип ID:', typeof data.id)
        
        setCurrentEventId(data.id)
        console.log('[HandlePoop] currentEventId установлен в state:', data.id)
        
        // Небольшая задержка для гарантии обновления state
        setTimeout(() => {
          console.log('[HandlePoop] Открытие модального окна выбора типа...')
          setShowBristolModal(true)
          setSelectedType(null)
        }, 100)
      } else {
        console.error('[HandlePoop] ❌ Данные не возвращены после создания события')
        alert('Ошибка: событие создано, но данные не возвращены')
      }
      
      await fetchEvents()
      
    } catch (err) {
      console.error('[HandlePoop] ❌ Исключение:', err)
      alert(`Ошибка: ${err}`)
    }
    
    console.log('[HandlePoop] === КОНЕЦ СОЗДАНИЯ СОБЫТИЯ ===')
  }

  // Сохранение типа стула по Бристольской шкале (автоматически при выборе)
  const handleBristolSelect = async (type: number) => {
    console.log('[BristolSelect] === НАЧАЛО СОХРАНЕНИЯ ТИПА ===')
    console.log('[BristolSelect] Выбран тип:', type)
    console.log('[BristolSelect] currentEventId:', currentEventId)
    console.log('[BristolSelect] Тип currentEventId:', typeof currentEventId)
    
    if (!currentEventId) {
      console.error('[BristolSelect] ❌ ОШИБКА: currentEventId не установлен!')
      alert('Ошибка: не удалось сохранить тип. currentEventId не установлен.')
      return
    }
    
    try {
      console.log('[BristolSelect] Отправка запроса на обновление...')
      console.log('[BristolSelect] Запрос: UPDATE events SET bristol_type =', type, 'WHERE id =', currentEventId)
      
      const { data, error } = await supabase
        .from('events')
        .update({ bristol_type: type })
        .eq('id', currentEventId)
        .select()
      
      console.log('[BristolSelect] Ответ от Supabase:')
      console.log('[BristolSelect] - data:', data)
      console.log('[BristolSelect] - error:', error)
      
      if (error) {
        console.error('[BristolSelect] ❌ Ошибка обновления:', error)
        console.error('[BristolSelect] Код ошибки:', error.code)
        console.error('[BristolSelect] Сообщение:', error.message)
        console.error('[BristolSelect] Детали:', error.details)
        console.error('[BristolSelect] Подсказка:', error.hint)
        alert(`Ошибка сохранения: ${error.message}`)
      } else if (data && data.length > 0) {
        console.log('[BristolSelect] ✅ Успешно обновлено!')
        console.log('[BristolSelect] Обновлённая запись:', data[0])
      } else {
        console.warn('[BristolSelect] ⚠️ Обновление выполнено, но данные не возвращены')
        console.warn('[BristolSelect] Это может означать, что запись не найдена или RLS блокирует обновление')
      }
      
      // Обновляем список событий
      console.log('[BristolSelect] Обновление списка событий...')
      await fetchEvents()
      await fetchFriendsEvents()
      
    } catch (err) {
      console.error('[BristolSelect] ❌ Исключение:', err)
      alert(`Ошибка: ${err}`)
    }
    
    setShowBristolModal(false)
    setCurrentEventId(null)
    setSelectedType(null)
    setEditingEventId(null)
    
    // Показываем анимацию успеха только для новых записей
    if (!editingEventId) {
      setShowSuccess(true)
    }
    
    console.log('[BristolSelect] === КОНЕЦ СОХРАНЕНИЯ ТИПА ===')
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

  // Сохранить аватарку
  const handleSaveAvatar = (emoji: string) => {
    setAvatar(emoji)
    localStorage.setItem('poop_avatar', emoji)
    setShowAvatarPicker(false)
  }

  // Переход к записи из главной страницы
  const handleEventClick = (eventId: string) => {
    setHighlightedEventId(eventId)
    setActiveTab('feed')
    setFeedTab('my')
  }

  // Обновить настройки уведомлений
  const handleNotifSettingChange = (key: string, value: boolean) => {
    const newSettings = { ...notifSettings, [key]: value }
    setNotifSettings(newSettings)
    localStorage.setItem('poop_notif_settings', JSON.stringify(newSettings))
  }

  // Отправить тестовое уведомление
  const handleTestNotification = async () => {
    console.log('[Notification] Тест уведомления запущен')
    
    if (!('Notification' in window)) {
      alert('Ваш браузер не поддерживает уведомления')
      return
    }

    console.log('[Notification] Текущий статус:', Notification.permission)

    if (Notification.permission === 'granted') {
      console.log('[Notification] Отправка уведомления...')
      try {
        await showNotification(t(lang, 'testNotification'), {
          body: t(lang, 'testNotificationText'),
          icon: './icon-light.svg'
        })
        console.log('[Notification] Уведомление отправлено')
      } catch (error: any) {
        console.error('[Notification] Ошибка отправки:', error)
        alert('Ошибка при отправке уведомления: ' + (error.message || 'Неизвестная ошибка'))
      }
    } else if (Notification.permission === 'denied') {
      console.log('[Notification] Уведомления заблокированы пользователем')
      alert('Уведомления заблокированы. Разрешите уведомления в настройках браузера.')
    } else {
      console.log('[Notification] Запрос разрешения...')
      try {
        const permission = await Notification.requestPermission()
        console.log('[Notification] Результат запроса:', permission)
        
        if (permission === 'granted') {
          await showNotification(t(lang, 'testNotification'), {
            body: t(lang, 'testNotificationText'),
            icon: './icon-light.svg'
          })
          console.log('[Notification] Уведомление отправлено после разрешения')
        } else {
          alert('Вы отклонили запрос на уведомления')
        }
      } catch (error: any) {
        console.error('[Notification] Ошибка запроса разрешения:', error)
        alert('Ошибка при запросе разрешения: ' + (error.message || 'Неизвестная ошибка'))
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
                      <div className={`text-sm ${theme === 'light' ? 'text-gray-800' : 'text-fuchsia-400'}`}>
                        {t(lang, 'friendPooped').replace('{name}', event.profiles?.username || '')}
                      </div>
                      {event.bristol_type && (
                        <div className={`text-xs mt-1 ${
                          event.bristol_type <= 2 ? 'text-red-400' :
                          event.bristol_type === 3 || event.bristol_type === 4 ? 'text-green-400' :
                          'text-orange-400'
                        }`}>
                          {t(lang, `bristolLabel${event.bristol_type}`)} - {t(lang, `bristolDesc${event.bristol_type}`)}
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
                <div 
                  key={event.id} 
                  id={`event-${event.id}`}
                  className={`rounded-xl p-4 transition-all ${
                    highlightedEventId === event.id
                      ? theme === 'light'
                        ? 'bg-blue-100 border-4 border-blue-500 shadow-lg shadow-blue-500/30 scale-105'
                        : 'bg-blue-500/20 border-4 border-blue-400 shadow-lg shadow-blue-500/50 scale-105'
                      : theme === 'light'
                        ? 'bg-white border-2 border-cyan-200'
                        : 'bg-white/5 border border-cyan-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg">
                      💩
                    </div>
                    <div className="flex-1">
                      <div className={`font-semibold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>{profile.username}</div>
                      <div className={`text-sm ${theme === 'light' ? 'text-gray-800' : 'text-cyan-400'}`}>{t(lang, 'poopButton')}</div>
                      {event.bristol_type && (
                        <div className={`text-xs mt-1 ${
                          event.bristol_type <= 2 ? 'text-red-400' :
                          event.bristol_type === 3 || event.bristol_type === 4 ? 'text-green-400' :
                          'text-orange-400'
                        }`}>
                          {t(lang, `bristolLabel${event.bristol_type}`)} - {t(lang, `bristolDesc${event.bristol_type}`)}
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
            ? 'bg-white border-2 border-cyan-200' 
            : 'bg-white/5 border border-purple-500/20'
        }`}>
          <div className={`text-2xl font-bold ${theme === 'light' ? 'text-cyan-600' : 'text-purple-400'}`}>{weekCount}</div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t(lang, 'week')}</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${
          theme === 'light' 
            ? 'bg-white border-2 border-sky-200' 
            : 'bg-white/5 border border-pink-500/20'
        }`}>
          <div className={`text-2xl font-bold ${theme === 'light' ? 'text-sky-600' : 'text-pink-400'}`}>{events.length}</div>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{t(lang, 'total')}</div>
        </div>
      </div>

      {/* Круглая кнопка */}
      <div className="flex justify-center my-6">
        <button
          onClick={handlePoop}
          className={`relative w-48 h-48 rounded-full shadow-2xl border-4 transition-all duration-200 hover:scale-105 active:scale-90 group ${
            theme === 'light'
              ? 'bg-gradient-to-br from-blue-400 via-cyan-400 to-sky-400 shadow-blue-500/40 border-blue-300/50 hover:shadow-blue-500/60'
              : 'bg-gradient-to-br from-cyan-500 via-fuchsia-500 to-purple-500 shadow-fuchsia-500/40 border-cyan-400/30 hover:shadow-fuchsia-500/60'
          }`}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10" />
          <div className="flex flex-col items-center justify-center h-full">
            <svg className="w-20 h-20 text-white transition-transform duration-200 group-active:scale-125" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {/* Какашка - три яруса */}
              <path d="M7 21h10c1.1 0 2-.9 2-2v-1c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
              <path d="M8 16h8c1.1 0 2-.9 2-2v-1c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
              <path d="M9 11h6c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
              {/* Завиток сверху */}
              <path d="M11 6c0-1.1.9-2 2-2s2 .9 2 2" />
              {/* Глаза */}
              <circle cx="10" cy="14" r="0.5" fill="currentColor" />
              <circle cx="14" cy="14" r="0.5" fill="currentColor" />
              {/* Улыбка */}
              <path d="M10 16c0.5 0.5 1 0.5 1.5 0" />
              <path d="M12.5 16c0.5 0.5 1 0.5 1.5 0" />
            </svg>
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

      {/* Последние 7 записей */}
      {events.length > 0 && (
        <div className={`mb-6 p-4 rounded-2xl ${
          theme === 'light' 
            ? 'bg-white border-2 border-blue-200' 
            : 'bg-white/5 border border-white/10'
        }`}>
          <h3 className={`text-sm font-semibold mb-3 ${
            theme === 'light' ? 'text-gray-600' : 'text-gray-400'
          }`}>
            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Последние записи
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
                      <div className={`text-sm font-medium ${
                        theme === 'light' ? 'text-gray-800' : 'text-white'
                      }`}>
                        {new Date(event.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </div>
                      <div className={`text-xs ${
                        theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {new Date(event.created_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  {event.bristol_type && (
                    <div className={`text-xs px-2 py-1 rounded ${
                      event.bristol_type <= 2 ? 'bg-red-100 text-red-700' :
                      event.bristol_type <= 4 ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {t(lang, `bristolType${event.bristol_type}`)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
          <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {t(lang, 'account')}
        </h3>
        <div className={`rounded-xl p-4 ${
          theme === 'light'
            ? 'bg-white border-2 border-blue-200'
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
                    ? 'bg-blue-50 border-2 border-blue-200 text-gray-800'
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
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="text-4xl hover:scale-110 transition-transform"
                >
                  {avatar}
                </button>
                <div>
                  <div className={`font-semibold ${
                    theme === 'light' ? 'text-gray-800' : 'text-white'
                  }`}>{profile.username}</div>
                  <div className={`text-xs ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-500'
                  }`}>{profile.id.substring(0, 8)}...</div>
                </div>
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
          
          {/* Выбор аватарки */}
          {showAvatarPicker && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className={`text-sm mb-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                Выберите аватарку:
              </p>
              <div className="grid grid-cols-5 gap-2">
                {avatarEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSaveAvatar(emoji)}
                    className={`text-3xl p-2 rounded-lg transition-all hover:scale-110 ${
                      avatar === emoji
                        ? theme === 'light'
                          ? 'bg-blue-100 border-2 border-blue-400'
                          : 'bg-blue-500/20 border-2 border-blue-400'
                        : theme === 'light'
                          ? 'bg-gray-50 border-2 border-gray-200'
                          : 'bg-white/5 border-2 border-white/10'
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

      {/* Тема */}
      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-400'
        }`}>
          <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          {t(lang, 'theme')}
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
          <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          {t(lang, 'language')}
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
          <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {t(lang, 'notificationSettings')}
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
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t(lang, 'notifFriendPooped')}
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
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              {t(lang, 'notifFriendReaction')}
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
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {t(lang, 'notifFriendComment')}
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
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              {t(lang, 'notifFriendFollowed')}
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
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
        ? 'bg-gradient-to-br from-sky-50 via-white to-blue-50' 
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
