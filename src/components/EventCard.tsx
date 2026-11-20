import React from 'react'
import { Event } from '../hooks/types'
import { getBristolDescription } from '../lib/bristol'
import { formatTimeAgo } from '../lib/formatTimeAgo'

interface EventCardProps {
  event: Event
  profile: { id: string; username: string; avatar: string }
  reactions: { thumbs_up: number; heart: number; poop: number; userReaction?: string }
  comments: Array<{ id: string; user_id: string; username: string; avatar: string; text: string; created_at: string }>
  newComment: string
  setNewComment: (value: string) => void
  formatTimeAgo: (date: string) => string
  onReaction: (eventId: string, type: 'thumbs_up' | 'heart' | 'poop') => void
  onAddComment: (eventId: string) => void
  onDeleteEvent: (eventId: string) => void
  onEditEvent: (eventId: string) => void
  isOwnEvent: boolean
  highlightedEventId?: string | null
}

export function EventCard({
  event,
  profile,
  reactions,
  comments,
  newComment,
  setNewComment,
  formatTimeAgo,
  onReaction,
  onAddComment,
  onDeleteEvent,
  onEditEvent,
  isOwnEvent,
  highlightedEventId,
}: EventCardProps) {
  const eventProfile = event.profiles
  const authorName = eventProfile ? (eventProfile.username || 'Unknown') : 'Unknown'
  const authorAvatar = eventProfile?.avatar || '💩'

  const bristolDesc = event.bristol_type ? getBristolDescription(event.bristol_type) : ''

  return (
    <div className="rounded-2xl p-3.5 bg-white shadow-[0_4px_16px_-4px_rgba(15,23,42,0.05)] space-y-2.5">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-slate-100 text-xs flex items-center justify-center shrink-0">
          {authorAvatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-900 truncate">{authorName}</span>
            <span className="text-xs text-slate-400 tabular-nums">{formatTimeAgo(event.created_at)}</span>
          </div>
          {bristolDesc && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60 mt-1">
              {bristolDesc}
            </span>
          )}
        </div>
      </div>

      {(reactions.thumbs_up > 0 || reactions.heart > 0 || reactions.poop > 0) && (
        <div className="flex gap-2">
          {reactions.thumbs_up > 0 && (
            <span className="h-7 px-2 rounded-md text-xs border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 tabular-nums flex items-center gap-1">
              👍 {reactions.thumbs_up}
            </span>
          )}
          {reactions.heart > 0 && (
            <span className="h-7 px-2 rounded-md text-xs border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 tabular-nums flex items-center gap-1">
              ❤️ {reactions.heart}
            </span>
          )}
          {reactions.poop > 0 && (
            <span className="h-7 px-2 rounded-md text-xs border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 tabular-nums flex items-center gap-1">
              💩 {reactions.poop}
            </span>
          )}
        </div>
      )}

      {comments.length > 0 && (
        <div className="space-y-1.5">
          {comments.map(comment => (
            <div key={comment.id} className="rounded-lg p-2 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-[10px] flex items-center justify-center shrink-0">
                  {comment.avatar || '💩'}
                </div>
                <span className="text-xs font-medium text-slate-700">{comment.username}</span>
                <span className="text-xs text-slate-400 tabular-nums">{formatTimeAgo(comment.created_at)}</span>
              </div>
              <p className="text-sm mt-0.5 text-slate-600">{comment.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onAddComment(event.id)
            }
          }}
          placeholder="Добавить комментарий..."
          className="flex-1 h-7 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-slate-900 placeholder:text-slate-400"
          autoComplete="off"
        />
        <button
          onClick={() => onAddComment(event.id)}
          disabled={!newComment.trim()}
          className="h-7 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Отправить
        </button>
      </div>

      {isOwnEvent && (
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => onEditEvent(event.id)}
            className="flex-1 h-7 px-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            ✏️ Редактировать
          </button>
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onDeleteEvent(event.id)
            }}
            className="flex-1 h-7 px-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-medium transition-colors"
          >
            🗑️ Удалить
          </button>
        </div>
      )}
    </div>
  )
}