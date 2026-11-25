import { useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'

// VAPID public key (safe to embed in client)
const VAPID_PUBLIC_KEY = 'BB9szPlMVlU9KtLpwYqFYOMOLpNo-Nb-xsbP3y18lAIM-29drXGSm0_-6RlzIfHvwj0V8VHX0wSt1Ym2LBRNDaE'

export const PUSH_PERMISSION_HINT =
  'Разрешите уведомления в настройках телефона для приложения PoopTrack'

export const DEFAULT_PUSH_TITLE = 'PoopTrack'
export const DEFAULT_PUSH_BODY = 'Новое уведомление!'

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

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

async function getActiveRegistration(timeoutMs = 10000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  try {
    // Регистрация идемпотентна — если SW уже активен, возвращает его.
    await navigator.serviceWorker.register('./custom-sw.js', { scope: './' })
  } catch (err) {
    console.warn('[Push] Ошибка регистрации Service Worker:', err)
  }

  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs)
  })

  try {
    const registration = (await Promise.race([
      navigator.serviceWorker.ready,
      timeout,
    ])) as ServiceWorkerRegistration | null
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    return registration ?? null
  } catch {
    return null
  }
}

async function saveSubscriptionToDb(userId: string, subscription: PushSubscription): Promise<void> {
  const p256dhKey = subscription.getKey('p256dh')
  const authKey = subscription.getKey('auth')
  if (!p256dhKey || !authKey) {
    throw new Error('Подписка не содержит ключей p256dh/auth')
  }
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(p256dhKey),
      auth: arrayBufferToBase64(authKey),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}

async function createSubscription(
  registration: ServiceWorkerRegistration,
  forceResubscribe: boolean
): Promise<PushSubscription> {
  let subscription = await registration.pushManager.getSubscription()

  if (subscription && forceResubscribe) {
    try {
      await subscription.unsubscribe()
    } catch (err) {
      console.warn('[Push] Ошибка отписки старой подписки:', err)
    }
    subscription = null
  }

  if (subscription) {
    return subscription
  }

  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    })
  } catch (err: any) {
    // Старые подписки, созданные с другим applicationServerKey, требуют пересоздания.
    if (err && (err.name === 'InvalidStateError' || err.name === 'AbortError')) {
      const stale = await registration.pushManager.getSubscription()
      if (stale) {
        try {
          await stale.unsubscribe()
        } catch (err2) {
          console.warn('[Push] Ошибка отписки устаревшей подписки:', err2)
        }
      }
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      })
    } else {
      throw err
    }
  }

  if (!subscription) {
    throw new Error('Не удалось получить push-подписку')
  }

  return subscription
}

export type PushDeviceState = {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  subscriptionActive: boolean
}

export type PushSubscribeResult = PushDeviceState & {
  ok: boolean
  message?: string
}

