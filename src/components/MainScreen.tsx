import { useState, useEffect, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { Lang, LANG_NAMES, LANG_FLAGS, t } from '../i18n'
import { PWAInstallBanner } from './PWAInstallBanner'

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

  // Загрузка событий
  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) setEvents(data)
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
    
    if (data) setFriendsEvents(data)
  }, [following])

  useEffect(() => {
    fetchEvents()
    fetchFollowers()
    fetchFollowing()
    fetchNotifications()
  }, [fetchEvents, fetchFollowers, fetchFollowing, fetchNotifications])

  useEffect(() => {
    fetchFriendsEvents()
  }, [fetchFriendsEvents])

  // Realtime подписка на события друзей
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
    }
    setShowBristolModal(false)
    setCurrentEventId(null)
    setSelectedType(null)
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

  // Статистика
  const todayCount = events.filter(e => 
    new Date(e.created_at).toDateString() === new Date().toDateString()
  ).length
  const weekCount = events.filter(e => 
    new Date(e.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length

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
              <p className="text-gray-400 font-semibold">{t(lang, 'feedEmpty')}</p>
              <p className="text-gray-500 text-sm mt-1">{t(lang, 'feedEmptyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friendsEvents.map(event => (
                <div key={event.id} className="bg-white/5 border border-fuchsia-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-purple-500 rounded-full flex items-center justify-center text-lg">
                      💩
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">
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
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(event.created_at)}
                    </div>
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
              <p className="text-gray-400 font-semibold">{t(lang, 'myEventsEmpty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className="bg-white/5 border border-cyan-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg">
                      💩
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{profile.username}</div>
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
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(event.created_at)}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
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
        <div className="bg-white/5 border border-blue-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{todayCount}</div>
          <div className="text-xs text-gray-400">{t(lang, 'today')}</div>
        </div>
        <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">{weekCount}</div>
          <div className="text-xs text-gray-400">{t(lang, 'week')}</div>
        </div>
        <div className="bg-white/5 border border-pink-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-pink-400">{events.length}</div>
          <div className="text-xs text-gray-400">{t(lang, 'total')}</div>
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

      {/* Уведомления */}
      {notifications.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            🔔 {t(lang, 'notification')}
          </h3>
          <div className="space-y-2">
            {notifications.slice(0, 5).map(notif => (
              <div key={notif.id} className="bg-white/5 border border-cyan-500/20 rounded-xl p-3">
                <div className="text-sm text-white">
                  💩 {t(lang, 'friendPooped').replace('{name}', notif.friend_username)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
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
      <h2 className="text-xl font-bold text-white mb-6">{t(lang, 'settings')}</h2>

      {/* Профиль */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          👤 {t(lang, 'account')}
        </h3>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          {editingUsername ? (
            <div className="space-y-3">
              <input
                type="text"
                value={tempUsername}
                onChange={e => setTempUsername(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-blue-500/30 rounded-lg text-white focus:outline-none focus:border-blue-400"
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
                  className="flex-1 py-2 bg-gray-500/20 border border-gray-500/30 rounded-lg text-gray-300 font-semibold"
                >
                  {t(lang, 'cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-semibold">{profile.username}</div>
                <div className="text-xs text-gray-500">{profile.id.substring(0, 8)}...</div>
              </div>
              <button
                onClick={() => setEditingUsername(true)}
                className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-semibold"
              >
                {t(lang, 'editProfile')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Язык */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          🌐 {t(lang, 'language')}
        </h3>
        <div className="space-y-2">
          {(Object.keys(LANG_NAMES) as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => {
                setLang(l)
                localStorage.setItem('poop_lang', l)
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                lang === l
                  ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                  : 'bg-white/5 border-2 border-transparent text-gray-300 hover:bg-white/10'
              }`}
            >
              <span className="text-xl">{LANG_FLAGS[l]}</span>
              <span className="flex-1 text-left font-medium">{LANG_NAMES[l]}</span>
              {lang === l && <span>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Статистика */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          📊 {t(lang, 'stats')}
        </h3>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">{t(lang, 'totalEvents')}</span>
            <span className="text-white font-semibold">{events.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">{t(lang, 'dailyRecord')}</span>
            <span className="text-white font-semibold">
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

      {/* Памятка по PWA */}
      <div className="mb-6">
        <button
          onClick={() => setShowPWAGuide(true)}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-semibold">{t(lang, 'pwaSettingsTitle')}</div>
              <div className="text-gray-400 text-sm">{t(lang, 'pwaSettingsDesc')}</div>
            </div>
            <span className="text-2xl">📲</span>
          </div>
        </button>
      </div>

      {/* Выход */}
      <button
        onClick={onLogout}
        className="w-full py-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-semibold"
      >
        {t(lang, 'logout')}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col">
      {/* Контент */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'feed' && <FeedTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

      {/* Нижняя навигация */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-1 ${
              activeTab === 'home' ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">🏠</span>
            <span className="text-[10px] font-semibold">{t(lang, 'tabHome')}</span>
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-1 ${
              activeTab === 'people' ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">👥</span>
            <span className="text-[10px] font-semibold">{t(lang, 'tabPeople')}</span>
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-1 ${
              activeTab === 'feed' ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">📰</span>
            <span className="text-[10px] font-semibold">{t(lang, 'tabFeed')}</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all flex-1 ${
              activeTab === 'settings' ? 'text-cyan-400' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">⚙️</span>
            <span className="text-[10px] font-semibold">{t(lang, 'tabSettings')}</span>
          </button>
        </div>
      </div>

      {/* Модальное окно Бристольской шкалы */}
      {showBristolModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-950 border-2 border-cyan-500/30 rounded-3xl p-5 w-full max-w-sm">
            <h2 className="text-xl font-bold text-white text-center mb-1">
              {t(lang, 'bristolTitle')}
            </h2>
            <p className="text-cyan-400 text-xs text-center mb-4">
              {t(lang, 'bristolSubtitle')}
            </p>

            {/* Компактная сетка кнопок */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[1, 2, 3, 4, 5, 6, 7].map(type => (
                <button
                  key={type}
                  onClick={() => handleBristolSelect(type)}
                  className={`p-2 rounded-xl border-2 transition-all active:scale-95 ${
                    type <= 2 ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20' :
                    type === 3 || type === 4 ? 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20' :
                    'border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <div className="text-2xl mb-1">
                      {type === 1 && '⚫'}
                      {type === 2 && '🟫'}
                      {type === 3 && '🟤'}
                      {type === 4 && '🟢'}
                      {type === 5 && '🟡'}
                      {type === 6 && '🟠'}
                      {type === 7 && '🔵'}
                    </div>
                    <div className="text-white font-bold text-xs">
                      {t(lang, `bristolType${type}`)}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${
                      type <= 2 ? 'text-red-400' :
                      type === 3 || type === 4 ? 'text-green-400' :
                      'text-orange-400'
                    }`}>
                      {t(lang, `bristolLabel${type}`)}
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
