import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      console.log('[Auth] Отправка формы...', { isLogin, email, username })

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          console.error('[Auth] Ошибка входа:', error)
          throw error
        }
        console.log('[Auth] Успешный вход:', data)
        setMessage('✅ Вход выполнен! Загрузка...')
        // onAuthStateChange в App.tsx автоматически обновит состояние
      } else {
        if (!username.trim()) {
          throw new Error('Введите никнейм')
        }

        console.log('[Auth] Регистрация...')
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) {
          console.error('[Auth] Ошибка регистрации:', error)
          throw error
        }

        console.log('[Auth] Регистрация успешна:', data)

        if (data.user) {
          console.log('[Auth] Создание профиля с retry-логикой...')
          
          // Retry-логика: до 4 попыток с задержкой 500мс
          const MAX_RETRIES = 4
          const RETRY_DELAY = 500
          let profileCreated = false
          let lastError = null

          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            console.log(`[Auth] Попытка ${attempt}/${MAX_RETRIES} создания профиля...`)
            
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({ 
                id: data.user.id, 
                username: username.trim(),
                updated_at: new Date().toISOString()
              })

            if (profileError) {
              lastError = profileError
              console.error(`[Auth] Ошибка создания профиля (попытка ${attempt}):`, profileError)
              
              // Если профиль уже существует (конфликт с триггером) - это нормально
              if (profileError.code === '23505') {
                console.log('[Auth] Профиль уже существует (создан триггером)')
                profileCreated = true
                break
              }
              
              // Если это не последняя попытка - ждём
              if (attempt < MAX_RETRIES) {
                console.log(`[Auth] Ждём ${RETRY_DELAY}мс перед следующей попыткой...`)
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
              }
            } else {
              profileCreated = true
              console.log(`[Auth] Профиль создан с попытки ${attempt}`)
              break
            }
          }

          if (!profileCreated) {
            console.error('[Auth] Не удалось создать профиль после всех попыток:', lastError)
            throw new Error(`Не удалось создать профиль: ${lastError?.message || 'Неизвестная ошибка'}`)
          }
        }

        setMessage('✅ Регистрация успешна! Загрузка...')
        // onAuthStateChange в App.tsx автоматически обновит состояние
      }
    } catch (err: any) {
      console.error('[Auth] Критическая ошибка:', err)
      setError(err.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Neon background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Floating emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute text-4xl opacity-10 animate-float"
            style={{
              left: `${(i * 12.5) % 100}%`,
              top: `${(i * 15) % 100}%`,
              animationDuration: `${6 + (i % 4)}s`,
              animationDelay: `${(i % 3)}s`,
            }}
          >
            💩
          </div>
        ))}
      </div>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-900/80 backdrop-blur-xl border-2 border-cyan-500/30 rounded-3xl p-8 shadow-2xl shadow-cyan-500/20 neon-border">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-bounce">💩</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent neon-text">
              PoopTracker
            </h1>
            <p className="text-cyan-300/60 text-sm mt-2">Отслеживай. Делись. Удивляй.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-cyan-300 text-sm font-semibold mb-2">
                  Никнейм
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="PoopMaster69"
                  className="w-full px-4 py-3 bg-slate-800/50 border-2 border-cyan-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20 transition-all"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-cyan-300 text-sm font-semibold mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-slate-800/50 border-2 border-cyan-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-cyan-300 text-sm font-semibold mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-800/50 border-2 border-cyan-500/30 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20 transition-all"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                ❌ {error}
              </div>
            )}

            {message && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-purple-500 rounded-xl text-white font-bold text-lg hover:from-cyan-400 hover:via-fuchsia-400 hover:to-purple-400 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 neon-button shadow-lg shadow-fuchsia-500/30"
            >
              {loading ? '⏳ Загрузка...' : isLogin ? '🚀 Войти' : '✨ Регистрация'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError(null)
                setMessage(null)
              }}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
            >
              {isLogin ? 'Нет аккаунта? Зарегистрируйся' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
