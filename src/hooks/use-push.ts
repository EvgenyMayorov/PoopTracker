import { useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'

export function usePush() {
  const sendPushToUser = useCallback(async (userId: string, title: string, body: string) => {
    try {
      await supabase.functions.invoke('send-push', { body: { userId, title, body } })
    } catch (err) {
      console.warn('[Push] Не удалось отправить push:', err)
    }
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
        if (eventData && eventData.user_id && eventData.user_id !== actorProfile.id) {
          const reactNames: Record<'thumbs_up' | 'heart' | 'poop', string> = { thumbs_up: '👍', heart: '❤️', poop: '💩' }
          const actorName = getDisplayName(actorProfile)
          const bodyText = `${actorName} ${currentReaction ? 'обновил' : 'поставил'} реакцию ${reactNames[reactionType]} под записью`
          await sendPushToUser(eventData.user_id, 'Реакция на запись', bodyText)
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
        if (eventData && eventData.user_id && eventData.user_id !== actorProfile.id) {
          const actorName = getDisplayName(actorProfile)
          const bodyText = `${actorName} прокомментировал: "${commentText.slice(0, 50)}${commentText.length > 50 ? '...' : ''}"`
          await sendPushToUser(eventData.user_id, 'Комментарий к записи', bodyText)
        }
      } catch (err) {
        console.warn('[Push] Ошибка при отправке push комментария:', err)
      }
    },
    [sendPushToUser]
  )

  return {
    sendPushToUser,
    notifyFollowers,
    notifyReaction,
    notifyComment,
  }
}