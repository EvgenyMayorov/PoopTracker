import { useState, useEffect, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { t } from '../i18n'
import { UserAvatar, AVATARS_3D, AVATAR_3D_IDS, getAvatarUrl, is3DAvatarKey } from './UserAvatar'
import { usePush, PUSH_PERMISSION_HINT } from '../hooks/use-push'
import { getDisplayName } from '../lib/displayName'

interface SettingsTabProps {
  profile: Profile
  onLogout: () => void
  onApplyUpdate?: () => void
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

export function SettingsTab({ profile, onLogout, onApplyUpdate }: SettingsTabProps) {
  const [editingUsername, setEditingUsername] = useState(false)
  const [tempUsername, setTempUsername] = useState(profile.username)
  const [profileUsername, setProfileUsername] = useState(profile.username)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string>(() => {
    // Если profile.avatar является ключом нового 3D-аватара — используем его напрямую,
    // иначе проверяем localStorage, а старые эмодзи или null дают дефолтный аватар.
    if (profile?.avatar && is3DAvatarKey(profile.avatar)) {
      return profile.avatar
    }
    const stored = localStorage.getItem('poop_avatar')
    if (stored && is3DAvatarKey(stored)) {
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
      const stored = localStorage.getItem('poop_push_enabled')
      const isGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted'
      // Если пользователь ранее явно выключал — выключаем.
      if (stored === 'false') return false
      // Если разрешение есть и пользователь не выключал явно — включаем.
      if (isGranted && stored !== 'false') return true
      // По умолчанию — как раньше.
      return stored === 'true'
    } catch {
      return typeof Notification !== 'undefined' && Notification.permission === 'granted'
    }
  })
  const [pushStatus, setPushStatus] = useState<'loading' | 'enabled' | 'disabled' | 'blocked' | 'unsupported'>('loading')
  const [pushError, setPushError] = useState<string | null>(null)

  // === Модалка удаления профиля ====
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const openDeleteModal = () => {
    setDeleteError(null)
    setIsDeleteModalOpen(true)
  }

  // Полное удаление профиля и аккаунта (включая запись в auth.users через RPC Supabase)
  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const { error } = await supabase.rpc('delete_user_account')
      if (error) {
        console.error('[Settings] Ошибка удаления аккаунта:', error)
        setDeleteError(error.message || 'Не удалось удалить профиль')
        return
      }
      // Очищаем локальное состояние
      try {
        localStorage.removeItem('poop_avatar')
        localStorage.removeItem('poop_push_enabled')
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('poop_pending_username_')) localStorage.removeItem(key)
        })
      } catch { /* ignore */ }
      setIsDeleteModalOpen(false)
      // Выходим из аккаунта — App покажет экран входа/регистрации
      await supabase.auth.signOut()
      onLogout()
    } catch (err: any) {
      console.error('[Settings] Исключение при удалении аккаунта:', err)
      setDeleteError(err?.message || 'Неизвестная ошибка при удалении аккаунта')
    } finally {
      setIsDeleting(false)
    }
  }

  // === Модалка диагностики Push-уведомлений ===
  const [isPushDiagnosticOpen, setIsPushDiagnosticOpen] = useState(false)
  const [modalSendingTest, setModalSendingTest] = useState(false)
  const [modalTestResult, setModalTestResult] = useState<string | null>(null)
  const [modalDevicePermission, setModalDevicePermission] = useState<NotificationPermission | 'unsupported'>(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [modalDeviceSubscriptionActive, setModalDeviceSubscriptionActive] = useState(false)
  const [modalCheckingDevice, setModalCheckingDevice] = useState(false)
  const [modalReconnecting, setModalReconnecting] = useState(false)
  const [modalReconnectResult, setModalReconnectResult] = useState<string | null>(null)
  const { requestPermissionAndSubscribe, getDeviceState: fetchDeviceState } = usePush()

  // === Заблокированные пользователи ===
  const [blockedUsers, setBlockedUsers] = useState<Array<{ id: string; user_id: string; username: string; avatar: string | null }>>([])
  const [isBlockedLoading, setIsBlockedLoading] = useState(false)

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

  // === Заблокированные пользователи ===
  const fetchBlockedUsers = async () => {
    if (!profile?.id) return
    setIsBlockedLoading(true)
    try {
      const { data } = await supabase
        .from('blocked_users')
        .select('blocked_id, created_at')
        .eq('blocker_id', profile.id)
      if (data && data.length > 0) {
        const blockedIds = data.map((d) => d.blocked_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, email, avatar')
          .in('id', blockedIds)
        setBlockedUsers(
          (profilesData || []).map((p) => ({
            id: p.id,
            user_id: p.id,
            username: getDisplayName(p),
            avatar: p.avatar || '💩',
          }))
        )
      } else {
        setBlockedUsers([])
      }
    } catch (err) {
      console.error('[Settings] Ошибка загрузки заблокированных:', err)
    } finally {
      setIsBlockedLoading(false)
    }
  }

  useEffect(() => {
    fetchBlockedUsers()
  }, [fetchBlockedUsers])

  const handleUnblock = async (blockedUserId: string) => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', profile.id)
        .eq('blocked_id', blockedUserId)
      if (error) {
        console.error('[Settings] Ошибка разблокировки:', error)
        return
      }
      setBlockedUsers((prev) => prev.filter((b) => b.user_id !== blockedUserId))
    } catch (err) {
      console.error('[Settings] Ошибка разблокировки:', err)
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
      // Не сбрасываем тумблер, если браузер не поддерживает Push — оставляем сохраненное состояние
      return
    }

    try {
      const permission = Notification.permission

      // Тумблер можно сбросить в false ТОЛЬКО в двух случаях:
      // 1) пользователь сам выключил его (localStorage 'false'),
      // 2) разрешение уведомлений == 'denied'.
      if (permission === 'denied') {
        setPushStatus('blocked')
        setPushEnabled(false)
        cachePushStatus(false)
        return
      }

      const stored = localStorage.getItem('poop_push_enabled')

      // Пользователь явно выключил уведомления ранее — не включаем автоматически.
      if (stored === 'false') {
        setPushEnabled(false)
        setPushStatus('disabled')
        return
      }

      // Если разрешение granted — всегда держим тумблер включённым (ON),
      // даже если временная проверка подписки вернула null. Пользователь уже
      // дал согласие, поэтому молча переподписываем устройство и синхронизируем
      // push_subscriptions в Supabase, не сбрасывая тумблер.
      if (permission === 'granted') {
        setPushEnabled(true)
        setPushStatus('enabled')
        cachePushStatus(true)

        let browserSubscription: PushSubscription | null = null
        let registrationObj: ServiceWorkerRegistration | null = null
        try {
          const reg = await getRegistrationWithTimeout()
          registrationObj = reg
          if (reg) {
            browserSubscription = await reg!.pushManager.getSubscription()
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

        // 1) Подписка уже есть в браузере — просто синхронизируем запись в БД.
        if (browserSubscription) {
          if (profile?.id) {
            try {
              await supabase
                .from('push_subscriptions')
                .upsert({
                  user_id: profile.id,
                  endpoint: browserSubscription!.endpoint,
                  p256dh: arrayBufferToBase64(browserSubscription!.getKey('p256dh')!),
                  auth: arrayBufferToBase64(browserSubscription!.getKey('auth')!),
                  updated_at: new Date().toISOString()
                }, { onConflict: 'endpoint' })
            } catch (err) {
              console.warn('[Push] Tikhaya синхронизация push_subscriptions:', err)
            }
          }
          return
        }

        // 2) Подписки в браузере нет, но есть запись в БД — восстанавливаем
        //    подписку в браузере из записи в БД (если SW доступен).
        if (dbSubscription && registrationObj && profile?.id) {
          try {
            const subscription = await registrationObj!.pushManager.subscribe({
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
              }, { onConflict: 'endpoint' })
          } catch (err) {
            console.warn('[Push] Не удалось восстановить SW-подписку:', err)
          }
          return
        }

        // 3) Ни подписки в браузере, ни записи в БД нет, но разрешение granted —
        //    молча переподписываем устройство и создаём запись в push_subscriptions.
        if (!dbSubscription && registrationObj && profile?.id) {
          try {
            const newSubscription = await registrationObj!.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
            })
            await supabase
              .from('push_subscriptions')
              .upsert({
                user_id: profile.id,
                endpoint: newSubscription.endpoint,
                p256dh: arrayBufferToBase64(newSubscription.getKey('p256dh')!),
                auth: arrayBufferToBase64(newSubscription.getKey('auth')!),
                updated_at: new Date().toISOString()
              }, { onConflict: 'endpoint' })
          } catch (err) {
            console.warn('[Push] Auto-resubscribe failed:', err)
          }
        }
        return
      }

      // Разрешение не granted и не denied (например, 'default') — тумблер выключен.
      setPushEnabled(false)
      setPushStatus('disabled')
    } catch (err) {
      console.error('[Push] Status check error:', err)
      // НЕ сбрасываем тумблер при ошибке проверки — оставляем сохранённое состояние.
    }
  }, [profile?.id])

  useEffect(() => {
    updatePushStatus()
  }, [updatePushStatus])

  // При открытии модалки диагностики Push-уведомлений асинхронно
  // проверяем актуальное состояние подписки текущего устройства,
  // чтобы корректно отображать «Активна»/«Проверка...»/«Не создана».
  useEffect(() => {
    if (!isPushDiagnosticOpen) return
    let cancelled = false
    const refreshDeviceState = async () => {
      setModalCheckingDevice(true)
      try {
        const state = await fetchDeviceState()
        if (cancelled) return
        setModalDevicePermission(state.permission)
        setModalDeviceSubscriptionActive(state.subscriptionActive)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setModalCheckingDevice(false)
      }
    }
    refreshDeviceState()
    return () => {
      cancelled = true
    }
  }, [isPushDiagnosticOpen, fetchDeviceState])

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
      const result = await requestPermissionAndSubscribe(profile.id)
      // Обновить статус устройства после подписки
      try {
        const state = await fetchDeviceState()
        setModalDevicePermission(state.permission)
        setModalDeviceSubscriptionActive(state.subscriptionActive)
      } catch {
        // ignore
      }

      if (!result.ok) {
        setPushError(result.message || PUSH_PERMISSION_HINT)
        setPushStatus(result.permission === 'denied' ? 'blocked' : 'disabled')
        setPushEnabled(false)
        cachePushStatus(false)
        return
      }
      setPushStatus('enabled')
      setPushEnabled(true)
      cachePushStatus(true)
    } catch (err: any) {
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

  const handleReconnectDevice = async () => {
    setPushError(null)
    setModalReconnectResult(null)
    setModalReconnecting(true)
    setPushStatus('loading')

    try {
      const result = await requestPermissionAndSubscribe(profile.id, true)
      // Обновить статус устройства после переподключения
      try {
        const state = await fetchDeviceState()
        setModalDevicePermission(state.permission)
        setModalDeviceSubscriptionActive(state.subscriptionActive)
      } catch {
        // ignore
      }

      if (!result.ok) {
        setPushError(result.message || PUSH_PERMISSION_HINT)
        setModalReconnectResult('❌ ' + (result.message || 'Подписка не создана'))
        setPushStatus(result.permission === 'denied' ? 'blocked' : 'disabled')
        setPushEnabled(false)
        cachePushStatus(false)
        return
      }
      setPushStatus('enabled')
      setPushEnabled(true)
      cachePushStatus(true)
      setModalReconnectResult('✅ Это устройство переподключено: новая подписка пересоздана и сохранена в push_subscriptions')
    } finally {
      setModalReconnecting(false)
    }
  }

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribeToPush()
    } else {
      await unsubscribeFromPush()
    }
  }

  const sendTestNotification = async () => {
    setIsPushDiagnosticOpen(true)
    setModalSendingTest(true)
    setModalTestResult(null)

    // Проверяем актуальное состояние подписки текущего устройства
    try {
      setModalCheckingDevice(true)
      const state = await fetchDeviceState()
      setModalDevicePermission(state.permission)
      setModalDeviceSubscriptionActive(state.subscriptionActive)
    } catch {
      // ignore
    } finally {
      setModalCheckingDevice(false)
    }

    try {
      // 1. Убедиться, что подписка актуальна в БД (upsert текущей подписки браузера)
      const registration = await navigator.serviceWorker.ready
      const browserSub = await registration.pushManager.getSubscription()
      if (browserSub && profile.id) {
        const { error: upsertError } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: profile.id,
            endpoint: browserSub.endpoint,
            p256dh: arrayBufferToBase64(browserSub.getKey('p256dh')!),
            auth: arrayBufferToBase64(browserSub.getKey('auth')!),
            updated_at: new Date().toISOString()
          }, { onConflict: 'endpoint' })

        if (upsertError) {
          console.error('[Push] Upsert subscription error:', upsertError)
        }
      }

      // 2. Проверяем, есть ли подписка в БД
      const { data: subData, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', profile.id)
        .single()

      if (subError || !subData) {
        setModalTestResult('❌ Подписка на пуш-уведомления не найдена в БД. Включите уведомления в настройках и попробуйте снова.')
        return
      }

      // 3. Отправляем реальный серверный push через Edge Function send-push
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          userId: profile.id,
          title: t('testNotification'),
          body: t('testNotificationText'),
          data: { test: true }
        }
      })

      if (error) {
        setModalTestResult('❌ Ошибка отправки: ' + (error.message || 'Неизвестная ошибка'))
        return
      }

      // 4. Честная оценка результата по данным из функции
      const found = data?.found ?? 0
      const sent = data?.sent ?? 0
      const errors = data?.errors ?? []

      // Формируем человекочитаемый статус по шагам для диагностики
      const serverResp = error ? (error.message || 'Error') : `found=${found} sent=${sent} failed=${data?.failed ?? 0}`
      const steps = [
        '✅ Подписка сохранена в БД',
        `🔎 Запрос к send-push отправлен: userId=${profile.id.slice(0, 8)}…`,
        `📡 Ответ сервера: ${serverResp}`,
      ]
      if (sent > 0) {
        setModalTestResult(`✅ Серверное Push-уведомление отправлено! (доставлено: ${sent}) ${steps.join(' → ')}`)
        // После успешной отправки тестового пуша подписка считается активной
        setModalDeviceSubscriptionActive(true)
        setModalDevicePermission(Notification.permission)
      } else if (found === 0) {
        setModalTestResult(`❌ Подписка не найдена в БД. Включите уведомления в настройках и попробуйте снова.`)
      } else if (errors.length > 0) {
        setModalTestResult(`❌ Ошибка доставки: ${errors[0]}. Найдено подписок в БД: ${found}.`)
      } else {
        setModalTestResult(`❌ Уведомление не доставлено. Найдено подписок в БД: ${found}.`)
      }
    } catch (err: any) {
      console.error('[Push] Test notification error:', err)

      let details = err?.message || 'Неизвестная ошибка'
      setModalTestResult(`❌ Ошибка: ${details}`)
    } finally {
      setModalSendingTest(false)
    }
  }

  const handleUpdateApp = async () => {
    if (onApplyUpdate) {
      await onApplyUpdate()
      return
    }
    // Fallback: очистка кэшей и обновление SW без пропса
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
      setModalTestResult(null)
      setTimeout(() => window.location.reload(), 300)
    } catch (err) {
      console.error('[Settings] Ошибка обновления PWA:', err)
      setTimeout(() => window.location.reload(), 1000)
    }
  }

   return (
    <div className="min-h-[calc(100dvh-4.5rem)] flex flex-col justify-between px-4 pt-5 pb-36">
      <div className="space-y-3">
        <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 leading-none mb-4">
          Настройки
        </h1>

        <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          {editingUsername ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5">Новое имя пользователя</p>
                <input
                  type="text"
                  value={tempUsername}
                  onChange={e => {
                    setTempUsername(e.target.value)
                    if (usernameError) setUsernameError(null)
                  }}
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm text-slate-900 focus:outline-none focus:border-[#111827]"
                />
              </div>
              {usernameError && <p className="text-xs text-rose-600">{usernameError}</p>}


              <div className="pt-2">
                <p className="text-xs font-semibold text-slate-500 mb-2">Выберите аватар:</p>
                <div className="grid grid-cols-4 gap-3 justify-items-center max-h-[280px] overflow-y-auto pr-1">
                  {AVATARS_3D.map((avatarInfo) => (
                    <button
                      key={avatarInfo.id}
                      onClick={() => handleSaveAvatar(avatarInfo.id)}
                      className={`flex items-center justify-center rounded-full overflow-hidden w-16 h-16 transition-colors cursor-pointer select-none ${avatar === avatarInfo.id ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                    >
                      <img
                        src={getAvatarUrl(avatarInfo.fileName)}
                        alt={avatarInfo.label}
                        className="w-14 h-14 object-cover rounded-full"
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
              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={openDeleteModal}
                  className="w-full bg-transparent border border-rose-300 hover:bg-rose-100/60 text-rose-600 text-[11px] font-bold px-3.5 py-1.5 rounded-full flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>🗑️</span>
                  <span>Удалить профиль</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col items-start text-left flex-1 min-w-0 gap-1">
                <div className="text-2xl font-extrabold text-slate-900 truncate max-w-full">{profileUsername}</div>
                <div className="text-sm text-slate-500 truncate max-w-full">{profile.email || `ID: ${profile.id.substring(0, 8)}`}</div>
                <button
                  type="button"
                  onClick={() => setEditingUsername(true)}
                  className="mt-2 self-start bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors"
                >
                  Изменить
                </button>
              </div>
              <div className="shrink-0">
                <UserAvatar
                  avatar={avatar}
                  containerClassName="w-28 h-28 rounded-full overflow-hidden shrink-0"
                  className="text-4xl"
                />
              </div>
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

        <div className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-lg">🚫</span>
            <div>
              <div className="text-sm font-bold text-[#111827]">Заблокированные пользователи</div>
              <div className="text-[11px] text-slate-400">Люди, которых вы заблокировали. Они не смогут подписываться на вас.</div>
            </div>
          </div>

          {isBlockedLoading ? (
            <div className="text-sm text-slate-400">Загрузка...</div>
          ) : blockedUsers.length === 0 ? (
            <div className="text-sm text-slate-400">Вы ни на кого не заблокировали</div>
          ) : (
            <div className="space-y-2.5">
              {blockedUsers.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar avatar={b.avatar || null} containerClassName="w-10 h-10 rounded-full overflow-hidden shrink-0" />
                    <div className="text-sm font-semibold text-slate-900 truncate">{b.username}</div>
                  </div>
                  <button
                    onClick={() => handleUnblock(b.user_id)}
                    className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-full transition-colors"
                  >
                    Разблокировать
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      <div className="space-y-2.5 pt-1">
        <button
          onClick={sendTestNotification}
          disabled={!pushEnabled}
          className={`w-full py-3.5 rounded-full px-5 flex items-center justify-center gap-2.5 text-sm font-semibold shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-colors ${
            pushEnabled ? 'bg-white hover:bg-slate-50 text-slate-800' : 'bg-white/60 text-slate-300 cursor-not-allowed'
          }`}
        >
          <span>📨</span>
          <span>Отправить тестовое уведомление</span>
        </button>

        <button
          onClick={handleUpdateApp}
          className="w-full py-3.5 bg-white hover:bg-slate-50 rounded-full px-5 flex items-center justify-center gap-2.5 text-sm font-semibold text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-colors"
        >
          <span>🔄</span>
          <span>Обновить версию приложения</span>
        </button>
      </div>
    </div>

      <footer className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[640px] z-30 px-4 py-2.5 bg-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-between gap-3 text-slate-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
          <div className="text-left leading-tight">
            <div className="text-xs font-semibold text-slate-700">PoopTrack v{__APP_VERSION__}</div>
            <div className="text-[10px] text-slate-600">Made by Evgen. Powered by Supabase & GitHub, 2026.</div>
          </div>
          <button onClick={onLogout} className="pointer-events-auto bg-rose-100/80 hover:bg-rose-200/80 text-rose-600 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 shrink-0 transition-colors">
            <span>↪</span>
            <span>Выйти</span>
          </button>
        </div>
      </footer>

    {/* Модальное окно диагностики Push-уведомлений */}
    {isPushDiagnosticOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsPushDiagnosticOpen(false)
        }}
      >
        {/* Затемнённый фон */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        {/* Модалка */}
        <div className="relative bg-white rounded-[20px] p-5 shadow-2xl border border-slate-200 w-full max-w-md max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Диагностика Push-уведомлений</h2>
            <button
              onClick={() => setIsPushDiagnosticOpen(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          {/* Статус отправки тестового уведомления */}
          <div className="space-y-3 mb-5">
            <div className="text-sm font-semibold text-slate-700">Тестовое уведомление</div>
            {modalSendingTest ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <span className="text-sm text-blue-700">Отправка тестового пуша…</span>
              </div>
            ) : null}
            {modalTestResult && (
              <div className={`rounded-xl p-3 text-xs font-medium ${modalTestResult.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                {modalTestResult}
              </div>
            )}
          </div>

          {/* Блок состояния устройства */}
          <div className="space-y-3 mb-5">
            <div className="text-sm font-semibold text-slate-700">Состояние устройства</div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className="text-xs text-slate-500 leading-relaxed">
                Права браузера: {modalDevicePermission === 'unsupported' ? 'неизвестно' : modalDevicePermission} | Подписка этого устройства: {modalDeviceSubscriptionActive ? 'Активна' : modalCheckingDevice ? 'Проверка...' : 'Не создана'}
              </div>
            </div>
          </div>

          {/* Кнопка переподключения и результат */}
          <div className="space-y-2">
            <button
              onClick={handleReconnectDevice}
              disabled={modalReconnecting}
              className={`w-full py-3 rounded-full text-[10px] px-4 flex items-center justify-center gap-1 text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 ${modalReconnecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {modalReconnecting ? 'Переподключаем…' : '🔗 Переподключить это устройство'}
            </button>
            {modalReconnectResult && (
              <p className={`text-xs px-2 ${modalReconnectResult.startsWith('✅') ? 'text-emerald-600' : 'text-rose-600'}`}>
                {modalReconnectResult}
              </p>
            )}
          </div>


          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={() => setIsPushDiagnosticOpen(false)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 text-sm font-semibold transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    )}
    {isDeleteModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) setIsDeleteModalOpen(false)
      }}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white rounded-[20px] p-5 shadow-2xl border border-slate-200 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Удалить профиль</h2>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          {/* Предупреждение */}
          <div className="space-y-3 mb-5">
            <div className="text-sm font-semibold text-slate-700">Удаление профиля?</div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Вы уверены, что хотите навсегда удалить свой профиль и все записи? Это действие необратимо.
            </p>
            {deleteError && (
              <div className="mt-3 rounded-lg p-3 text-xs bg-red-50 border border-red-200 text-red-700">❌ {deleteError}</div>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Удаляем…' : 'Удалить навсегда'}
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    )}


    </div>
  )
}