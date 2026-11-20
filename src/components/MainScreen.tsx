import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Profile } from '../lib/supabase'
import { getDisplayName } from '../lib/displayName'
import { getBristolDescription } from '../lib/bristol'
import { t } from '../i18n'
import { PWAInstallBanner } from './PWAInstallBanner'
import { SuccessAnimation } from './SuccessAnimation'
import { SettingsTab } from './SettingsTab'
import { ConfirmModal } from './ConfirmModal'
import { FeedTab as FeedTabView } from './FeedTab'
import { CommentInput } from './CommentInput'
import { useMyEvents } from '../hooks/use-my-events'
import { useFriends } from '../hooks/use-friends'
import { useReactions } from '../hooks/use-reactions'
import { useComments } from '../hooks/use-comments'
import { useFriendsEvents } from '../hooks/use-friends-events'
import { useWeekStats } from '../hooks/use-week-stats'
import { useTimeAgo } from '../hooks/use-time-ago'
import { usePush } from '../hooks/use-push'
import { BottomNav } from './BottomNav'
import { StatsCards } from './StatsCards'
import { WeekChart } from './WeekChart'
import { PoopButton } from './PoopButton'
import { Header } from './Header'

type Props = {
  profile: Profile
  onLogout: () => void
}

type Tab = 'home' | 'people' | 'feed' | 'settings'
type FeedTab = 'friends' | 'my'

