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
  const classes = {
    cyanFuchsiaActive: "bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white",
    cyanFuchsiaInactive: "text-gray-400",
    bgGray: "bg-white border-2 border-fuchsia-200",
    bgCyan: "bg-white border-2 border-cyan-200",
    activeBlue: "bg-blue-100 border-4 border-blue-500 shadow-lg scale-105",
    blue50: "bg-blue-50 border-2 border-blue-200 text-blue-600",
    red50: "bg-red-50 border-2 border-red-200 text-red-600",
  }

  return (
    <div className="p-4">
      <div className="flex bg-white/5 rounded-xl p-1 mb-4">
        <button
          onClick={() => setFeedTab('friends')}
          className={
            "flex-1 py-2 rounded-lg text-sm font-semibold transition-all " +
            (feedTab === 'friends' ? classes.cyanFuchsiaActive : classes.cyanFuchsiaInactive)
          }
        >
          👥 Друзья
        </button>
        <button
          onClick={() => setFeedTab('my')}
          className={
            "flex-1 py-2 rounded-lg text-sm font-semibold transition-all " +
            (feedTab === 'my' ? classes.cyanFuchsiaActive : classes.cyanFuchsiaInactive)
          }
        >
          💩 Моя история
        </button>
      </div>

      {feedTab === 'friends' ? (
        <div>
          {friendsEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">👀</div>
              <p className={'font-semibold text-gray-600'}>Пока пусто</p>
              <p className={'text-sm mt-1 text-gray-500'}>Подпишитесь на друзей</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friendsEvents.map(event => (
                <div key={event.id} className={'rounded-xl p-4 bg-white border-2 border-fuchsia-200'}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-purple-500 rounded-full flex items-center justify-center text-lg">
                      {event.profiles?.avatar || '💩'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={'font-semibold text-gray-800'}>
                        {event.profiles ? getDisplayName(event.profiles) : ''}
                      </div>
                      <div className={'text-sm text-gray-800'}>
                        У {event.profiles?.username} вышло!
                      </div>
                      {event.bristol_type && (
                        <div className={'text-xs mt-1 leading-snug break-words pr-1 text-slate-700'}>
                          {getBristolDescription(event.bristol_type)}
                        </div>
                      )}
                    </div>
                    <div className={'text-xs text-gray-500'}>
                      {formatTimeAgo(event.created_at)}
                    </div>
                  </div>

                  <div className={'flex gap-2 mt-3 pt-3 border-t border-gray-200'}>
                    <button
                      onClick={() => handleReaction(event.id, 'thumbs_up')}
                      className={
                        "flex items-center gap-1 px-3 py-1 rounded-lg text-sm " +
                        (reactions[event.id]?.userReaction === 'thumbs_up'
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-gray-100 text-gray-600")
                      }
                    >
                      👍 {reactions[event.id]?.thumbs_up || 0}
                    </button>
                    <button
                      onClick={() => handleReaction(event.id, 'heart')}
                      className={
                        "flex items-center gap-1 px-3 py-1 rounded-lg text-sm " +
                        (reactions[event.id]?.userReaction === 'heart'
                          ? "bg-red-500/20 text-slate-700"
                          : "bg-gray-100 text-gray-600")
                      }
                    >
                      ❤️ {reactions[event.id]?.heart || 0}
                    </button>
                    <button
                      onClick={() => handleReaction(event.id, 'poop')}
                      className={
                        "flex items-center gap-1 px-3 py-1 rounded-lg text-sm " +
                        (reactions[event.id]?.userReaction === 'poop'
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-gray-100 text-gray-600")
                      }
                    >
                      💩 {reactions[event.id]?.poop || 0}
                    </button>
                  </div>

                    {comments[event.id] && comments[event.id].length > 0 && (
                      <div className="mt-3 space-y-2">
                        {comments[event.id].map(comment => (
                          <div key={comment.id} className={"rounded-lg p-2 bg-gray-50"}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-xs shrink-0">
                                {comment.avatar || "💩"}
                              </div>
                              <span className="text-xs font-semibold text-cyan-400">{comment.username}</span>
                              <span className={"text-xs text-gray-500"}>{formatTimeAgo(comment.created_at)}</span>
                            </div>
                            <p className={"text-sm mt-1 text-gray-700"}>{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                  <CommentInput
                    eventId={event.id}
                    value={newComment[event.id] || ''}
                    onChange={(value) =>
                      setNewComment(prev => ({ ...prev, [event.id]: value }))
                    }
                    onSubmit={handleAddComment}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">💩</div>
              <p className={'font-semibold text-gray-600'}>Вы ещё не нажимали кнопку 💩</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div
                  key={event.id}
                  id={'event-' + event.id}
                  className={
                    "rounded-xl p-4 transition-all " +
                    (highlightedEventId === event.id
                      ? classes.activeBlue
                      : classes.bgCyan)
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-lg">
                      {avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={'font-semibold text-gray-800'}>{profileUsername}</div>
                      <div className={'text-sm text-gray-800'}>У меня вышло!</div>
                      {event.bristol_type && (
                        <div className={'text-xs mt-1 leading-snug break-words pr-1 text-slate-700'}>
                          {getBristolDescription(event.bristol_type)}
                        </div>
                      )}
                    </div>
                    <div className={'text-xs text-gray-500'}>
                      {formatTimeAgo(event.created_at)}
                    </div>
                  </div>

                  {event.user_id === profile.id && (
                    <div className={'flex gap-2 mt-3 pt-3 border-t border-gray-200'}>
                      <button
                        onClick={() => {
                          setEditingEventId(event.id)
                          setShowBristolModal(true)
                          setCurrentEventId(event.id)
                        }}
                        className={'flex-1 px-3 py-2 rounded-lg text-sm font-semibold ' + classes.blue50}
                      >
                        ✏️ Редактировать
                      </button>
                      <button
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation()
                          handleDeleteEvent(event.id)
                        }}
                        className={'flex-1 px-3 py-2 rounded-lg text-sm font-semibold ' + classes.red50}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  )}

                  {reactions[event.id] && (reactions[event.id].thumbs_up > 0 || reactions[event.id].heart > 0 || reactions[event.id].poop > 0) && (
                    <div className={'flex gap-2 mt-3 pt-3 border-t border-gray-200'}>
                      {reactions[event.id].thumbs_up > 0 && (
                        <span className={'px-2 py-1 rounded-lg text-xs bg-blue-50 text-blue-600'}>
                          👍 {reactions[event.id].thumbs_up}
                        </span>
                      )}
                      {reactions[event.id].heart > 0 && (
                        <span className={'px-2 py-1 rounded-lg text-xs bg-red-50 text-red-600'}>
                          ❤️ {reactions[event.id].heart}
                        </span>
                      )}
                      {reactions[event.id].poop > 0 && (
                        <span className={'px-2 py-1 rounded-lg text-xs bg-amber-50 text-amber-600'}>
                          💩 {reactions[event.id].poop}
                        </span>
                      )}
                    </div>
                  )}

                  {comments[event.id] && comments[event.id].length > 0 && (
                    <div className="mt-3 space-y-2">
                      {comments[event.id].map(comment => (
                        <div key={comment.id} className={'rounded-lg p-2 bg-gray-50'}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-xs shrink-0">
                              {comment.avatar || '💩'}
                            </div>
                            <span className="text-xs font-semibold text-cyan-400">{comment.username}</span>
                            <span className={'text-xs text-gray-500'}>{formatTimeAgo(comment.created_at)}</span>
                          </div>
                          <p className={'text-sm mt-1 text-gray-700'}>{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
