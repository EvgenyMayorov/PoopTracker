import { useState, useEffect, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { t } from '../i18n'
import { UserAvatar, AVATARS_3D, AVATAR_3D_IDS, getAvatarUrl } from './UserAvatar'

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

// Животные и птицы (существующие эмодзи оставляем для совместимости при просмотре старых данных)
// Новые 3D-аватары используются через ключ: 'dino', 'wolf' и т.д.
/* const avatarEmojis = ['💩', '🧻', '🚽', '😎', '🦊', '🐻', '🐸', '🦁', '🐼', '🦄', '👽', '🤖', '👻', '🔥', '🌟', '👑', '🥑', '🌶️', '🐱', '🐈', '🐶', '🐕', '🐯', '🐅', '🐓', '🐔', '🐨', '🐺', '🐷', '🐮', '🐵', '🐰', '🐹', '🦉', '🐧', '🦆', '🦖'] */

export function SettingsTab({ profile, onLogout }: SettingsTabProps) {
  const [editingUsername, setEditingUsername] = useState(false)
  const [tempUsername, setTempUsername] = useState(profile.username)
  const [profileUsername, setProfileUsername] = useState(profile.username)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string>(() => {
    // Если profile.avatar является ключом нового 3D-аватара — используем его напрямую,
    // иначе проверяем localStorage, а старые эмодзи или null дают дефолтный аватар.
    if (profile?.avatar && AVATAR_3D_IDS.has(profile.avatar)) {
      return profile.avatar
    }
    const stored = localStorage.getItem('poop_avatar')
    if (stored && AVATAR_3D_IDS.has(stored)) {
      return stored
    }
    return stored || profile?.avatar || '💩'
  })

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
      } else if (permission === 'granted') {
        // Разрешение granted, но реальной подписки нет — переподписываем устройство
        // и обновляем запись в push_subscriptions в Supabase, сохраняя тумблер включённым.
        setPushStatus('enabled')
        setPushEnabled(true)
        cachePushStatus(true)

        if (registrationObj) {
          try {
            const newSubscription = await registrationObj.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
            })
            const { error } = await supabase
              .from('push_subscriptions')
              .upsert({
                user_id: profile.id,
                endpoint: newSubscription.endpoint,
                p256dh: arrayBufferToBase64(newSubscription.getKey('p256dh')!),
                auth: arrayBufferToBase64(newSubscription.getKey('auth')!),
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' })
            if (error) {
              console.warn('[Push] Auto-resubscribe DB error:', error)
            }
          } catch (err) {
            console.warn('[Push] Auto-resubscribe failed:', err)
          }
        }
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
    <div className="min-h-[calc(100dvh-4.5rem)] flex flex-col justify-between px-4 pt-5 pb-4">
      <div className="space-y-3">
        <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 leading-none mb-4">
          Настройки
        </h1>

        <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          {editingUsername ? (
            <div className="space-y-3">
              <input
                type="text"
                value={tempUsername}
                onChange={e => {
                  setTempUsername(e.target.value)
                  if (usernameError) setUsernameError(null)
                }}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm text-slate-900 focus:outline-none focus:border-[#111827]"
              />
              {usernameError && <p className="text-xs text-rose-600">{usernameError}</p>}


              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-500 mb-2">Выберите аватар:</p>
                <div className="grid grid-cols-4 gap-3 max-h-[280px] overflow-y-auto pr-1">
                  {AVATARS_3D.map((avatarInfo) => (
                    <button
                      key={avatarInfo.id}
                      onClick={() => handleSaveAvatar(avatarInfo.id)}
                      className={`flex items-center justify-center rounded-full overflow-hidden w-14 h-14 transition-colors cursor-pointer select-none ${avatar === avatarInfo.id ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                    >
                      <img
                        src={getAvatarUrl(avatarInfo.fileName)}
                        alt={avatarInfo.label}
                        className="w-10 h-10 object-cover rounded-full"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveUsername} className="flex-1 h-10 bg-[#111827] text-white rounded-full text-xs font-bold">
                  Сохранить
                </button>
                <button
                  onClick={() => { setEditingUsername(false); setTempUsername(profileUsername) }}
                  className="flex-1 h-10 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <UserAvatar avatar={avatar} className="w-16 h-16 rounded-full overflow-hidden" />
                <div className="truncate">
                  <div className="text-base font-bold text-[#111827] truncate">{profileUsername}</div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">{profile.email || `ID: ${profile.id.substring(0, 8)}`}</div>
                </div>
              </div>
              <button
                onClick={() => setEditingUsername(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 rounded-full shrink-0 transition-colors"
              >
                Изменить
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[20px] p-4 flex items-center justify-between shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <span className="text-lg">🔔</span>
            <div>
              <div className="text-sm font-bold text-[#111827]">Уведомления</div>
              <div className="text-[11px] text-slate-400">
                {pushStatus === 'loading' && 'Проверка...'}
                {pushStatus === 'enabled' && 'Включены'}
                {pushStatus === 'disabled' && 'Выключены'}
                {pushStatus === 'blocked' && 'Заблокированы в браузере'}
                {pushStatus === 'unsupported' && 'Не поддерживаются'}
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={pushEnabled}
            onClick={() => handlePushToggle(!pushEnabled)}
            disabled={pushStatus === 'loading' || pushStatus === 'unsupported' || pushStatus === 'blocked'}
            className={`w-12 h-7 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
              pushEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'
            } ${pushStatus === 'loading' || pushStatus === 'unsupported' || pushStatus === 'blocked' ? 'opacity-50' : ''}`}
          >
            <span className="w-6 h-6 rounded-full bg-white shadow-sm block" />
          </button>
        </div>

        {pushError && <p className="text-xs text-rose-600 px-2">{pushError}</p>}

        <div className="space-y-2.5 pt-1">
          <button
            onClick={sendTestNotification}
            disabled={!pushEnabled || sendingTest}
            className={`w-full py-3.5 rounded-full px-5 flex items-center justify-center gap-2.5 text-sm font-semibold shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-colors ${
              pushEnabled && !sendingTest
                ? 'bg-white hover:bg-slate-50 text-slate-800'
                : 'bg-white/60 text-slate-300 cursor-not-allowed'
            }`}
          >
            <span>📨</span>
            <span>{sendingTest ? 'Отправка...' : 'Отправить тестовое уведомление'}</span>
          </button>

          {testResult && (
            <div className={`rounded-2xl p-3 text-xs font-medium ${testResult.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {testResult}
            </div>
          )}

          <button
            onClick={handleUpdateApp}
            className="w-full py-3.5 bg-white hover:bg-slate-50 rounded-full px-5 flex items-center justify-center gap-2.5 text-sm font-semibold text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-colors"
          >
            <span>🔄</span>
            <span>Обновить версию приложения</span>
          </button>
        </div>
      </div>

      <footer className="mt-auto pt-6 flex items-center justify-between gap-3">
        <div className="text-left leading-tight">
          <div className="text-xs font-semibold text-slate-500">PoopTrack v1.4.2</div>
          <div className="text-[10px] text-slate-400">Made by Evgen. Powered by Supabase & GitHub, 2026.</div>
        </div>
        <button onClick={onLogout} className="bg-rose-100/80 hover:bg-rose-200/80 text-rose-600 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shrink-0 transition-colors">
          <span>↪</span>
          <span>Выйти</span>
        </button>
      </footer>
    </div>
  )
}