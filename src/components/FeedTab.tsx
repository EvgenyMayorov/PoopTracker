import React from 'react'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'
import { getBristolDescription } from '../lib/bristol'
import { CommentInput } from './CommentInput'
import { EventCard } from './EventCard'


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
    <div className="px-4 pt-5 pb-24 space-y-3.5">
      <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 leading-none">
        Лента
      </h1>

      <div className="bg-white p-1 rounded-full grid grid-cols-2 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
        <button
          onClick={() => setFeedTab('friends')}
          className={`py-2 rounded-full text-xs font-semibold transition-all ${
            feedTab === 'friends' ? 'bg-[#111827] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Друзья
        </button>
        <button
          onClick={() => setFeedTab('my')}
          className={`py-2 rounded-full text-xs font-semibold transition-all ${
            feedTab === 'my' ? 'bg-[#111827] text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Моя история
        </button>
      </div>

      {feedTab === 'friends' ? (
        friendsEvents.length === 0 ? (
          <div className="bg-white rounded-[20px] p-8 text-center shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            <div className="text-3xl mb-2">💩</div>
            <h3 className="text-sm font-bold text-[#111827] mb-1">Пока пусто</h3>
            <p className="text-xs text-slate-400">Подпишитесь на друзей, чтобы видеть их активность</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friendsEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event as any}
                profile={{
                  id: event.profiles?.id || event.user_id,
                  username: event.profiles?.username || 'Друг',
                  avatar: event.profiles?.avatar || '💩',
                }}
                reactions={reactions[event.id] || { thumbs_up: 0, heart: 0, poop: 0 }}
                comments={comments[event.id] || []}
                newComment={newComment[event.id] || ''}
                setNewComment={(v) => setNewComment({ ...newComment, [event.id]: v })}
                formatTimeAgo={formatTimeAgo}
                onReaction={handleReaction}
                onAddComment={handleAddComment}
                onDeleteEvent={handleDeleteEvent}
                onEditEvent={() => {}}
                isOwnEvent={event.user_id === profile.id}
                highlightedEventId={highlightedEventId}
                showActions={false}
              />
            ))}
          </div>
        )
      ) : events.length === 0 ? (
        <div className="bg-white rounded-[20px] p-8 text-center shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
          <div className="text-3xl mb-2">💩</div>
          <h3 className="text-sm font-bold text-[#111827]">Вы ещё не нажимали кнопку 💩</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event as any}
              profile={{
                id: profile.id,
                username: profileUsername,
                avatar: avatar,
              }}
              reactions={reactions[event.id] || { thumbs_up: 0, heart: 0, poop: 0 }}
              comments={comments[event.id] || []}
              newComment={newComment[event.id] || ''}
              setNewComment={(v) => setNewComment({ ...newComment, [event.id]: v })}
              formatTimeAgo={formatTimeAgo}
              onReaction={handleReaction}
              onAddComment={handleAddComment}
              onDeleteEvent={handleDeleteEvent}
              onEditEvent={(id) => {
                setEditingEventId(id)
                setShowBristolModal(true)
                setCurrentEventId(id)
              }}
              isOwnEvent={true}
              highlightedEventId={highlightedEventId}
              showActions={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
