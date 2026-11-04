import { useState, useEffect } from 'react'
import { supabase, Profile } from './lib/supabase'
import { AuthScreen } from './components/AuthScreen'
import { MainScreen } from './components/MainScreen'

function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initApp()
  }, [])

  const initApp = async () => {
    try {
      console.log('[PoopTracker] Инициализация...')

      // Получаем текущую сессию
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('[PoopTracker] Ошибка получения сессии:', sessionError)
        setError('Ошибка подключения к серверу. Проверьте настройки Supabase.')
        setLoading(false)
        return
      }

      const currentSession = sessionData?.session ?? null
      console.log('[PoopTracker] Сессия:', currentSession ? 'найдена' : 'не найдена')
      setSession(currentSession)

      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id)
      } else {
        setLoading(false)
      }

      // Подписываемся на изменения состояния авторизации
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          console.log('[PoopTracker] Изменение auth:', _event)
          setSession(newSession)

          if (newSession?.user) {
            await fetchProfile(newSession.user.id)
          } else {
            setProfile(null)
            setLoading(false)
          }
        }
      )

      return () => {
        authListener?.subscription?.unsubscribe()
      }
    } catch (err: any) {
      console.error('[PoopTracker] Критическая ошибка:', err)
      setError(`Ошибка инициализации: ${err.message || 'Неизвестная ошибка'}`)
      setLoading(false)
    }
  }

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[PoopTracker] Загрузка профиля для:', userId)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[PoopTracker] Ошибка загрузки профиля:', error)

        // Если таблицы нет - показываем понятную ошибку
        if (error.code === '42P01' || error.message?.includes('profiles')) {
          setError(
            '⚠️ Таблица profiles не найдена в базе данных Supabase!\n\n' +
            'Выполните SQL-скрипт из файла supabase-schema.sql в Supabase SQL Editor.'
          )
        } else {
          setError(`Ошибка загрузки профиля: ${error.message}`)
        }
        setLoading(false)
        return
      }

      if (data) {
        console.log('[PoopTracker] Профиль загружен:', data.username)
        setProfile(data)
      } else {
        console.warn('[PoopTracker] Профиль не найден для пользователя:', userId)
        setError(
          '⚠️ Профиль не найден!\n\n' +
          'Возможно, таблицы в Supabase не созданы. ' +
          'Выполните SQL-скрипт из файла supabase-schema.sql.'
        )
      }
    } catch (err: any) {
      console.error('[PoopTracker] Ошибка fetchProfile:', err)
      setError(`Ошибка: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setSession(null)
      setProfile(null)
      setError(null)
    } catch (err: any) {
      console.error('[PoopTracker] Ошибка выхода:', err)
    }
  }

  const handleAuth = () => {
    // Состояние обновится через onAuthStateChange
    if (session?.user) {
      fetchProfile(session.user.id)
    }
  }

  // Экран загрузки
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">💩</div>
          <p className="text-cyan-400 text-lg mb-2">Загрузка...</p>
          <p className="text-slate-500 text-xs">Подключение к Supabase</p>
        </div>
      </div>
    )
  }

  // Экран ошибки
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border-2 border-red-500/30 rounded-3xl p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-400 mb-4">Ошибка подключения</h2>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-left">
            <p className="text-red-300 text-sm whitespace-pre-line">{error}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-xl text-white font-bold hover:scale-105 transition-transform"
            >
              🔄 Попробовать снова
            </button>
            <details className="text-left">
              <summary className="text-slate-400 text-sm cursor-pointer hover:text-slate-300">
                💡 Инструкция по настройке
              </summary>
              <div className="mt-3 p-4 bg-slate-800/50 rounded-xl text-xs text-slate-300 space-y-2">
                <p>1. Откройте <a href="https://supabase.com/dashboard/" target="_blank" className="text-cyan-400 underline">Supabase Dashboard</a></p>
                <p>2. Перейдите в SQL Editor</p>
                <p>3. Выполните скрипт из файла <code className="bg-slate-700 px-1 rounded">supabase-schema.sql</code></p>
                <p>4. В Authentication → Providers → Email отключите "Confirm email"</p>
                <p>5. Обновите эту страницу</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    )
  }

  // Экран авторизации
  if (!session) {
    return <AuthScreen onAuth={handleAuth} />
  }

  // Главный экран (если есть сессия, но нет профиля - показываем auth)
  if (!profile) {
    return <AuthScreen onAuth={handleAuth} />
  }

  return <MainScreen profile={profile} onLogout={handleLogout} />
}

export default App
