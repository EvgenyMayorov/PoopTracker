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
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  // Push notifications state
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushStatus, setPushStatus] = useState<'loading' | 'enabled' | 'disabled' | 'blocked' | 'unsupported'>('loading')
  const [pushError, setPushError] = useState<string | null>(null)
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const updatePushStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported')
      setPushEnabled(false)
      return
    }

    try {
      const permission = Notification.permission
      if (permission === 'denied') {
        setPushStatus('blocked')
        setPushEnabled(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        setPushStatus('enabled')
        setPushEnabled(true)
      } else {
        setPushStatus('disabled')
        setPushEnabled(false)
      }
    } catch (err) {
      console.error('[Push] Status check error:', err)
      setPushStatus('disabled')
      setPushEnabled(false)
    }
  }, [])

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
    setShowAvatarPicker(false)

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
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPushError('Разрешение на уведомления не предоставлено')
        setPushStatus('blocked')
        setPushEnabled(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
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
    } catch (err: any) {
      console.error('[Push] Subscribe error:', err)
      setPushError('Ошибка подписки: ' + (err.message || 'Неизвестная ошибка'))
      setPushStatus('disabled')
      setPushEnabled(false)
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
    } catch (err: any) {
      console.error('[Push] Unsubscribe error:', err)
      setPushError('Ошибка отписки: ' + (err.message || 'Неизвестная ошибка'))
      setPushStatus('disabled')
      setPushEnabled(false)
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
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
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
    } else {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(t('testNotification'), {
        body: t('testNotificationText'),
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-notification',
        data: { test: true }
      })
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
        setTestResult('✅ Тестовое уведомление отправлено через сервер')
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

  return (
    <div className="min-h-[calc(100dvh-150px)] flex flex-col justify-between">
      <div className="space-y-4">
        <h2 className={`text-xl font-bold mb-6 ${'text-gray-800'}`}>Настройки</h2>

      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${'text-gray-600'}`}>
          👤 Аккаунт
        </h3>
        <div className={`rounded-xl p-4 ${'bg-white border-2 border-gray-200'}`}>
          {editingUsername ? (
            <div className="space-y-3">
              <input
                type="text"
                value={tempUsername}
                onChange={e => {
                  setTempUsername(e.target.value)
                  if (usernameError) setUsernameError(null)
                }}
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:border-blue-400 ${
                  'bg-gray-50 border-2 border-gray-200 text-gray-800'
                }`}
              />
              {usernameError && (
                <p className="text-sm text-red-400 mt-1">❌ {usernameError}</p>
              )}
              <div className="flex gap-2">
                <button onClick={handleSaveUsername} className="flex-1 py-2 bg-blue-500 rounded-lg text-white font-semibold">
                  Сохранить
                </button>
                <button
                  onClick={() => { setEditingUsername(false); setTempUsername(profileUsername) }}
                  className={`flex-1 py-2 rounded-lg font-semibold ${'bg-gray-100 text-gray-700'}`}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowAvatarPicker(!showAvatarPicker)} className="text-4xl hover:scale-110 transition-transform">
                    {avatar}
                  </button>
                  <div>
                    <div className={`font-semibold ${'text-gray-800'}`}>{profileUsername}</div>
                    <div className={`text-xs ${'text-gray-500'}`}>{profile.id.substring(0, 8)}...</div>
                  </div>
                </div>
                <button
                  onClick={() => setEditingUsername(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    'bg-blue-50 border-2 border-blue-200 text-blue-600'
                  }`}
                >
                  Изменить профиль
                </button>
              </div>
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                'bg-gray-50 border border-gray-200'
              }`}>
                <span className={`text-xs font-semibold ${'text-gray-500'}`}>📧 Электронная почта</span>
                <span className={`text-sm truncate max-w-[60%] text-right ${'text-gray-800'}`}>{profile.email || '—'}</span>
              </div>
            </div>
          )}

          {showAvatarPicker && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className={`text-sm mb-3 ${'text-gray-600'}`}>Выберите аватарку:</p>
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
          )}
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={onLogout}
          className={`w-full py-3 rounded-xl font-semibold ${
            'bg-red-50 border-2 border-red-200 text-red-600'
          }`}
        >
          Выйти
        </button>
      </div>

      <section className="mb-8 border-t border-gray-200 pt-6">
        <h3 className={`text-sm font-semibold mb-3 ${'text-gray-600'}`}>Push-уведомления</h3>

        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-200">
          <div>
            <div className={`font-semibold text-sm ${'text-gray-800'}`}>Push-уведомления</div>
            <div className={`text-xs mt-0.5 ${
              pushStatus === 'enabled'
                ? 'text-green-600'
                : pushStatus === 'blocked'
                  ? 'text-red-500'
                  : 'text-gray-500'
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
              pushEnabled ? 'bg-blue-500' : 'bg-gray-300'
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
          <p className="text-sm text-red-400 mt-2">{pushError}</p>
        )}

        <button
          onClick={sendTestNotification}
          disabled={!pushEnabled || sendingTest}
          className={`w-full py-2 rounded-lg font-semibold transition-colors ${
            pushEnabled && !sendingTest
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {sendingTest ? 'Отправка...' : 'Отправить тестовое уведомление'}
        </button>

        {testResult && (
          <div className={`mt-3 rounded-lg p-3 ${testResult.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {testResult}
          </div>
        )}
      </section>

      </div>

      <div className="mt-auto pt-6 pb-2 text-center text-xs text-slate-400 space-y-1">
        <div>PoopTrack v1.0.2</div>
        <div>Made by Evgen. Powered by Supabase & GitHub, 2026.</div>
      </div>
    </div>
  )
}