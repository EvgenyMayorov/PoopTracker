import { useState, useEffect, useCallback, useRef } from 'react'

// Types
interface PoopEvent {
  id: string
  timestamp: number
  duration?: number
}

interface Subscriber {
  id: string
  name: string
  avatar: string
  notified: boolean
  readAt?: number
}

// Fake subscribers
const FAKE_SUBSCRIBERS: Omit<Subscriber, 'notified' | 'readAt'>[] = [
  { id: '1', name: 'Мама', avatar: '👩' },
  { id: '2', name: 'Братан', avatar: '🧔' },
  { id: '3', name: 'Коллега Серёга', avatar: '👨‍💻' },
  { id: '4', name: 'Бывшая', avatar: '💅' },
  { id: '5', name: 'Начальник', avatar: '🤵' },
  { id: '6', name: 'Кот', avatar: '🐱' },
  { id: '7', name: 'Доставка еды', avatar: '🛵' },
  { id: '8', name: 'Батя', avatar: '👴' },
  { id: '9', name: 'Лучшая подруга', avatar: '👧' },
  { id: '10', name: 'Тренер', avatar: '🏋️' },
  { id: '11', name: 'Сосед', avatar: '🧑‍🦰' },
  { id: '12', name: 'Бот Олег', avatar: '🤖' },
]

const ACHIEVEMENTS = [
  { threshold: 1, title: 'Первый залп', emoji: '🎖️', description: 'Первое событие зафиксировано!' },
  { threshold: 5, title: 'Регулярный', emoji: '⭐', description: '5 раз — система работает!' },
  { threshold: 10, title: 'Опытный', emoji: '🏅', description: '10 раз — ты профессионал!' },
  { threshold: 25, title: 'Мастер', emoji: '🏆', description: '25 раз — ты легенда!' },
  { threshold: 50, title: 'Бог туалета', emoji: '👑', description: '50 раз — непостижимо!' },
  { threshold: 100, title: 'Трансцендентный', emoji: '🌌', description: '100 раз — ты вышел за пределы!' },
]

const REACTIONS = [
  '👍 Подписчик одобряет',
  '😢 Подписчик прослезился',
  '🎉 Подписчик празднует',
  '🤢 Подписчику стало плохо',
  '😍 Подписчик в восторге',
  '💀 Подписчик не выжил',
  '🙏 Подписчик благодарен за новость',
  '📸 Подписчик сделал скриншот',
  '🔥 ОГОНЬ!',
  '😱 Подписчик в шоке',
]

