import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface AuthScreenProps {
  recoveryMode?: boolean
  onPasswordUpdated?: () => void
}

export function AuthScreen({ recoveryMode = false, onPasswordUpdated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset' | 'update-password'>(
    recoveryMode ? 'update-password' : 'login'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          console.error('[Auth] Ошибка входа:', error)
          throw error
        }
        console.log('[Auth] Успешный вход:', data)
        setMessage('✅ Вход выполнен! Загрузка...')
      } else if (mode === 'register') {
        const trimmedUsername = username.trim()
        const trimmedEmail = email.trim().toLowerCase()
        if (!trimmedUsername) {
          setUsernameError('Введите никнейм')
          return
        }
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', trimmedUsername)
          .limit(1)
        if (existingProfiles && existingProfiles.length > 0) {
          setUsernameError('Этот никнейм уже занят, выберите другой')
          return
        }
        setUsernameError(null)
        console.log('[Auth] Регистрация...')
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { username: trimmedUsername, name: trimmedUsername } }
        })
        if (error) {
          console.error('[Auth] Ошибка регистрации:', error)
          throw error
        }
        console.log('[Auth] Регистрация успешна:', data)
        if (data.user) {
          const MAX_RETRIES = 4
          const RETRY_DELAY = 500
          let profileCreated = false
          let lastError = null
          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            // Используем UPSERT (а не INSERT), чтобы гарантированно перезаписать
            // username, вычисленный триггером on_auth_user_created из metadata/email,
            // и сохранить именно введённый пользователем никнейм.
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert(
                { id: data.user.id, username: trimmedUsername, avatar: 'Panda', email: trimmedEmail, updated_at: new Date().toISOString() },
                { onConflict: 'id' }
              )
            if (profileError) {
              lastError = profileError
              console.error('[Auth] Ошибка создания профиля:', profileError)
              if (profileError.code === '23505') { profileCreated = true; break }
              if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, RETRY_DELAY)) }
            } else { profileCreated = true; break }
          }
          // Сохраняем pending-никнейм для сценария, когда сессия/профиль ещё не успели создать (email-шаблона)
          if (data.user && trimmedUsername) {
            try {
              localStorage.setItem(`poop_pending_username_${data.user.id}`, trimmedUsername)
            } catch (e) { /* ignore */ }
          }
          if (!profileCreated) { throw lastError }
        }
        setMessage('✅ Аккаунт создан! Загрузка...')
      } else if (mode === 'reset') {
        console.log('[Auth] Восстановление пароля...')
        const trimmedEmail = email.trim()
        console.log('[Auth] Отправка ссылки на сброс пароля на:', trimmedEmail)
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`
        })
        if (error) {
          console.error('[Auth] Ошибка восстановления:', error)
          setError(error.message || 'Неизвестная ошибка при отправке ссылки сброса пароля')
          throw error
        }
        setMessage('✅ Ссылка для сброса пароля отправлена на ваш email')
      } else if (mode === 'update-password') {
        const trimmedPassword = newPassword.trim()
        const trimmedConfirm = confirmPassword.trim()
        if (!trimmedPassword || trimmedPassword.length < 6) {
          setError('Пароль должен быть не короче 6 символов')
          return
        }
        if (trimmedPassword !== trimmedConfirm) {
          setError('Пароли не совпадают')
          return
        }
        console.log('[Auth] Установка нового пароля...')
        const { error } = await supabase.auth.updateUser({ password: trimmedPassword })
        if (error) {
          console.error('[Auth] Ошибка установки пароля:', error)
          setError(error.message || 'Не удалось установить новый пароль')
          return
        }
        console.log('[Auth] Пароль успешно обновлён')
        setMessage('✅ Пароль успешно обновлён! Загрузка...')
        setTimeout(() => { onPasswordUpdated?.() }, 1000)
      }
    } catch (err: any) {
      console.error('[Auth] Критическая ошибка:', err)
      setError(err.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mobile-container flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="PoopTrack" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            PoopTrack
          </h1>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-900">
                  Уникальное имя пользователя
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value)
                    if (usernameError) setUsernameError(null)
                  }}
                  placeholder="anna_2026"
                  className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                  required
                />
                {usernameError && (
                  <p className="text-sm text-red-500 mt-1">❌ {usernameError}</p>
                )}
              </div>
            )}

            {mode !== 'update-password' && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-900">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                  required
                />
              </div>
            )}

            {mode === 'update-password' && (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-900">
                    Новый пароль
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-900">
                    Подтвердите пароль
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}

            {mode !== 'reset' && mode !== 'update-password' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold mb-2 text-slate-900">
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
                      className="text-xs font-medium hover:opacity-80 transition-opacity text-slate-600 hover:text-slate-900"
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
                  className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                  required
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <div className="rounded-lg p-3 text-sm bg-red-50 border border-red-200 text-red-700">
                ❌ {error}
              </div>
            )}

            {message && (
              <div className="rounded-lg p-3 text-sm bg-green-50 border border-green-200 text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Загрузка...' :
               mode === 'login' ? 'Войти' :
               mode === 'register' ? 'Создать аккаунт' :
               mode === 'update-password' ? 'Установить новый пароль' :
               'Отправить ссылку для сброса'}
            </button>
          </form>

          {mode !== 'update-password' && (
            <div className="mt-4 text-center">
              {mode === 'login' ? (
                <button
                  onClick={() => {
                    setMode('register')
                    setError(null)
                    setMessage(null)
                  }}
                  className="text-sm font-medium hover:opacity-80 transition-opacity text-slate-600"
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
                  className="text-sm font-medium hover:opacity-80 transition-opacity text-slate-600"
                >
                  {mode === 'register' ? 'Уже есть аккаунт? Войти' : 'Вернуться назад к входу'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