export function MainScreen({ profile, onLogout }: Props) {
  const navigate = useNavigate()

  // Hooks
  const { events, fetchEvents, addEvent, updateEventBristol, deleteEvent } = useMyEvents(profile)
  const { followers, following, fetchFollowers, fetchFollowing, followUser, unfollowUser, searchUserByEmail } = useFriends(profile)
  const { friendsEvents, fetchFriendsEvents } = useFriendsEvents(profile, following)
  const { reactions, fetchReactions, handleReaction } = useReactions(profile)
  const { comments, newComment, setNewComment, fetchComments, handleAddComment } = useComments(profile)
  const { sendPushToUser, notifyFollowers, notifyReaction, notifyComment } = usePush()
  const { formatTimeAgo } = useTimeAgo()

  const { weekData, todayCount, weekCount, maxCount } = useWeekStats(events)

  // Local UI state
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [feedTab, setFeedTab] = useState<FeedTab>('friends')
  const [showBristolModal, setShowBristolModal] = useState(false)
  const [currentEventId, setCurrentEventId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successBristolType, setSuccessBristolType] = useState<number | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [friendEmail, setFriendEmail] = useState('')
  const [friendSearchResult, setFriendSearchResult] = useState<any>(null)
  const [isSearchingFriend, setIsSearchingFriend] = useState(false)
  const [showUnfollowConfirm, setShowUnfollowConfirm] = useState(false)
  const [isUnfollowing, setIsUnfollowing] = useState(false)
  const [deleteConfirmEventId, setDeleteConfirmEventId] = useState<string | null>(null)
  const [isDeletingEvent, setIsDeletingEvent] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFollowingProfile, setIsFollowingProfile] = useState(false)

  // Fetch initial data
  useEffect(() => {
    fetchEvents()
    fetchFollowers()
    fetchFollowing()
  }, [fetchEvents, fetchFollowers, fetchFollowing])

  useEffect(() => {
    fetchFriendsEvents()
  }, [fetchFriendsEvents])

  useEffect(() => {
    if (friendsEvents.length > 0) {
      friendsEvents.forEach(event => {
        fetchReactions(event.id)
        fetchComments(event.id)
      })
    }
  }, [friendsEvents])

  useEffect(() => {
    if (events.length > 0) {
      events.forEach(event => {
        fetchReactions(event.id)
        fetchComments(event.id)
      })
    }
  }, [events])

  // Handlers
  const handlePoop = async () => {
    const eventId = await addEvent()
    if (eventId) {
      setCurrentEventId(eventId)
      setShowBristolModal(true)
      setSelectedType(null)
    }
  }

  const handleBristolSelect = async (type: number) => {
    if (currentEventId) {
      await updateEventBristol(currentEventId, type)
      setSuccessBristolType(type)
      setShowSuccess(true)
    }
    setShowBristolModal(false)
    setCurrentEventId(null)
    setSelectedType(null)
    setEditingEventId(null)
  }

  const handleBristolSkip = () => {
    setShowBristolModal(false)
    setCurrentEventId(null)
    setSelectedType(null)
    setEditingEventId(null)
  }

  const handleAddFriend = () => {
    setShowAddFriendModal(true)
  }

  const handleSearchFriend = async () => {
    if (!friendEmail.trim()) return
    setIsSearchingFriend(true)
    try {
      const result = await searchUserByEmail(friendEmail)
      if (result) {
        setFriendSearchResult(result)
      } else {
        setFriendSearchResult({ error: 'Пользователь не найден' })
      }
    } catch (error) {
      console.error('[Search] Ошибка:', error)
      setFriendSearchResult({ error: 'Ошибка поиска' })
    } finally {
      setIsSearchingFriend(false)
    }
  }

  const handleFollowFriend = async (friendId: string, username: string) => {
    try {
      await followUser(friendId)
      setFriendSearchResult(null)
      setFriendEmail('')
    } catch (error) {
      console.error('[Follow] Ошибка:', error)
    }
  }

  const handleUnfollow = async () => {
    if (!friendSearchResult) return
    setIsUnfollowing(true)
    try {
      await unfollowUser(friendSearchResult.id)
      setShowUnfollowConfirm(false)
    } catch (error) {
      console.error('[Unfollow] Ошибка:', error)
    } finally {
      setIsUnfollowing(false)
    }
  }

  const handleDeleteEvent = (eventId: string) => {
    setDeleteConfirmEventId(eventId)
  }

  const confirmDeleteEvent = async () => {
    if (!deleteConfirmEventId) return
    setIsDeletingEvent(true)
    try {
      await deleteEvent(deleteConfirmEventId)
      setDeleteConfirmEventId(null)
    } catch (error) {
      console.error('[Delete] Ошибка:', error)
    } finally {
      setIsDeletingEvent(false)
    }
  }

  const handleReactionWithPush = async (eventId: string, reactionType: 'thumbs_up' | 'heart' | 'poop') => {
    await handleReaction(eventId, reactionType)
    await notifyReaction(eventId, reactionType, profile, reactions[eventId]?.userReaction)
  }

  const handleAddCommentWithPush = async (eventId: string) => {
    const text = newComment[eventId]?.trim()
    if (!text) return
    await handleAddComment(eventId)
    await notifyComment(eventId, profile, text)
  }

  const handleSuccessComplete = () => {
    setShowSuccess(false)
    setSuccessBristolType(null)
    if (successBristolType) {
      notifyFollowers(profile, successBristolType)
    }
  }

  // FeedTab props
  const feedTabProps = {
    feedTab,
    setFeedTab,
    friendsEvents,
    events,
    profile,
    profileUsername: profile.username,
    avatar: profile.avatar,
    reactions,
    comments,
    newComment,
    setNewComment,
    formatTimeAgo,
    handleReaction: handleReactionWithPush,
    handleAddComment: handleAddCommentWithPush,
    fetchFriendsEvents,
    handleDeleteEvent,
    highlightedEventId,
    setEditingEventId,
    setShowBristolModal,
    setCurrentEventId,
    navigate,
  }

  return (
    <div className="mobile-container">
      <Header activeTab={activeTab} />
      <PWAInstallBanner />

      {activeTab === 'home' && (
        <div className="p-4 pb-20">
          <PoopButton onPoop={handlePoop} />

          <WeekChart weekData={weekData} maxCount={maxCount} />
          <StatsCards todayCount={todayCount} weekCount={weekCount} totalCount={events.length} />
        </div>
      )}

      {activeTab === 'people' && (
        <div className="p-4 pb-20">
          <button
            onClick={handleAddFriend}
            className="w-full h-10 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-sm font-medium mb-4 transition-colors"
          >
            Добавить друга
          </button>

          <div className="mb-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 mb-2">Мои подписки</h2>
            <div className="bg-white border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {following.map(f => (
                <div
                  key={f.id}
                  onClick={() => navigate(`/user/${f.user_id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-xs flex items-center justify-center shrink-0">
                    {f.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{f.username}</div>
                  </div>
                  <span className="text-xs text-slate-400">→</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 mb-2">Подписчики</h2>
            <div className="bg-white border border-slate-200/80 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {followers.map(f => (
                <div
                  key={f.id}
                  onClick={() => navigate(`/user/${f.user_id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-xs flex items-center justify-center shrink-0">
                    {f.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{f.username}</div>
                  </div>
                  <span className="text-xs text-slate-400">→</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'feed' && <FeedTabView {...feedTabProps} />}

      {activeTab === 'settings' && <SettingsTab profile={profile} onLogout={onLogout} />}

      {/* Bristol Modal */}
      {showBristolModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-center mb-4 text-gray-800">Какой формы?</h2>
            <p className="text-sm text-center mb-4 text-gray-600">Шкала Бристольской формы стула</p>

            <div className="space-y-2 mb-6">
              {[1, 2, 3, 4, 5, 6, 7].map(type => (
                <button
                  key={type}
                  onClick={() => handleBristolSelect(type)}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    selectedType === type
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl ${type <= 2 ? '🧱' : type <= 4 ? '🏆' : '☢️'}`}>
                      {type <= 2 ? '🧱' : type <= 4 ? '🏆' : '☢️'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">Тип {type}</div>
                      <div className="text-sm text-gray-600">
                        {type === 1 && 'Отдельные твёрдые комочки'}
                        {type === 2 && 'Комковатая и плотная'}
                        {type === 3 && 'Колбаска с трещинами'}
                        {type === 4 && 'Гладкая колбаска'}
                        {type === 5 && 'Мягкие кусочки'}
                        {type === 6 && 'Пушистые кусочки'}
                        {type === 7 && 'Водянистый'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleBristolSkip}
              className="w-full py-2 bg-white/5 border border-white/20 rounded-xl text-gray-400 text-sm font-semibold hover:bg-white/10"
            >
              Пропустить
            </button>
          </div>
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-center mb-4 text-slate-900">Добавить друга</h2>
            <p className="text-sm text-center mb-4 text-slate-500">Введите email друга для поиска</p>

            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={friendEmail}
                onChange={e => setFriendEmail(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
              />
              <button
                onClick={handleSearchFriend}
                disabled={isSearchingFriend || !friendEmail.trim()}
                className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {isSearchingFriend ? '...' : 'Искать'}
              </button>
            </div>

            {friendSearchResult && (
              <div className="rounded-xl p-4 mb-4 bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg shrink-0">
                    {friendSearchResult.avatar || '💩'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1 text-slate-900">
                      {friendSearchResult.username}
                    </div>
                    <div className="text-xs mb-3 text-slate-500">
                      {friendSearchResult.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleFollowFriend(friendSearchResult.id, friendSearchResult.username)}
                  className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Подписаться
                </button>
              </div>
            )}

            {friendSearchResult?.error && (
              <div className="text-center text-sm text-red-500 mb-4">{friendSearchResult.error}</div>
            )}

            <button
              onClick={() => setShowAddFriendModal(false)}
              className="w-full mt-4 h-10 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Success Animation */}
      {showSuccess && (
        <SuccessAnimation bristolType={successBristolType} onComplete={handleSuccessComplete} />
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmEventId}
        title="Удаление записи"
        message="Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDeleteEvent}
        onCancel={() => setDeleteConfirmEventId(null)}
        confirmClassName="bg-red-500 hover:bg-red-600 text-white"
      />

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} onPoop={handlePoop} />
    </div>
  )
}