export function usePush() {
  const sendPushToUser = useCallback(async (userId: string, title: string, body: string) => {
    try {
      await supabase.functions.invoke('send-push', { body: { userId, title, body } })
    } catch (err) {
      console.warn('[Push] Не удалось отправить push:', err)
    }
  }, [])

  const createSubscriptionBound = useCallback(
    async (registration: ServiceWorkerRegistration, forceResubscribe: boolean): Promise<PushSubscription> =>
      createSubscription(registration, forceResubscribe),
    []
  )

  // Запрос прав у пользователя + создание/сохранение подписки этого устройства.
  const requestPermissionAndSubscribe = useCallback(
    async (userId: string, forceResubscribe = false): Promise<PushSubscribeResult> => {
      if (!isPushSupported()) {
        return {
          ok: false,
          supported: false,
          permission: 'unsupported',
          subscriptionActive: false,
          message: 'Этот браузер не поддерживает Push-уведомления',
        }
      }

      // 1) Явный запрос разрешения — обязательно по прямому клику пользователя
      //    (критично для iOS Safari PWA, где автоматический запрос блокируется).
      let permission: NotificationPermission = Notification.permission
      try {
        permission = await Notification.requestPermission()
      } catch (err) {
        console.warn('[Push] Ошибка requestPermission:', err)
      }

      if (permission !== 'granted') {
        return {
          ok: false,
          supported: true,
          permission,
          subscriptionActive: false,
          message: PUSH_PERMISSION_HINT,
        }
      }

      // 2) Обеспечиваем регистрацию/активацию Service Worker.
      const registration = await getActiveRegistration()
      if (!registration) {
        return {
          ok: false,
          supported: true,
          permission: 'granted',
          subscriptionActive: false,
          message: 'Service Worker не активировался. Перезагрузите приложение и попробуйте снова.',
        }
      }

      // 3) Создаём/используем свежую подписку текущего устройства и сохраняем её в БД.
      try {
        const subscription = await createSubscriptionBound(registration, forceResubscribe)
        await saveSubscriptionToDb(userId, subscription)
        return { ok: true, supported: true, permission: 'granted', subscriptionActive: true }
      } catch (err: any) {
        console.error('[Push] Не удалось подписаться на push:', err)
        let subscriptionActive = false
        try {
          subscriptionActive = !!(await registration.pushManager.getSubscription())
        } catch (err2) {
          console.warn('[Push] Ошибка проверки подписки после неудачной регистрации:', err2)
        }
        return {
          ok: false,
          supported: true,
          permission: 'granted',
          subscriptionActive,
          message: 'Не удалось создать push-подписку: ' + (err?.message || 'неизвестная ошибка'),
        }
      }
    },
    [createSubscriptionBound]
  )

  const getDeviceState = useCallback(async (): Promise<PushDeviceState> => {
    if (!isPushSupported()) {
      return { supported: false, permission: 'unsupported', subscriptionActive: false }
    }
    const permission = Notification.permission
    let subscriptionActive = false
    try {
      // Используем navigator.serviceWorker.ready — ждём готовности SW и проверяем
      // актуальную подписку. getRegistration() может вернуть null раньше, чем SW
      // успел активироваться, поэтому для корректного состояния используем ready.
      const registration = (await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration | null>((resolve) =>
          setTimeout(() => resolve(null), 10000)
        ),
      ])) as ServiceWorkerRegistration | null
      if (registration) {
        subscriptionActive = !!(await registration.pushManager.getSubscription())
      }
    } catch (err) {
      console.warn('[Push] Ошибка получения состояния подписки:', err)
    }
    return { supported: true, permission, subscriptionActive }
  }, [])

  const notifyFollowers = useCallback(
    async (profile: Profile, bristolType: number) => {
      const pushBody =
        bristolType <= 2
          ? `${getDisplayName(profile)} сбросил кирпичи 🧱`
          : bristolType <= 4
            ? `У ${getDisplayName(profile)} идеальный стул! 🏆`
            : `${getDisplayName(profile)} сбросил термоядерные отходы ☢️`
      try {
        const { data: followersData } = await supabase
          .from('friends')
          .select('follower_id')
          .eq('user_id', profile.id)
        const followersList = (followersData || []) as any[]
        for (const f of followersList) {
          if (f.follower_id === profile.id) continue
          await sendPushToUser(f.follower_id, 'PoopTrack', pushBody)
        }
      } catch (err) {
        console.warn('[Push] Ошибка отправки подписчикам:', err)
      }
    },
    [sendPushToUser]
  )

  const notifyReaction = useCallback(
    async (eventId: string, reactionType: 'thumbs_up' | 'heart' | 'poop', actorProfile: Profile, currentReaction?: string) => {
      try {
        const { data: eventData } = await supabase.from('events').select('user_id').eq('id', eventId).single()
        // Push отправляется только при новой/заменяемой реакции на чужую запись
        // currentReaction === reactionType  -> удаление реакции (повторный клик по той же)
        if (eventData && eventData.user_id && eventData.user_id !== actorProfile.id && currentReaction !== reactionType) {
          const reactNames: Record<'thumbs_up' | 'heart' | 'poop', string> = { thumbs_up: '👍', heart: '❤️', poop: '💩' }
          const emoji = reactNames[reactionType]
          const senderName = getDisplayName(actorProfile) || 'Друг'
          const bodyText = `${senderName} отреагировал(а) ${emoji} на вашу запись`

          // 1) Серверный Web Push (fire-and-forget, не блокирует UI)
          sendPushToUser(eventData.user_id, 'PoopTrack', bodyText)

          // 2) Создание уведомления в таблице notifications для колокольчика в приложении
          try {
            await supabase.from('notifications').insert({
              user_id: eventData.user_id,
              friend_id: actorProfile.id,
              friend_username: senderName,
              notification_type: 'reaction',
              event_id: eventId,
              reaction_type: reactionType,
            })
          } catch (notifErr) {
            console.warn('[Push] Не удалось создать уведомление реакции:', notifErr)
          }
        }
      } catch (err) {
        console.warn('[Push] Ошибка при отправке push реакции:', err)
      }
    },
    [sendPushToUser]
  )

  const notifyComment = useCallback(
    async (eventId: string, actorProfile: Profile, commentText: string) => {
      try {
        const { data: eventData } = await supabase.from('events').select('user_id').eq('id', eventId).single()
        // Push отправляется только при комментарии к чужой записи
        if (eventData && eventData.user_id && eventData.user_id !== actorProfile.id) {
          const senderName = getDisplayName(actorProfile) || 'Друг'
          const trimmed = commentText.trim()
          const displayText = trimmed.length > 80 ? trimmed.slice(0, 80).trimEnd() + '...' : trimmed
          const bodyText = `${senderName} прокомментировал(а) вашу запись: "${displayText}"`

          // 1) Серверный Web Push (fire-and-forget, не блокирует UI)
          sendPushToUser(eventData.user_id, 'PoopTrack', bodyText)

          // 2) Создание уведомления в таблице notifications для колокольчика в приложении
          try {
            await supabase.from('notifications').insert({
              user_id: eventData.user_id,
              friend_id: actorProfile.id,
              friend_username: senderName,
              notification_type: 'comment',
              event_id: eventId,
              comment_text: displayText,
            })
          } catch (notifErr) {
            console.warn('[Push] Не удалось создать уведомление комментария:', notifErr)
          }
        }
      } catch (err) {
        console.warn('[Push] Ошибка при отправке push комментария:', err)
      }
    },
    [sendPushToUser]
  )

  return {
    sendPushToUser,
    requestPermissionAndSubscribe,
    getDeviceState,
    notifyFollowers,
    notifyReaction,
    notifyComment,
  }
}
