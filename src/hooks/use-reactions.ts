import { useState, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { ReactionCounts } from './types'

export function useReactions(profile: Profile | null) {
  const [reactions, setReactions] = useState<Record<string, ReactionCounts>>({})

  const fetchReactions = useCallback(
    async (eventId: string) => {
      if (!profile) return
      const { data } = await supabase.from('reactions').select('*').eq('event_id', eventId)
      if (data) {
        const reactionCounts: ReactionCounts = {
          thumbs_up: data.filter(r => r.reaction_type === 'thumbs_up').length,
          heart: data.filter(r => r.reaction_type === 'heart').length,
          poop: data.filter(r => r.reaction_type === 'poop').length,
          userReaction: data.find(r => r.user_id === profile.id)?.reaction_type,
        }
        setReactions(prev => ({ ...prev, [eventId]: reactionCounts }))
      }
    },
    [profile]
  )

  const handleReaction = useCallback(
    async (eventId: string, reactionType: 'thumbs_up' | 'heart' | 'poop') => {
      if (!profile) return
      const currentReaction = reactions[eventId]?.userReaction

      if (currentReaction === reactionType) {
        await supabase.from('reactions').delete().eq('event_id', eventId).eq('user_id', profile.id)
      } else {
        await supabase
          .from('reactions')
          .upsert({ event_id: eventId, user_id: profile.id, reaction_type: reactionType }, { onConflict: 'event_id, user_id' })
      }
      fetchReactions(eventId)
    },
    [profile, reactions, fetchReactions]
  )

  return {
    reactions,
    fetchReactions,
    handleReaction,
    setReactions,
  }
}