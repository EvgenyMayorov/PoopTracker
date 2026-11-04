import { useState, useEffect, useCallback, useRef } from 'react'
import { Lang, LANG_NAMES, LANG_FLAGS, t, tArray } from './i18n'
import { ALL_USERS, FAKE_FOLLOWERS, FAKE_FOLLOWING, User } from './data'

type Tab = 'home' | 'people' | 'history' | 'settings'

interface PoopEvent {
  id: string
  timestamp: number
}

const ACHIEVEMENTS = [
  { threshold: 1, title: { ru: 'Первый залп', en: 'First Shot', zh: '第一炮', de: 'Erster Schuss', es: 'Primer tiro' }, emoji: '🎖️' },
  { threshold: 5, title: { ru: 'Регулярный', en: 'Regular', zh: '常客', de: 'Stammgast', es: 'Regular' }, emoji: '⭐' },
  { threshold: 10, title: { ru: 'Опытный', en: 'Experienced', zh: '老手', de: 'Erfahren', es: 'Experimentado' }, emoji: '🏅' },
  { threshold: 25, title: { ru: 'Мастер', en: 'Master', zh: '大师', de: 'Meister', es: 'Maestro' }, emoji: '🏆' },
  { threshold: 50, title: { ru: 'Бог туалета', en: 'Toilet God', zh: '厕所之神', de: 'Toilettengott', es: 'Dios del baño' }, emoji: '👑' },
  { threshold: 100, title: { ru: 'Трансцендентный', en: 'Transcendent', zh: '超凡', de: 'Transzendent', es: 'Trascendente' }, emoji: '🌌' },
]

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('poop_lang') as Lang) || 'ru')
  const [username, setUsername] = useState(() => localStorage.getItem('poop_username') || 'Аноним')
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState(username)
  const [events, setEvents] = useState<PoopEvent[]>(() => {
    const saved = localStorage.getItem('poop_events')
    return saved ? JSON.parse(saved) : []
  })
  const [following, setFollowing] = useState<User[]>(() => {
    const saved = localStorage.getItem('poop_following')
    return saved ? JSON.parse(saved) : FAKE_FOLLOWING
  })
  const [followers] = useState<User[]>(FAKE_FOLLOWERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotif, setShowNotif] = useState(false)
  const [currentReaction, setCurrentReaction] = useState('')
  const [showAchievement, setShowAchievement] = useState<typeof ACHIEVEMENTS[0] | null>(null)
  const [poopEmojis, setPoopEmojis] = useState<{ id: number; x: number; y: number }[]>([])
  const [peopleSection, setPeopleSection] = useState<'followers' | 'following' | 'find'>('followers')
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Persist
  useEffect(() => { localStorage.setItem('poop_events', JSON.stringify(events)) }, [events])
  useEffect(() => { localStorage.setItem('poop_following', JSON.stringify(following)) }, [following])
  useEffect(() => { localStorage.setItem('poop_lang', lang) }, [lang])

  const playSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch { /* ignore */ }
  }, [])

  const handlePoop = useCallback(() => {
    playSound()
    setEvents(prev => [{ id: Date.now().toString(), timestamp: Date.now() }, ...prev])

    const newEmojis = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 60,
      y: 30 + Math.random() * 40,
    }))
    setPoopEmojis(newEmojis)
    setTimeout(() => setPoopEmojis([]), 2000)

    setShowNotif(true)
    setTimeout(() => {
      const reactions = tArray(lang, 'notifReactions')
      setCurrentReaction(reactions[Math.floor(Math.random() * reactions.length)])
    }, 800)

    const totalEvents = events.length + 1
    const achievement = ACHIEVEMENTS.find(a => a.threshold === totalEvents)
    if (achievement) {
      setTimeout(() => setShowAchievement(achievement), 1500)
    }
  }, [events.length, playSound, lang])

  const handleSaveName = () => {
    if (tempName.trim()) {
      localStorage.setItem('poop_username', tempName.trim())
      setUsername(tempName.trim())
      setEditingName(false)
    }
  }

  const toggleFollow = (user: User) => {
    setFollowing(prev => {
      const exists = prev.find(u => u.id === user.id)
      if (exists) return prev.filter(u => u.id !== user.id)
      return [...prev, { ...user, isFollowing: true }]
    })
  }

  // Stats
  const todayCount = events.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).length
  const weekCount = events.filter(e => e.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000).length
  const avgInterval = events.length >= 2
    ? (() => {
        const intervals: number[] = []
        for (let i = 0; i < events.length - 1; i++) intervals.push(events[i].timestamp - events[i + 1].timestamp)
        const hours = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length / (1000 * 60 * 60))
        if (hours < 1) return '< 1ч'
        if (hours < 24) return `${hours}ч`
        return `${Math.round(hours / 24)}д`
      })()
    : '—'

  const currentAchievement = [...ACHIEVEMENTS].reverse().find(a => events.length >= a.threshold)
  const nextAchievement = ACHIEVEMENTS.find(a => events.length < a.threshold)

  const filteredUsers = ALL_USERS.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const notifCount = followers.length

  // ========== TABS ==========

  const HomeTab = () => (
    <div className="px-4 pt-4 pb-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-white border border-blue-100 rounded-2xl p-3 text-center shadow-sm">
          <div className="text-xl font-bold text-blue-600">{todayCount}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">{t(lang, 'today')}</div>
        </div>
        <div className="bg-white border border-blue-100 rounded-2xl p-3 text-center shadow-sm">
          <div className="text-xl font-bold text-blue-600">{weekCount}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">{t(lang, 'week')}</div>
        </div>
        <div className="bg-white border border-blue-100 rounded-2xl p-3 text-center shadow-sm">
          <div className="text-xl font-bold text-blue-600">{avgInterval}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">{t(lang, 'avgInterval')}</div>
        </div>
      </div>

      {/* Achievement progress */}
      <div className="bg-white border border-blue-100 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {currentAchievement ? (
              <>
                <span className="text-xl">{currentAchievement.emoji}</span>
                <span className="text-sm font-semibold text-gray-800">
                  {currentAchievement.title[lang]}
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-500">{t(lang, 'startJourney')}</span>
            )}
          </div>
          {nextAchievement && (
            <span className="text-xs text-gray-500">
              {t(lang, 'untilNext')}: {nextAchievement.threshold - events.length}
            </span>
          )}
        </div>
        {nextAchievement && (
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (events.length / nextAchievement.threshold) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* MAIN BUTTON */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handlePoop}
          className="relative w-56 h-56 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-2xl shadow-blue-500/30 border-4 border-blue-300/40 transition-all duration-200 hover:shadow-blue-500/50 active:scale-90 group"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10" />
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-7xl transition-transform duration-200 group-active:scale-125">
              💩
            </span>
            <span className="text-sm font-bold mt-3 text-white px-4 text-center leading-tight">
              {t(lang, 'poopButton')}
            </span>
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-blue-400/50 animate-ping" />
        </button>
      </div>

      {/* Total */}
      <div className="text-center mb-4">
        <span className="text-gray-500 text-sm">
          {t(lang, 'totalPoops')}: <span className="font-bold text-blue-600">{events.length}</span> {t(lang, 'times')}
        </span>
      </div>

      {/* Subscribers notification */}
      {showNotif && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center animate-slideDown">
          <p className="text-sm font-bold text-blue-700">
            ✅ {t(lang, 'notifSent')} {notifCount} {t(lang, 'subscribers')}!
          </p>
          {currentReaction && (
            <p className="text-xs text-blue-600 mt-1">{currentReaction}</p>
          )}
        </div>
      )}
    </div>
  )

  const PeopleTab = () => (
    <div className="px-4 pt-4 pb-6">
      {/* Section tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setPeopleSection('followers')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            peopleSection === 'followers' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          {t(lang, 'followers')} ({followers.length})
        </button>
        <button
          onClick={() => setPeopleSection('following')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            peopleSection === 'following' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          {t(lang, 'following')} ({following.length})
        </button>
        <button
          onClick={() => setPeopleSection('find')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            peopleSection === 'find' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
          }`}
        >
          🔍 {t(lang, 'findPeople')}
        </button>
      </div>

      {/* Followers */}
      {peopleSection === 'followers' && (
        <div className="space-y-2">
          {followers.map(user => (
            <div key={user.id} className="bg-white border border-blue-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <span className="text-3xl">{user.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{user.name}</div>
                <div className="text-xs text-gray-500 truncate">{user.bio}</div>
                <div className="text-[10px] text-blue-500 mt-0.5">{user.poopCount} 💩</div>
              </div>
              <div className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-lg">
                ✓ {t(lang, 'followers')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Following */}
      {peopleSection === 'following' && (
        <div className="space-y-2">
          {following.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">👀</div>
              <p className="text-sm">{t(lang, 'noResults')}</p>
            </div>
          ) : (
            following.map(user => (
              <div key={user.id} className="bg-white border border-blue-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                <span className="text-3xl">{user.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{user.name}</div>
                  <div className="text-xs text-gray-500 truncate">{user.bio}</div>
                  <div className="text-[10px] text-blue-500 mt-0.5">{user.poopCount} 💩</div>
                </div>
                <button
                  onClick={() => toggleFollow(user)}
                  className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {t(lang, 'unfollow')}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Find people */}
      {peopleSection === 'find' && (
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t(lang, 'searchPlaceholder')}
            className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 mb-3"
          />
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-sm">{t(lang, 'noResults')}</p>
              </div>
            ) : (
              filteredUsers.map(user => {
                const isFollowing = following.some(f => f.id === user.id)
                return (
                  <div key={user.id} className="bg-white border border-blue-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <span className="text-3xl">{user.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.bio}</div>
                      <div className="text-[10px] text-blue-500 mt-0.5">{user.poopCount} 💩</div>
                    </div>
                    <button
                      onClick={() => toggleFollow(user)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        isFollowing
                          ? 'text-white bg-red-500 hover:bg-red-600'
                          : 'text-white bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      {isFollowing ? t(lang, 'unfollow') : t(lang, 'follow')}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )

  const HistoryTab = () => (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">{t(lang, 'historyTitle')}</h2>
        {events.length > 0 && (
          <button
            onClick={() => {
              if (confirm(t(lang, 'clearConfirm'))) {
                setEvents([])
                localStorage.removeItem('poop_events')
              }
            }}
            className="text-xs text-red-500 font-medium hover:text-red-600"
          >
            🗑️ {t(lang, 'clearHistory')}
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🫥</div>
          <p className="text-sm">{t(lang, 'emptyHistory')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(event => {
            const date = new Date(event.timestamp)
            return (
              <div key={event.id} className="bg-white border border-blue-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-xl">
                  💩
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">
                    {date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : lang, {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {date.toLocaleTimeString(lang === 'zh' ? 'zh-CN' : lang, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="text-xs text-blue-500 font-medium">
                  #{events.indexOf(event) + 1}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const SettingsTab = () => (
    <div className="px-4 pt-4 pb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">{t(lang, 'settingsTitle')}</h2>

      {/* Account */}
      <div className="bg-white border border-blue-100 rounded-2xl p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          👤 {t(lang, 'account')}
        </h3>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-2xl">
            💩
          </div>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  className="bg-gray-50 border border-blue-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 w-40 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <div className="text-base font-bold text-gray-800">@{username}</div>
                <div className="text-xs text-gray-500">{events.length} 💩 {t(lang, 'times')}</div>
              </div>
            )}
          </div>
        </div>

        {editingName ? (
          <div className="flex gap-2">
            <button
              onClick={handleSaveName}
              className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors"
            >
              {t(lang, 'save')}
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              {t(lang, 'cancel')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setTempName(username); setEditingName(true) }}
            className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
          >
            ✏️ {t(lang, 'editProfile')}
          </button>
        )}
      </div>

      {/* Stats summary */}
      <div className="bg-white border border-blue-100 rounded-2xl p-4 mb-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          📊 {t(lang, 'statsTitle')}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t(lang, 'totalEvents')}</span>
            <span className="text-sm font-bold text-blue-600">{events.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t(lang, 'followers')}</span>
            <span className="text-sm font-bold text-blue-600">{followers.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t(lang, 'following')}</span>
            <span className="text-sm font-bold text-blue-600">{following.length}</span>
          </div>
          <div className="flex justify-between items-center border-t border-gray-100 pt-3">
            <span className="text-sm text-gray-600">{t(lang, 'dailyRecord')}</span>
            <span className="text-sm font-bold text-blue-600">
              {(() => {
                const dayMap: Record<string, number> = {}
                events.forEach(e => {
                  const day = new Date(e.timestamp).toDateString()
                  dayMap[day] = (dayMap[day] || 0) + 1
                })
                return Math.max(0, ...Object.values(dayMap))
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          🌐 {t(lang, 'language')}
        </h3>
        <div className="space-y-2">
          {(Object.keys(LANG_NAMES) as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                lang === l
                  ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                  : 'bg-gray-50 border-2 border-transparent text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{LANG_FLAGS[l]}</span>
              <span className="text-sm font-medium flex-1 text-left">{LANG_NAMES[l]}</span>
              {lang === l && <span className="text-blue-500">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center mt-6 text-gray-400 text-xs">
        💩 {t(lang, 'appName')} {t(lang, 'version')} — {t(lang, 'footer')}
      </div>
    </div>
  )

  // ========== RENDER ==========

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white relative">
      {/* Background decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-indigo-100/30 rounded-full blur-3xl" />
      </div>

      {/* Flying poop emojis */}
      {poopEmojis.map(emoji => (
        <div
          key={emoji.id}
          className="fixed text-4xl pointer-events-none z-50 animate-flyAway"
          style={{ left: `${emoji.x}%`, top: `${emoji.y}%` }}
        >
          💩
        </div>
      ))}

      {/* Achievement popup */}
      {showAchievement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowAchievement(null)}
        >
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 text-center max-w-xs mx-4 animate-bounceIn shadow-2xl shadow-blue-500/30">
            <div className="text-6xl mb-4">{showAchievement.emoji}</div>
            <h2 className="text-xl font-bold text-white mb-2">{t(lang, 'achievement')}</h2>
            <h3 className="text-lg font-bold text-blue-100">{showAchievement.title[lang]}</h3>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-blue-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            💩 {t(lang, 'appName')}
          </h1>
          <div className="text-xs text-gray-500">@{username}</div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-lg mx-auto pb-24">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'people' && <PeopleTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-blue-100">
        <div className="max-w-lg mx-auto flex">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex-1 flex flex-col items-center py-3 transition-colors ${
              activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl mb-0.5">🏠</span>
            <span className="text-[10px] font-semibold">{t(lang, 'tabHome')}</span>
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`flex-1 flex flex-col items-center py-3 transition-colors ${
              activeTab === 'people' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl mb-0.5">👥</span>
            <span className="text-[10px] font-semibold">{t(lang, 'tabPeople')}</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex flex-col items-center py-3 transition-colors ${
              activeTab === 'history' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl mb-0.5">📋</span>
            <span className="text-[10px] font-semibold">{t(lang, 'tabHistory')}</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex flex-col items-center py-3 transition-colors ${
              activeTab === 'settings' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl mb-0.5">⚙️</span>
            <span className="text-[10px] font-semibold">{t(lang, 'tabSettings')}</span>
          </button>
        </div>
        {/* Safe area for iOS */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  )
}

export default App