function App() {
  const [username, setUsername] = useState(() => localStorage.getItem('poop_username') || '')
  const [isSetup, setIsSetup] = useState(() => !!localStorage.getItem('poop_username'))
  const [events, setEvents] = useState<PoopEvent[]>(() => {
    const saved = localStorage.getItem('poop_events')
    return saved ? JSON.parse(saved) : []
  })
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [showNotif, setShowNotif] = useState(false)
  const [currentReaction, setCurrentReaction] = useState('')
  const [isPressed, setIsPressed] = useState(false)
  const [showAchievement, setShowAchievement] = useState<typeof ACHIEVEMENTS[0] | null>(null)
  const [tempName, setTempName] = useState(username)
  const [poopCount, setPoopCount] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Save events to localStorage
  useEffect(() => {
    localStorage.setItem('poop_events', JSON.stringify(events))
  }, [events])

  // Play a funny sound
  const playSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      }
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
    } catch {
      // Audio not supported
    }
  }, [])

  // Handle the main button
  const handlePoop = useCallback(() => {
    if (isPressed) return
    setIsPressed(true)
    playSound()

    const newEvent: PoopEvent = {
      id: Date.now().toString(),
      timestamp: Date.now(),
    }

    setEvents(prev => [newEvent, ...prev])
    setPoopCount(prev => prev + 1)

    // Notify subscribers with staggered animation
    const newSubs = FAKE_SUBSCRIBERS.map(s => ({
      ...s,
      notified: false,
      readAt: undefined,
    }))
    setSubscribers(newSubs)
    setShowNotif(true)

    // Stagger subscriber notifications
    newSubs.forEach((_, i) => {
      setTimeout(() => {
        setSubscribers(prev =>
          prev.map((s, idx) =>
            idx === i ? { ...s, notified: true, readAt: Date.now() } : s
          )
        )
      }, 300 + i * 200)
    })

    // Show random reaction
    setTimeout(() => {
      setCurrentReaction(REACTIONS[Math.floor(Math.random() * REACTIONS.length)])
    }, 1000)

    // Check achievements
    const totalEvents = events.length + 1
    const achievement = ACHIEVEMENTS.find(a => a.threshold === totalEvents)
    if (achievement) {
      setTimeout(() => setShowAchievement(achievement), 2000)
    }

    setTimeout(() => setIsPressed(false), 500)
  }, [isPressed, events.length, playSound])

  // Setup
  const handleSetup = () => {
    if (tempName.trim()) {
      localStorage.setItem('poop_username', tempName.trim())
      setUsername(tempName.trim())
      setIsSetup(true)
    }
  }

  const handleChangeName = () => {
    setIsSetup(false)
    setTempName(username)
  }

  // Stats
  const todayCount = events.filter(e => {
    const today = new Date()
    const eventDate = new Date(e.timestamp)
    return eventDate.toDateString() === today.toDateString()
  }).length

  const weekCount = events.filter(e => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return e.timestamp > weekAgo
  }).length

  const avgInterval = events.length >= 2
    ? (() => {
        const intervals: number[] = []
        for (let i = 0; i < events.length - 1; i++) {
          intervals.push(events[i].timestamp - events[i + 1].timestamp)
        }
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
        const hours = Math.round(avg / (1000 * 60 * 60))
        if (hours < 1) return '< 1 часа'
        if (hours < 24) return `${hours} ч.`
        return `${Math.round(hours / 24)} дн.`
      })()
    : '—'

  const currentAchievement = [...ACHIEVEMENTS].reverse().find(a => events.length >= a.threshold)
  const nextAchievement = ACHIEVEMENTS.find(a => events.length < a.threshold)

  // Setup screen
  if (!isSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-amber-950 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 max-w-md w-full text-center">
          <div className="text-7xl mb-6 animate-bounce">💩</div>
          <h1 className="text-3xl font-bold text-white mb-2">Добро пожаловать!</h1>
          <p className="text-amber-200 mb-8">
            Введите ваше имя, чтобы подписчики знали, от кого пришла новость
          </p>
          <input
            type="text"
            value={tempName}
            onChange={e => setTempName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetup()}
            placeholder="Ваше имя..."
            className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white text-lg placeholder-white/40 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 mb-4 transition-all"
            autoFocus
          />
          <button
            onClick={handleSetup}
            disabled={!tempName.trim()}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl text-xl font-bold text-amber-950 hover:from-amber-400 hover:to-yellow-400 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          >
            Начать 🚀
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-yellow-900 to-amber-950 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl opacity-10 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${5 + Math.random() * 10}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          >
            💩
          </div>
        ))}
      </div>

      {/* Achievement popup */}
      {showAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setShowAchievement(null)}>
          <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-3xl p-8 text-center max-w-sm mx-4 animate-bounceIn shadow-2xl shadow-yellow-500/30">
            <div className="text-6xl mb-4">{showAchievement.emoji}</div>
            <h2 className="text-2xl font-bold text-amber-950 mb-2">Достижение!</h2>
            <h3 className="text-xl font-bold text-amber-900 mb-2">{showAchievement.title}</h3>
            <p className="text-amber-800">{showAchievement.description}</p>
          </div>
        </div>
      )}

      {/* Notification overlay */}
      {showNotif && (
        <div className="fixed top-4 left-4 right-4 z-40 animate-slideDown">
          <div className="bg-green-500/90 backdrop-blur-lg rounded-2xl p-4 text-center shadow-xl shadow-green-500/20">
            <p className="text-lg font-bold">
              ✅ Уведомление отправлено {FAKE_SUBSCRIBERS.length} подписчикам!
            </p>
            {currentReaction && (
              <p className="text-sm text-green-100 mt-1">{currentReaction}</p>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">💩 PoopTracker</h1>
            <button onClick={handleChangeName} className="text-amber-300 text-sm hover:text-amber-200 transition-colors">
              @{username} ✏️
            </button>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-all"
          >
            {showHistory ? '📊 Статистика' : '📋 История'}
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-300">{todayCount}</div>
            <div className="text-xs text-gray-400">Сегодня</div>
          </div>
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-300">{weekCount}</div>
            <div className="text-xs text-gray-400">За неделю</div>
          </div>
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-3 text-center">
            <div className="text-2xl font-bold text-amber-300">{avgInterval}</div>
            <div className="text-xs text-gray-400">Ср. интервал</div>
          </div>
        </div>

        {/* Achievement progress */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {currentAchievement && (
                <>
                  <span className="text-xl">{currentAchievement.emoji}</span>
                  <span className="text-sm font-semibold">{currentAchievement.title}</span>
                </>
              )}
            </div>
            {nextAchievement && (
              <span className="text-xs text-gray-400">
                До «{nextAchievement.title}»: {nextAchievement.threshold - events.length}
              </span>
            )}
          </div>
          {nextAchievement && (
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-amber-400 to-yellow-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (events.length / nextAchievement.threshold) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* MAIN BUTTON */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handlePoop}
            className={`
              relative w-48 h-48 rounded-full
              bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-800
              shadow-2xl shadow-amber-900/50
              border-4 border-amber-400/30
              transition-all duration-200
              hover:shadow-amber-500/30 hover:scale-105
              active:scale-90
              ${isPressed ? 'scale-90 shadow-inner' : ''}
            `}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10" />
            <div className="flex flex-col items-center justify-center h-full">
              <span className={`text-6xl transition-transform duration-200 ${isPressed ? 'scale-150' : ''}`}>
                💩
              </span>
              <span className="text-sm font-bold mt-2 text-amber-100">
                {isPressed ? 'ОНО ВЫШЛО!' : 'У меня вышло!'}
              </span>
            </div>
            {/* Pulse ring */}
            {!isPressed && (
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/50 animate-ping" />
            )}
          </button>
        </div>

        {/* Total count */}
        <div className="text-center mb-6">
          <span className="text-amber-300/60 text-sm">
            Всего зафиксировано: <span className="font-bold text-amber-300">{events.length}</span> раз
          </span>
        </div>

        {/* Subscribers notification feed */}
        {subscribers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              Уведомления подписчикам
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {subscribers.map(sub => (
                <div
                  key={sub.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl transition-all duration-500
                    ${sub.notified
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-white/5 border border-white/5'
                    }
                  `}
                >
                  <span className="text-2xl">{sub.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{sub.name}</div>
                    <div className={`text-xs transition-all duration-300 ${sub.notified ? 'text-green-400' : 'text-gray-500'}`}>
                      {sub.notified
                        ? `✅ «У ${username} вышло!» — доставлено`
                        : '⏳ Отправка...'
                      }
                    </div>
                  </div>
                  {sub.notified && sub.readAt && (
                    <span className="text-xs text-gray-500">
                      прочитано
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History / Stats toggle */}
        {showHistory ? (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              📋 История событий
            </h3>
            {events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🫥</div>
                <p>Пока пусто. Самое время нажать кнопку!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map(event => (
                  <div key={event.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                    <span className="text-2xl">💩</span>
                    <div>
                      <div className="text-sm font-medium">
                        {new Date(event.timestamp).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(event.timestamp).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {events.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Очистить всю историю? 🗑️')) {
                    setEvents([])
                    localStorage.removeItem('poop_events')
                  }
                }}
                className="w-full mt-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm hover:bg-red-500/20 transition-all"
              >
                🗑️ Очистить историю
              </button>
            )}
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              📊 Статистика
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Всего событий</span>
                <span className="font-bold text-amber-300">{events.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Сегодня</span>
                <span className="font-bold text-amber-300">{todayCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">За неделю</span>
                <span className="font-bold text-amber-300">{weekCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Средний интервал</span>
                <span className="font-bold text-amber-300">{avgInterval}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Подписчиков</span>
                <span className="font-bold text-amber-300">{FAKE_SUBSCRIBERS.length}</span>
              </div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Рекорд за день</span>
                  <span className="font-bold text-amber-300">
                    {(() => {
                      const dayMap: Record<string, number> = {}
                      events.forEach(e => {
                        const day = new Date(e.timestamp).toDateString()
                        dayMap[day] = (dayMap[day] || 0) + 1
                      })
                      const max = Math.max(0, ...Object.values(dayMap))
                      return max
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-xs">
          <p>💩 PoopTracker v1.0 — ваши подписчики ждут</p>
        </div>
      </div>
    </div>
  )
}

export default App
