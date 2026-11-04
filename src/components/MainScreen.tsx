import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, Profile, PoopEvent } from '../lib/supabase'

type Props = {
  profile: Profile
  onLogout: () => void
}

const FAKE_SUBSCRIBERS = [
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

export function MainScreen({ profile, onLogout }: Props) {
  const [events, setEvents] = useState<PoopEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showNotif, setShowNotif] = useState(false)
  const [currentReaction, setCurrentReaction] = useState('')
  const [poopEmojis, setPoopEmojis] = useState<{ id: number; x: number; y: number }[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setEvents(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEvents()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('events-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, fetchEvents)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchEvents])

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

  const handlePoop = async () => {
    playSound()

    // Insert event
    const { error } = await supabase.from('events').insert({ user_id: profile.id })
    if (error) {
      console.error('Error inserting event:', error)
      return
    }

    // Flying emojis
    const newEmojis = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 60,
      y: 30 + Math.random() * 40,
    }))
    setPoopEmojis(newEmojis)
    setTimeout(() => setPoopEmojis([]), 2000)

    // Show notification
    setShowNotif(true)
    setTimeout(() => {
      setCurrentReaction(REACTIONS[Math.floor(Math.random() * REACTIONS.length)])
    }, 800)

    // Refresh events
    fetchEvents()
  }

  const todayCount = events.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString()).length
  const weekCount = events.filter(e => e.created_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white relative overflow-hidden">
      {/* Neon background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Floating emojis */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl opacity-10 animate-float"
            style={{
              left: `${(i * 10) % 100}%`,
              top: `${(i * 13) % 100}%`,
              animationDuration: `${6 + (i % 4)}s`,
              animationDelay: `${(i % 3)}s`,
            }}
          >
            💩
          </div>
        ))}
      </div>

      {/* Flying poop emojis on click */}
      {poopEmojis.map(emoji => (
        <div
          key={emoji.id}
          className="fixed text-5xl pointer-events-none z-50 animate-flyAway"
          style={{ left: `${emoji.x}%`, top: `${emoji.y}%` }}
        >
          💩
        </div>
      ))}

      {/* Header */}
      <div className="relative z-10 bg-slate-900/50 backdrop-blur-xl border-b border-cyan-500/20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
            💩 PoopTracker
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-cyan-300 text-sm font-medium">@{profile.username}</span>
            <button
              onClick={onLogout}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-lg mx-auto px-4 py-6">
        {/* Welcome */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">
            Привет, <span className="bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">{profile.username}</span>! 👋
          </h2>
          <p className="text-cyan-300/60 text-sm">Готов удивить подписчиков?</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-slate-800/50 border border-cyan-500/20 rounded-2xl p-3 text-center backdrop-blur-sm">
            <div className="text-xl font-bold text-cyan-400">{todayCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Сегодня</div>
          </div>
          <div className="bg-slate-800/50 border border-fuchsia-500/20 rounded-2xl p-3 text-center backdrop-blur-sm">
            <div className="text-xl font-bold text-fuchsia-400">{weekCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Неделя</div>
          </div>
          <div className="bg-slate-800/50 border border-purple-500/20 rounded-2xl p-3 text-center backdrop-blur-sm">
            <div className="text-xl font-bold text-purple-400">{events.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Всего</div>
          </div>
        </div>

        {/* MAIN BUTTON */}
        <div className="flex justify-center mb-6">
          <button
            onClick={handlePoop}
            className="relative w-56 h-56 rounded-full bg-gradient-to-br from-cyan-500 via-fuchsia-500 to-purple-600 shadow-2xl shadow-fuchsia-500/40 border-4 border-cyan-400/40 transition-all duration-200 hover:shadow-fuchsia-500/60 hover:scale-105 active:scale-90 group neon-button"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10" />
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-7xl transition-transform duration-200 group-active:scale-125">
                💩
              </span>
              <span className="text-sm font-bold mt-3 text-white px-4 text-center leading-tight">
                У МЕНЯ ВЫШЛО!
              </span>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/50 animate-ping" />
          </button>
        </div>

        {/* Notification */}
        {showNotif && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 text-center mb-6 animate-slideDown backdrop-blur-sm">
            <p className="text-sm font-bold text-cyan-300">
              ✅ Уведомление отправлено {FAKE_SUBSCRIBERS.length} подписчикам!
            </p>
            {currentReaction && (
              <p className="text-xs text-fuchsia-300 mt-1">{currentReaction}</p>
            )}
          </div>
        )}

        {/* Subscribers */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-cyan-300/80 mb-3 uppercase tracking-wider">
            👥 Мои подписчики
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {FAKE_SUBSCRIBERS.map(sub => (
              <div
                key={sub.id}
                className="bg-slate-800/50 border border-cyan-500/10 rounded-xl p-2 text-center backdrop-blur-sm hover:border-cyan-500/30 transition-all"
              >
                <div className="text-2xl mb-1">{sub.avatar}</div>
                <div className="text-[10px] text-slate-400 truncate">{sub.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Events feed */}
        <div>
          <h3 className="text-sm font-semibold text-fuchsia-300/80 mb-3 uppercase tracking-wider">
            📋 Мои события
          </h3>
          {loading ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-3xl mb-2 animate-spin">⏳</div>
              <p className="text-sm">Загрузка...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-5xl mb-3">🫥</div>
              <p className="text-sm">Пока пусто. Самое время нажать кнопку!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event, idx) => {
                const date = new Date(event.created_at)
                return (
                  <div
                    key={event.id}
                    className="bg-slate-800/50 border border-fuchsia-500/10 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 rounded-full flex items-center justify-center text-xl">
                      💩
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">
                        {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      </div>
                      <div className="text-xs text-slate-400">
                        {date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-xs text-fuchsia-400 font-medium">
                      #{events.length - idx}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-slate-500 text-xs">
          💩 PoopTracker v2.0 — powered by Supabase
        </div>
      </div>
    </div>
  )
}
