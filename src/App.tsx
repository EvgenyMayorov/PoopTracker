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

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[PoopTracker] Ошибка fetchProfile:', error)

        // Если таблицы не созданы - выходим и показываем предупреждение
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
        } else {
          setWarning('Ошибка загрузки профиля: ' + error.message)
        }
        setLoading(false)
        return
      }

      if (data) {
        console.log('[PoopTracker] Профиль загружен:', data.username)
        setProfile(data)
        setWarning(null) // Очищаем предупреждение если всё ок
      } else {
        console.warn('[PoopTracker] Профиль не найден для userId:', userId)
        // Профиль не найден - выходим и показываем форму входа
        console.log('[PoopTracker] Профиль не найден. Выход из системы...')
        await supabase.auth.signOut()
        setSession(null)
        setProfile(null)
        setWarning(
          '⚠️ Профиль не найден!\n\n' +
          'Ваш аккаунт создан, но профиль отсутствует.\n' +
          'Зарегистрируйтесь заново или обратитесь к администратору.'
        )
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
