import React from 'react'
import { Event } from '../hooks/types'
import { getBristolDescription } from '../lib/bristol'

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
  showActions?: boolean
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
  showActions = true,
}: EventCardProps) {
  const eventProfile = event.profiles
  const authorName = eventProfile?.username || profile.username || 'Пользователь'
  const authorAvatar = eventProfile?.avatar || profile.avatar || '💩'
  const bristolDesc = event.bristol_type ? getBristolDescription(event.bristol_type) : ''

  const getBadgeStyle = (type?: number) => {
    if (!type) return 'bg-slate-100 text-slate-700'
    if (type <= 2) return 'bg-amber-100 text-amber-800'
    if (type <= 4) return 'bg-emerald-100 text-emerald-700'
    return 'bg-indigo-100 text-indigo-700'
  }

  const getBadgeLabel = (type?: number) => {
    if (!type) return 'Запись'
    if (type <= 2) return `Тип ${type}`
    if (type <= 4) return 'Отлично!'
    return `Тип ${type}`
  }

  return (
    <div className="bg-white rounded-[20px] p-4 space-y-3 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-lg shrink-0">
            {authorAvatar}
          </div>
          <div className="truncate text-sm">
            <span className="font-bold text-[#111827]">{authorName}</span>
            <span className="text-xs text-slate-400 ml-1.5 tabular-nums">· {formatTimeAgo(event.created_at)}</span>
          </div>
        </div>
        {event.bristol_type && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${getBadgeStyle(event.bristol_type)}`}>
            {getBadgeLabel(event.bristol_type)}
          </span>
        )}
      </div>

      {bristolDesc && (
        <div className="text-[15px] font-medium text-slate-800 leading-snug">{bristolDesc}</div>
      )}

      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReaction(event.id, 'heart')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors ${
              reactions.userReaction === 'heart' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            ❤️ {reactions.heart || 0}
          </button>
          <button
            onClick={() => onReaction(event.id, 'thumbs_up')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors ${
              reactions.userReaction === 'thumbs_up' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            👍 {reactions.thumbs_up || 0}
          </button>
          <button
            onClick={() => onReaction(event.id, 'poop')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors ${
              reactions.userReaction === 'poop' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            💩 {reactions.poop || 0}
          </button>
        </div>

        {isOwnEvent && showActions && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEditEvent(event.id)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Изменить
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteEvent(event.id)
              }}
              className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-colors"
            >
              Удалить
            </button>
          </div>
        )}
      </div>

      {comments.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {comments.map(comment => (
            <div key={comment.id} className="rounded-xl px-3 py-2 bg-slate-50">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{comment.avatar || '💩'}</span>
                <span className="text-xs font-bold text-slate-800">{comment.username}</span>
                <span className="text-[11px] text-slate-400 tabular-nums">· {formatTimeAgo(comment.created_at)}</span>
              </div>
              <p className="text-xs mt-0.5 text-slate-600">{comment.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-100/90 rounded-xl px-3 py-2 flex items-center gap-2">
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
          placeholder="Написать комментарий..."
          className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none min-w-0"
          autoComplete="off"
        />
        <button
          onClick={() => onAddComment(event.id)}
          disabled={!newComment.trim()}
          className="text-xs font-bold text-[#111827] disabled:opacity-30 shrink-0"
        >
          Отправить
        </button>
      </div>
    </div>
  )
}
