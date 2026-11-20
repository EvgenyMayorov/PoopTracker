import { useState, useCallback } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'
import { Comment } from './types'

export function useComments(profile: Profile | null) {
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})

  const fetchComments = useCallback(
    async (eventId: string) => {
      if (!profile) return
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true })
      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))]
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, email, avatar')
          .in('id', userIds)
        const commentsWithProfiles = commentsData.map(comment => {
          const profile = profilesData?.find(p => p.id === comment.user_id)
          return {
            id: comment.id,
            user_id: comment.user_id,
            username: profile ? getDisplayName(profile) : '',
            avatar: profile?.avatar || '💩',
            text: comment.comment_text,
            created_at: comment.created_at,
          }
        })
        setComments(prev => ({ ...prev, [eventId]: commentsWithProfiles }))
      } else {
        setComments(prev => ({ ...prev, [eventId]: [] }))
      }
    },
    [profile]
  )

  const handleAddComment = useCallback(
    async (eventId: string) => {
      if (!profile) return
      const text = newComment[eventId]?.trim()
      if (!text) return
      await supabase.from('comments').insert({ event_id: eventId, user_id: profile.id, comment_text: text })
      setNewComment(prev => ({ ...prev, [eventId]: '' }))
      fetchComments(eventId)
    },
    [profile, newComment, fetchComments]
  )

  return {
    comments,
    newComment,
    setNewComment,
    fetchComments,
    handleAddComment,
  }
}