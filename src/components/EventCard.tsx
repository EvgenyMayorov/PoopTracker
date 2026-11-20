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
  const isHighlighted = highlightedEventId === event.id

  const bristolDesc = event.bristol_type ? getBristolDescription(event.bristol_type) : ''

  return (
    <div
      className={`rounded-2xl p-4 transition-all ${isHighlighted ? 'bg-blue-50 border-4 border-blue-500 shadow-lg scale-105' : 'bg-white border-2 border-gray-200'}`}
      key={event.id}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg shrink-0">
          {authorAvatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 truncate">{authorName}</span>
            <span className="text-xs text-gray-500 whitespace-nowrap">{formatTimeAgo(event.created_at)}</span>
          </div>
          {bristolDesc && (
            <div className="text-sm text-gray-700 mt-1">{bristolDesc}</div>
          )}
        </div>
      </div>

      {isOwnEvent && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={() => onEditEvent(event.id)}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-blue-50 border-2 border-blue-200 text-blue-600"
          >
            ✏️ Редактировать
          </button>
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onDeleteEvent(event.id)
            }}
            className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 border-2 border-red-200 text-red-600"
          >
            🗑️ Удалить
          </button>
        </div>
      )}

      {(reactions.thumbs_up > 0 || reactions.heart > 0 || reactions.poop > 0) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
          {reactions.thumbs_up > 0 && (
            <span className="px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-600">
              👍 {reactions.thumbs_up}
            </span>
          )}
          {reactions.heart > 0 && (
            <span className="px-2 py-1 rounded-lg text-xs bg-red-50 text-red-600">
              ❤️ {reactions.heart}
            </span>
          )}
          {reactions.poop > 0 && (
            <span className="px-2 py-1 rounded-lg text-xs bg-amber-50 text-amber-600">
              💩 {reactions.poop}
            </span>
          )}
        </div>
      )}

      {comments.length > 0 && (
        <div className="mt-3 space-y-2">
          {comments.map(comment => (
            <div key={comment.id} className="rounded-lg p-2 bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-xs shrink-0">
                  {comment.avatar || '💩'}
                </div>
                <span className="text-xs font-semibold text-cyan-400">{comment.username}</span>
                <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
              </div>
              <p className="text-sm mt-1 text-gray-700">{comment.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
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
          className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 bg-white border-2 border-gray-200 text-gray-800 placeholder-gray-400"
          autoComplete="off"
        />
        <button
          onClick={() => onAddComment(event.id)}
          disabled={!newComment.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:from-cyan-600 hover:to-fuchsia-600"
        >
          Отправить
        </button>
      </div>
    </div>
  )
}