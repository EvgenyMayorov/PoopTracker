import React from 'react'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'
import { getBristolDescription } from '../lib/bristol'
import { CommentInput } from './CommentInput'

type FeedTabType = 'friends' | 'my'

interface ReactionCounts {
  thumbs_up: number
  heart: number
  poop: number
  userReaction?: string
}

interface Comment {
  id: string
  user_id: string
  username: string
  avatar: string
  text: string
  created_at: string
}

interface Event {
  id: string
  user_id: string
  created_at: string
  bristol_type?: number
  profiles?: {
    id: string
    username: string
    avatar: string
  }
}

interface FeedTabProps {
  feedTab: FeedTabType
  setFeedTab: (tab: FeedTabType) => void
  friendsEvents: Event[]
  events: Event[]
  profile: Profile
  profileUsername: string
  avatar: string
  reactions: Record<string, ReactionCounts>
  comments: Record<string, Comment[]>
  newComment: Record<string, string>
  setNewComment: React.Dispatch<React.SetStateAction<Record<string, string>>>
  formatTimeAgo: (date: string) => string
  handleReaction: (eventId: string, type: 'thumbs_up' | 'heart' | 'poop') => void
  handleAddComment: (eventId: string) => void
  fetchFriendsEvents: () => Promise<void>
  handleDeleteEvent: (eventId: string) => void
  highlightedEventId: string | null
  setEditingEventId: (id: string | null) => void
  setShowBristolModal: (show: boolean) => void
  setCurrentEventId: (id: string | null) => void
  navigate: (path: string) => void
}

export function FeedTab({
  feedTab,
  setFeedTab,
  friendsEvents,
  events,
  profile,
  profileUsername,
  avatar,
  reactions,
  comments,
  newComment,
  setNewComment,
  formatTimeAgo,
  handleReaction,
  handleAddComment,
  fetchFriendsEvents,
  handleDeleteEvent,
  highlightedEventId,
  setEditingEventId,
  setShowBristolModal,
  setCurrentEventId,
  navigate,
}: FeedTabProps) {
  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="inline-flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFeedTab('friends')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              feedTab === 'friends' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Друзья
          </button>
          <button
            onClick={() => setFeedTab('my')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              feedTab === 'my' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Моя история
          </button>
        </div>
      </div>

      {feedTab === 'friends' ? (
        <div>
          {friendsEvents.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 text-center">
              <div className="text-2xl mb-2">💩</div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Пока пусто</h3>
              <p className="text-[11px] text-slate-400">Подпишитесь на друзей, чтобы видеть их активность</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {friendsEvents.map(event => {
                const eventReactions = reactions[event.id] || { thumbs_up: 0, heart: 0, poop: 0 }
                const eventComments = comments[event.id] || []
                const isOwnEvent = event.user_id === profile.id
                return (
                  <div key={event.id} className="px-4 py-3 hover:bg-slate-50/70 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-[10px] flex items-center justify-center shrink-0">
                        {event.profiles?.avatar || avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {event.profiles?.username || profileUsername}
                          </span>
                          <span className="text-xs text-slate-400 tabular-nums">{formatTimeAgo(event.created_at)}</span>
                        </div>
                        {event.bristol_type && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60 mt-1">
                            {getBristolDescription(event.bristol_type)}
                          </span>
                        )}
                      </div>
                    </div>

                    {(eventReactions.thumbs_up > 0 || eventReactions.heart > 0 || eventReactions.poop > 0) && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                        {eventReactions.thumbs_up > 0 && (
                          <span className="h-7 px-2 rounded-md text-xs border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 tabular-nums flex items-center gap-1">
                            👍 {eventReactions.thumbs_up}
                          </span>
                        )}
                        {eventReactions.heart > 0 && (
                          <span className="h-7 px-2 rounded-md text-xs border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 tabular-nums flex items-center gap-1">
                            ❤️ {eventReactions.heart}
                          </span>
                        )}
                        {eventReactions.poop > 0 && (
                          <span className="h-7 px-2 rounded-md text-xs border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 tabular-nums flex items-center gap-1">
                            💩 {eventReactions.poop}
                          </span>
                        )}
                      </div>
                    )}

                    {eventComments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {eventComments.map(comment => (
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

                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        value={newComment[event.id] || ''}
                        onChange={e => setNewComment({ ...newComment, [event.id]: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleAddComment(event.id)
                          }
                        }}
                        placeholder="Добавить комментарий..."
                        className="flex-1 h-7 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-slate-900 placeholder:text-slate-400"
                        autoComplete="off"
                      />
                      <button
                        onClick={() => handleAddComment(event.id)}
                        disabled={!newComment[event.id]?.trim()}
                        className="h-7 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Отправить
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          {events.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 text-center">
              <div className="text-2xl mb-2">💩</div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Вы ещё не нажимали кнопку 💩</h3>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {events.map(event => {
                const eventReactions = reactions[event.id] || { thumbs_up: 0, heart: 0, poop: 0 }
                const eventComments = comments[event.id] || []
                const isOwnEvent = event.user_id === profile.id
                return (
                  <div key={event.id} className="px-4 py-3 hover:bg-slate-50/70 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-[10px] flex items-center justify-center shrink-0">
                        {event.profiles?.avatar || avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900 truncate">{profileUsername}</span>
                          <span className="text-xs text-slate-400 tabular-nums">{formatTimeAgo(event.created_at)}</span>
                        </div>
                        {event.bristol_type && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60 mt-1">
                            {getBristolDescription(event.bristol_type)}
                          </span>
                        )}
                      </div>
                    </div>

                    {isOwnEvent && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setEditingEventId(event.id)
                            setShowBristolModal(true)
                            setCurrentEventId(event.id)
                          }}
                          className="flex-1 h-7 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
                        >
                          ✏️ Редактировать
                        </button>
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            handleDeleteEvent(event.id)
                          }}
                          className="flex-1 h-7 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-medium transition-colors"
                        >
                          🗑️ Удалить
                        </button>
                      </div>
                    )}

                    {(eventReactions.thumbs_up > 0 || eventReactions.heart > 0 || eventReactions.poop > 0) && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                        {eventReactions.thumbs_up > 0 && (
                          <span className="h-7 px-2 rounded-md text-xs border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 tabular-nums flex items-center gap-1">
                            👍 {eventReactions.thumbs_up}
                          </span>
                        )}
                        {eventReactions.heart > 0 && (
                          <span className="h-7 px-2 rounded-md text-xs border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 tabular-nums flex items-center gap-1">
                            ❤️ {eventReactions.heart}
                          </span>
                        )}
                        {eventReactions.poop > 0 && (
                          <span className="h-7 px-2 rounded-md text-xs border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 tabular-nums flex items-center gap-1">
                            💩 {eventReactions.poop}
                          </span>
                        )}
                      </div>
                    )}

                    {eventComments.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {eventComments.map(comment => (
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

                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        value={newComment[event.id] || ''}
                        onChange={e => setNewComment({ ...newComment, [event.id]: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleAddComment(event.id)
                          }
                        }}
                        placeholder="Добавить комментарий..."
                        className="flex-1 h-7 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-slate-900 placeholder:text-slate-400"
                        autoComplete="off"
                      />
                      <button
                        onClick={() => handleAddComment(event.id)}
                        disabled={!newComment[event.id]?.trim()}
                        className="h-7 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Отправить
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
