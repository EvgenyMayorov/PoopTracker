import { useState, useEffect, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { t } from '../i18n'

interface SettingsTabProps {
  profile: Profile
  onLogout: () => void
}

// VAPID public key (safe to embed in client)
const VAPID_PUBLIC_KEY = 'BB9szPlMVlU9KtLpwYqFYOMOLpNo-Nb-xsbP3y18lAIM-29drXGSm0_-6RlzIfHvwj0V8VHX0wSt1Ym2LBRNDaE'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

// Животные и птицы (сохраняем существующие, добавляем новые без дублирования)
const avatarEmojis = ['💩', '🧻', '🚽', '😎', '🦊', '🐻', '🐸', '🦁', '🐼', '🦄', '👽', '🤖', '👻', '🔥', '🌟', '👑', '🥑', '🌶️', '🐱', '🐈', '🐶', '🐕', '🐯', '🐅', '🐓', '🐔', '🐨', '🐺', '🐷', '🐮', '🐵', '🐰', '🐹', '🦉', '🐧', '🦆', '🦖']

export function SettingsTab({ profile, onLogout }: SettingsTabProps) {
  const [editingUsername, setEditingUsername] = useState(false)
  const [tempUsername, setTempUsername] = useState(profile.username)
  const [profileUsername, setProfileUsername] = useState(profile.username)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string>(() =>
    profile?.avatar || localStorage.getItem('poop_avatar') || '💩'
  )

  // Push notifications state
  // Восстанавливаем переключатель из localStorage, чтобы он не сбрасывался
  // после перезагрузки или обновления страницы (до тех пор, пока не будет
  // перепроверено реальным состоянием подписки).
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('poop_push_enabled') === 'true'
    } catch {
      return false
    }
  })
  const [pushStatus, setPushStatus] = useState<'loading' | 'enabled' | 'disabled' | 'blocked' | 'unsupported'>('loading')
  const [pushError, setPushError] = useState<string | null>(null)
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  // Ключи для кэширования состояния Push-уведомлений в localStorage.
  const PUSH_CACHE_KEY = 'poop_push_enabled'
  const PUSH_CACHE_TS_KEY = 'poop_push_cache_ts'

  // Универсальный helper: сохранить закэшированный статус.
  const cachePushStatus = (enabled: boolean) => {
    try {
      localStorage.setItem(PUSH_CACHE_KEY, enabled ? 'true' : 'false')
      localStorage.setItem(PUSH_CACHE_TS_KEY, new Date().toISOString())
    } catch {
      // Игнорируем ошибки доступа к localStorage (например, в приватном режиме)
    }
  }

  // Универсальный helper: получить активную регистрацию SW с безопасным таймаутом.
  // Если SW не активировался (например, на GitHub Pages), registration
  // отбрасывается через 3 секунды, и мы продолжаем работу без него.
  const getRegistrationWithTimeout = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null

    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 3000)
    )

    try {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        timeout
      ])
      return registration as ServiceWorkerRegistration | null
    } catch {
      return null
    }
  }

  // Убедиться, что SW зарегистрирован (на GitHub Pages это критично).
  const ensureServiceWorkerRegistered = async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) return false
    try {
      await navigator.serviceWorker.register('./custom-sw.js', { scope: './' })
      return true
    } catch (err) {
      console.error('[SW] Ошибка регистрации:', err)
      return false
    }
  }

  const updatePushStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported')
      setPushEnabled(false)
      cachePushStatus(false)
      return
    }

    try {
      const permission = Notification.permission
      if (permission === 'denied') {
        setPushStatus('blocked')
        setPushEnabled(false)
        cachePushStatus(false)
        return
      }

      // Инициализируем состояние сразу из localStorage (если разрешение не запрещено).
      const saved = localStorage.getItem('poop_push_enabled') === 'true'
      setPushEnabled(saved)
      setPushStatus(saved ? 'enabled' : 'disabled')
      if (!saved) return

      // Фоновая проверка реальной подписки: SW -> pushManager.getSubscription() и запись в push_subscriptions.
      let browserSubscription: PushSubscription | null = null
      let registrationObj: ServiceWorkerRegistration | null = null
      try {
        const reg = await getRegistrationWithTimeout()
        registrationObj = reg
        if (reg) {
          browserSubscription = await reg.pushManager.getSubscription()
        }
      } catch (err) {
        console.warn('[Push] Не удалось проверить SW-подписку:', err)
      }

      let dbSubscription: any = null
      if (profile?.id) {
        try {
          const { data } = await supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh, auth')
            .eq('user_id', profile.id)
            .limit(1)
          dbSubscription = data?.[0] || null
        } catch (err) {
          console.warn('[Push] Не удалось проверить запись в push_subscriptions:', err)
        }
      }

      const realEnabled = permission === 'granted' && (!!browserSubscription || !!dbSubscription)

      if (realEnabled) {
        // Подписка есть в браузере или в БД — не сбрасываем тумблер, тихо восстанавливаем/синхронизируем запись в БД.
        setPushStatus('enabled')
        setPushEnabled(true)
        cachePushStatus(true)
        if (browserSubscription && dbSubscription) {
          try {
            await supabase
              .from('push_subscriptions')
              .upsert({
                user_id: profile.id,
                endpoint: browserSubscription.endpoint,
                p256dh: arrayBufferToBase64(browserSubscription.getKey('p256dh')!),
                auth: arrayBufferToBase64(browserSubscription.getKey('auth')!),
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' })
          } catch (err) {
            console.warn('[Push] Tikhaya синхронизация push_subscriptions:', err)
          }
        } else if (dbSubscription && registrationObj && !browserSubscription) {
          // Восстанавливаем подписку в браузере из записи в БД.
          try {
            const subscription = await registrationObj.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
            })
            await supabase
              .from('push_subscriptions')
              .upsert({
                user_id: profile.id,
                endpoint: subscription.endpoint,
                p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
                auth: arrayBufferToBase64(subscription.getKey('auth')!),
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' })
          } catch (err) {
            console.warn('[Push] Не удалось восстановить SW-подписку:', err)
            setPushStatus('disabled')
            setPushEnabled(false)
            cachePushStatus(false)
          }
        }
      } else {
        // Разрешение есть, но реальной подписки нет — сбрасываем тумблер в выключенное состояние.
        setPushStatus('disabled')
        setPushEnabled(false)
        cachePushStatus(false)
      }
    } catch (err) {
      console.error('[Push] Status check error:', err)
      setPushStatus('disabled')
      setPushEnabled(false)
      cachePushStatus(false)
    }
  }, [profile?.id])

  useEffect(() => {
    updatePushStatus()
  }, [updatePushStatus])

  const handleSaveUsername = async () => {
    const trimmedUsername = tempUsername.trim()
    if (!trimmedUsername) {
      setUsernameError('Введите никнейм')
      return
    }

    // Проверяем уникальность (без учёта регистра), исключая текущего пользователя
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmedUsername)
      .neq('id', profile.id)

    if (existingProfiles && existingProfiles.length > 0) {
      setUsernameError('Этот никнейм уже занят, выберите другой')
      return
    }

    setUsernameError(null)

    await supabase
      .from('profiles')
      .update({ username: trimmedUsername })
      .eq('id', profile.id)

    setProfileUsername(trimmedUsername)
    setEditingUsername(false)
  }

  const handleSaveAvatar = async (emoji: string) => {
    setAvatar(emoji)
    localStorage.setItem('poop_avatar', emoji)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar: emoji })
        .eq('id', profile.id)
      if (error) {
        console.error('[Settings] Ошибка сохранения аватара в Supabase:', error)
      }
    } catch (err) {
      console.error('[Settings] Исключение при сохранении аватара:', err)
    }
  }

  const subscribeToPush = async () => {
    setPushError(null)
    setPushStatus('loading')

    try {
      // 1. Запрашиваем разрешение на уведомления (базовые, без SW)
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPushError('Разрешение на уведомления не предоставлено')
        setPushStatus('blocked')
        setPushEnabled(false)
        return
      }

      // 2. Обеспечиваем регистрацию Service Worker (на GitHub Pages критично)
      await ensureServiceWorkerRegistered()

      // 3. Пробуем получить активную регистрацию SW с таймаутом
      const registration = await getRegistrationWithTimeout()

      // 4. Пытаемся создать push-подписку, если браузер поддерживает Web Push
      if (registration && 'PushManager' in window && VAPID_PUBLIC_KEY) {
        try {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
          })

          const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
              user_id: profile.id,
              endpoint: subscription.endpoint,
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(subscription.getKey('auth')!),
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

          if (error) {
            console.error('[Push] Save subscription error:', error)
            setPushError('Ошибка сохранения подписки: ' + error.message)
            setPushStatus('disabled')
            setPushEnabled(false)
            return
          }

          setPushStatus('enabled')
          setPushEnabled(true)
          setPushError(null)
          cachePushStatus(true)
          return
        } catch (pushErr: any) {
          console.error('[Push] Web Push subscribe failed, using basic notifications:', pushErr)
          // Падаем ниже — включаем базовые уведомления без push-подписки
        }
      }

      // 5. Браузер не поддерживает Web Push / pushManager — включаем базовые уведомления
      setPushStatus('enabled')
      setPushEnabled(true)
      setPushError(null)
      cachePushStatus(true)
    } catch (err: any) {
      console.error('[Push] Subscribe error:', err)
      setPushError('Ошибка подписки: ' + (err.message || 'Неизвестная ошибка'))
      setPushStatus('disabled')
      setPushEnabled(false)
      cachePushStatus(false)
    }
  }

  const unsubscribeFromPush = async () => {
    setPushError(null)
    setPushStatus('loading')

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', profile.id)

      if (error) {
        console.error('[Push] Delete subscription error:', error)
        setPushError('Ошибка удаления подписки: ' + error.message)
      }

      setPushStatus('disabled')
      setPushEnabled(false)
      setPushError(null)
      cachePushStatus(false)
    } catch (err: any) {
      console.error('[Push] Unsubscribe error:', err)
      setPushError('Ошибка отписки: ' + (err.message || 'Неизвестная ошибка'))
      setPushStatus('disabled')
      setPushEnabled(false)
      cachePushStatus(false)
    }
  }

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribeToPush()
    } else {
      await unsubscribeFromPush()
    }
  }

  const showLocalTestNotification = async () => {
    if (!('serviceWorker' in navigator)) {
      if (Notification.permission === 'granted') {
        new Notification(t('testNotification'), {
          body: t('testNotificationText'),
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'test-notification'
        })
      } else {
        throw new Error('Notification permission not granted')
      }
      return
    }

    // Используем таймаут как в updatePushStatus — не вешаемся на .ready навсегда
    const registration = await getRegistrationWithTimeout()
    if (registration) {
      await registration.showNotification(t('testNotification'), {
        body: t('testNotificationText'),
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-notification',
        data: { test: true }
      })
    } else if (Notification.permission === 'granted') {
      // SW не активировался — показываем через Notification API напрямую
      new Notification(t('testNotification'), {
        body: t('testNotificationText'),
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-notification'
      })
    } else {
      throw new Error('Notification permission not granted')
    }
  }

  const sendTestNotification = async () => {
    setSendingTest(true)
    setTestResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          userId: profile.id,
          title: t('testNotification'),
          body: t('testNotificationText'),
          data: { test: true }
        }
      })

      if (error) {
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          await showLocalTestNotification()
          setTestResult('✅ Тестовое уведомление показано локально (Edge Function не развернута)')
        } else {
          throw error
        }
      } else {
        // Edge Function сработала — всё равно показываем локально для гарантии
        await showLocalTestNotification()
        setTestResult('✅ Тестовое уведомление отправлено через сервер и показано локально')
      }
    } catch (err: any) {
      console.error('[Push] Test notification error:', err)
      try {
        await showLocalTestNotification()
        setTestResult('✅ Тестовое уведомление показано локально')
      } catch (localErr) {
        setTestResult('❌ Ошибка: ' + (err.message || 'Неизвестная ошибка'))
      }
    } finally {
      setSendingTest(false)
    }
  }

  const handleUpdateApp = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((reg) => reg.unregister()))
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      }
      setPushError(null)
      setTestResult(null)
      // небольшая задержка, чтобы SW отчистился из реестра
      setTimeout(() => window.location.reload(), 300)
    } catch (err) {
      console.error('[Settings] Ошибка обновления PWA:', err)
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  return (
    <div className="min-h-[calc(100dvh-150px)] flex flex-col justify-between">
      <div className="space-y-4">
        <h2 className={`text-xl font-bold mb-6 ${'text-slate-900'}`}>Настройки</h2>

      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${'text-slate-900'}`}>
          👤 Аккаунт
        </h3>
        <div className="rounded-xl p-4 bg-white border border-slate-200/80">
          {editingUsername ? (
            <div className="space-y-3">
              <input
                type="text"
                value={tempUsername}
                onChange={e => {
                  setTempUsername(e.target.value)
                  if (usernameError) setUsernameError(null)
                }}
                className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
              {usernameError && (
                <p className="text-sm text-red-600 mt-1">❌ {usernameError}</p>
              )}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className={`text-sm mb-3 ${'text-slate-900'}`}>Выберите аватарку:</p>
                <div className="grid grid-cols-5 gap-2 max-h-[280px] overflow-y-auto overscroll-contain pr-1">
                  {avatarEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSaveAvatar(emoji)}
                      className={`text-3xl p-2 rounded-lg transition-all hover:scale-110 ${
                        avatar === emoji
                          ? 'bg-blue-100 border-2 border-blue-400'
                          : 'bg-gray-50 border-2 border-gray-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveUsername} className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium">
                  Сохранить
                </button>
                <button
                  onClick={() => { setEditingUsername(false); setTempUsername(profileUsername) }}
                  className="flex-1 h-10 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-sm font-medium"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-4xl ${'text-slate-400'}`}> {avatar} </span>
                  <div>
                    <div className={`font-semibold ${'text-slate-900'}`}>{profileUsername}</div>
                    <div className={`text-xs ${'text-slate-400'}`}>{profile.id.substring(0, 8)}...</div>
                  </div>
                </div>
<button
                  onClick={() => setEditingUsername(true)}
                  className="h-10 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
                >
                  Изменить профиль
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-slate-50 border border-slate-200">
                <span className={`text-xs font-semibold ${'text-slate-400'}`}>📧 Электронная почта</span>
                <span className={`text-sm truncate max-w-[60%] text-right ${'text-slate-900'}`}>{profile.email || '—'}</span>
              </div>
            </div>
          )}
        </div>
      </div>


      <section className="mb-8 border-t border-slate-200 pt-6">
        <h3 className={`text-sm font-semibold mb-3 ${'text-slate-900'}`}>Push-уведомления</h3>

        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-slate-200/80">
          <div>
            <div className={`font-semibold text-sm ${'text-slate-900'}`}>Push-уведомления</div>
            <div className={`text-xs mt-0.5 ${
              pushStatus === 'enabled'
                ? 'text-green-600'
                : pushStatus === 'blocked'
                  ? 'text-red-500'
                  : 'text-slate-400'
            }`}>
              {pushStatus === 'loading' && 'Проверка...'}
              {pushStatus === 'enabled' && 'Включены'}
              {pushStatus === 'disabled' && 'Выключены'}
              {pushStatus === 'blocked' && 'Заблокированы в браузере'}
              {pushStatus === 'unsupported' && 'Не поддерживаются браузером'}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pushEnabled}
            onClick={() => handlePushToggle(!pushEnabled)}
            disabled={pushStatus === 'loading' || pushStatus === 'unsupported' || pushStatus === 'blocked'}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
              pushEnabled ? 'bg-slate-900' : 'bg-slate-200'
            } ${pushStatus === 'loading' || pushStatus === 'unsupported' || pushStatus === 'blocked' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                pushEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {pushError && (
          <p className="text-sm text-red-600 mt-2">{pushError}</p>
        )}

        <button
          onClick={sendTestNotification}
          disabled={!pushEnabled || sendingTest}
          className={`w-full py-2 rounded-lg font-semibold transition-colors ${
            pushEnabled && !sendingTest
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
          }`}
        >
          {sendingTest ? 'Отправка...' : 'Отправить тестовое уведомление'}
        </button>

        {testResult && (
          <div className={`mt-3 rounded-lg p-3 ${testResult.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {testResult}
          </div>
        )}

        <button
          onClick={handleUpdateApp}
          className="mt-4 w-full h-10 rounded-lg text-sm font-medium transition-colors bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200"
        >
          Обновить версию приложения
        </button>
      </section>

      </div>

      <footer className="flex flex-col min-h-[calc(100dvh-7.5rem)] justify-between mt-auto border-t border-slate-200/80 pt-4 space-y-1">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onLogout}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              'bg-red-50 border-2 border-red-200 text-red-600'
            }`}
          >
            Выйти
          </button>
          <span>PoopTrack v1.3.1</span>
        </div>
        <div className="text-center text-xs text-slate-400 space-y-0.5">
          <div>Made by Evgen.</div>
          <div>Powered by Supabase & GitHub, 2026.</div>
        </div>
      </footer>
    </div>
  )
}