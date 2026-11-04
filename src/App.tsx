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
    console.log('[PoopTracker] Запуск приложения...')

    // СРАЗУ подписываемся на изменения auth состояния
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[PoopTracker] Auth event:', event, 'User:', newSession?.user?.email || 'none')
        
        setSession(newSession)

        if (newSession?.user) {
          console.log('[PoopTracker] Загрузка профиля для:', newSession.user.id)
          await fetchProfile(newSession.user.id)
        } else {
          console.log('[PoopTracker] Сессия отсутствует')
          setProfile(null)
          setLoading(false)
        }
      }
    )

    // Получаем текущую сессию при старте
    checkSession()

    // Cleanup
    return () => {
      console.log('[PoopTracker] Отписка от auth listener')
      subscription.unsubscribe()
    }
  }, [])

  const checkSession = async () => {
    try {
      console.log('[PoopTracker] Проверка текущей сессии...')
      
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('[PoopTracker] Ошибка getSession:', sessionError)
        setError('Ошибка подключения к Supabase: ' + sessionError.message)
        setLoading(false)
        return
      }

      console.log('[PoopTracker] Текущая сессия:', currentSession ? 'найдена' : 'не найдена')
      
      // Состояние обновится через onAuthStateChange, но на всякий случай установим здесь тоже
      if (currentSession?.user && !session) {
        setSession(currentSession)
        await fetchProfile(currentSession.user.id)
      } else if (!currentSession) {
        setLoading(false)
      }
    } catch (err: any) {
      console.error('[PoopTracker] Критическая ошибка checkSession:', err)
      setError('Ошибка: ' + (err.message || 'Неизвестная ошибка'))
      setLoading(false)
    }
  }

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[PoopTracker] Запрос профиля для userId:', userId)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[PoopTracker] Ошибка fetchProfile:', error)

        if (error.code === '42P01' || error.message?.includes('profiles')) {
          setError(
            '⚠️ Таблица profiles не найдена!\n\n' +
            'Выполните SQL-скрипт из файла supabase-schema.sql в Supabase SQL Editor.'
          )
        } else {
          setError('Ошибка загрузки профиля: ' + error.message)
        }
        setLoading(false)
        return
      }

      if (data) {
        console.log('[PoopTracker] Профиль загружен:', data.username)
        setProfile(data)
      } else {
        console.warn('[PoopTracker] Профиль не найден для userId:', userId)
        setError(
          '⚠️ Профиль не найден!\n\n' +
          'Возможно, таблицы в Supabase не созданы. ' +
          'Выполните SQL-скрипт из файла supabase-schema.sql.'
        )
      }
    } catch (err: any) {
      console.error('[PoopTracker] Исключение в fetchProfile:', err)
      setError('Ошибка: ' + (err.message || 'Неизвестная ошибка'))
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      console.log('[PoopTracker] Выход...')
      await supabase.auth.signOut()
      setSession(null)
      setProfile(null)
      setError(null)
      console.log('[PoopTracker] Выход выполнен')
    } catch (err: any) {
      console.error('[PoopTracker] Ошибка выхода:', err)
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

  // Экран авторизации (нет сессии)
  if (!session) {
    return <AuthScreen />
  }

  // Главный экран (есть сессия, но нет профиля - показываем auth)
  if (!profile) {
    return <AuthScreen />
  }

  return <MainScreen profile={profile} onLogout={handleLogout} />
}

export default App
