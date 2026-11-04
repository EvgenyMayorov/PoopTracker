import { useState, useEffect } from 'react'
import { supabase, Profile } from './lib/supabase'
import { AuthScreen } from './components/AuthScreen'
import { MainScreen } from './components/MainScreen'

function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState<string | null>(null)

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
      
      // Сначала тестируем подключение к Supabase
      const { error: testError } = await supabase.from('profiles').select('count').limit(1)
      
      if (testError) {
        console.error('[PoopTracker] Ошибка подключения к Supabase:', testError)
        
        let warningMessage = ''
        
        if (testError.message.includes('JWT') || testError.message.includes('token') || testError.message.includes('Invalid API key')) {
          warningMessage = '❌ Неправильный API ключ!\n\nОткройте Supabase Dashboard → Settings → API\nСкопируйте "anon public" key (начинается с eyJ...)\nЗамените SUPABASE_ANON_KEY в src/lib/supabase.ts'
        } else if (testError.code === '42P01' || testError.message?.includes('profiles')) {
          warningMessage = '⚠️ Таблицы не созданы в базе данных!\n\nВыполните SQL-скрипт из файла supabase-schema.sql\nв Supabase SQL Editor, затем вернитесь сюда.'
        } else if (testError.message.includes('network') || testError.message.includes('fetch')) {
          warningMessage = '🌐 Проблема с сетью\n\nПроверьте:\n1. Интернет-соединение\n2. URL проекта в supabase.ts\n3. Проект существует в Supabase Dashboard'
        } else {
          warningMessage = 'Ошибка подключения:\n' + testError.message
        }
        
        // Если есть сессия, но таблицы не созданы - выходим
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession) {
          console.log('[PoopTracker] Сессия найдена, но таблицы не созданы. Выход...')
          await supabase.auth.signOut()
          setSession(null)
          setProfile(null)
        }
        
        setWarning(warningMessage)
        setLoading(false)
        return
      }
      
      console.log('[PoopTracker] ✅ Подключение к Supabase успешно')
      
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('[PoopTracker] Ошибка getSession:', sessionError)
        setWarning('Ошибка получения сессии: ' + sessionError.message)
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
      setWarning('Критическая ошибка: ' + (err.message || 'Неизвестная ошибка'))
      setLoading(false)
    }
  }

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[PoopTracker] Запрос профиля для userId:', userId)

      // Retry-логика: до 4 попыток с задержкой 500мс
      const MAX_RETRIES = 4
      const RETRY_DELAY = 500
      let profile = null
      let lastError = null

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[PoopTracker] Попытка ${attempt}/${MAX_RETRIES} загрузки профиля...`)
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()

        if (error) {
          lastError = error
          console.error(`[PoopTracker] Ошибка fetchProfile (попытка ${attempt}):`, error)

          // Если таблицы не созданы - нет смысла повторять
          if (error.code === '42P01' || error.message?.includes('profiles')) {
            console.log('[PoopTracker] Таблицы не созданы. Выход из системы...')
            await supabase.auth.signOut()
            setSession(null)
            setProfile(null)
            setWarning(
              '⚠️ Таблица profiles не найдена!\n\n' +
              'Выполните SQL-скрипт из файла supabase-schema.sql\n' +
              'в Supabase SQL Editor.'
            )
            setLoading(false)
            return
          }
        } else {
          profile = data
          if (profile) {
            console.log(`[PoopTracker] Профиль загружен с попытки ${attempt}:`, profile.username)
            break
          }
        }

        // Если это не последняя попытка и профиль не найден - ждём
        if (attempt < MAX_RETRIES && !profile) {
          console.log(`[PoopTracker] Профиль не найден, ждём ${RETRY_DELAY}мс перед следующей попыткой...`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        }
      }

      // Если после всех попыток профиль найден - используем его
      if (profile) {
        console.log('[PoopTracker] Профиль успешно загружен:', profile.username)
        setProfile(profile)
        setWarning(null)
      } else {
        // Fallback: создаём профиль автоматически
        console.warn('[PoopTracker] Профиль не найден после всех попыток. Создаём автоматически...')
        
        const username = `user_${userId.substring(0, 8)}`
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ 
            id: userId, 
            username: username,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) {
          console.error('[PoopTracker] Ошибка создания fallback-профиля:', insertError)
          setWarning(
            '⚠️ Не удалось создать профиль автоматически.\n\n' +
            'Попробуйте выйти и войти заново.'
          )
          await supabase.auth.signOut()
          setSession(null)
          setProfile(null)
        } else {
          console.log('[PoopTracker] Fallback-профиль создан:', newProfile)
          setProfile(newProfile)
          setWarning(null)
        }
      }
    } catch (err: any) {
      console.error('[PoopTracker] Исключение в fetchProfile:', err)
      setWarning('Ошибка: ' + (err.message || 'Неизвестная ошибка'))
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
      setWarning(null)
      console.log('[PoopTracker] Выход выполнен')
    } catch (err: any) {
      console.error('[PoopTracker] Ошибка выхода:', err)
    }
  }

  const dismissWarning = () => {
    setWarning(null)
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

  // Экран авторизации (нет сессии или нет профиля)
  if (!session || !profile) {
    return (
      <>
        <AuthScreen />
        {warning && (
          <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
            <div className="bg-amber-500/90 backdrop-blur-lg border-2 border-amber-400 rounded-2xl p-4 shadow-xl">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <p className="text-amber-950 text-sm font-semibold whitespace-pre-line">{warning}</p>
                </div>
                <button
                  onClick={dismissWarning}
                  className="text-amber-950 hover:text-amber-800 font-bold text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return <MainScreen profile={profile} onLogout={handleLogout} />
}

export default App
