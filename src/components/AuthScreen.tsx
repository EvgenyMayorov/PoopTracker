import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
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
      console.log('[Auth] Отправка формы...', { mode, email, username })

      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          console.error('[Auth] Ошибка входа:', error)
          throw error
        }
        console.log('[Auth] Успешный вход:', data)
        setMessage('✅ Вход выполнен! Загрузка...')
      } else if (mode === 'register') {
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
              
              if (profileError.code === '23505') {
                console.log('[Auth] Профиль уже существует (создан триггером)')
                profileCreated = true
                break
              }
              
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
      } else if (mode === 'reset') {
        console.log('[Auth] Восстановление пароля...')
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) {
          console.error('[Auth] Ошибка восстановления:', error)
          throw error
        }
        setMessage('✅ Ссылка для сброса пароля отправлена на ваш email')
      }
    } catch (err: any) {
      console.error('[Auth] Критическая ошибка:', err)
      setError(err.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo and description */}
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="PooTrack" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--primary)' }}>
            PooTrack
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Личный медицинский дневник. Данные защищены и доступны только вам.
          </p>
        </div>

        {/* Form card */}
        <div className="card-soft">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                  Уникальное имя пользователя
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="anna_2026"
                  className="w-full px-3 py-2 text-base md:text-sm rounded-xl focus:outline-none focus:ring-1 transition-all"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--input)',
                    color: 'var(--foreground)',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 text-base md:text-sm rounded-xl focus:outline-none focus:ring-1 transition-all"
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid var(--input)',
                  color: 'var(--foreground)',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
                required
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    Пароль
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset')
                        setError(null)
                        setMessage(null)
                      }}
                      className="text-xs hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--primary)' }}
                    >
                      Забыли пароль?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-base md:text-sm rounded-xl focus:outline-none focus:ring-1 transition-all"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--input)',
                    color: 'var(--foreground)',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                  required
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'rgba(226, 73, 71, 0.1)', border: '1px solid var(--destructive)', color: 'var(--destructive)' }}>
                ❌ {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: 'rgba(61, 176, 124, 0.1)', border: '1px solid var(--success)', color: 'var(--success)' }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}
            >
              {loading ? 'Загрузка...' : 
               mode === 'login' ? 'Войти' : 
               mode === 'register' ? 'Создать аккаунт' : 
               'Отправить ссылку для сброса'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-4 text-center">
            {mode === 'login' ? (
              <button
                onClick={() => {
                  setMode('register')
                  setError(null)
                  setMessage(null)
                }}
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--primary)' }}
              >
                Нет аккаунта? Зарегистрироваться
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode('login')
                  setError(null)
                  setMessage(null)
                }}
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--primary)' }}
              >
                {mode === 'register' ? 'Уже есть аккаунт? Войти' : 'Вернуться назад к входу'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
