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
import { EventCard } from './EventCard'
import { Header } from './Header'
import { UserAvatar } from './UserAvatar'

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
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    try {
      const saved = sessionStorage.getItem('pooptrack_active_tab')
      return (saved === 'home' || saved === 'people' || saved === 'feed' || saved === 'settings') ? (saved as Tab) : 'home'
    } catch {
      return 'home'
    }
  })

  useEffect(() => {
    try { sessionStorage.setItem('pooptrack_active_tab', activeTab) } catch {}
  }, [activeTab])

  const [feedTab, setFeedTab] = useState<FeedTab>('friends')
  const [peopleTab, setPeopleTab] = useState<'following' | 'followers'>('following')
  const [showBristolModal, setShowBristolModal] = useState(false)
  const [currentEventId, setCurrentEventId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successBristolType, setSuccessBristolType] = useState<number | null>(null)
  const [isSendingBallast, setIsSendingBallast] = useState(false)
  const [showBallastToast, setShowBallastToast] = useState(false)

  // Авто-скрытие баннера «Сбросить балласт» через 3.5 секунды
  useEffect(() => {
    if (!showBallastToast) return
    const timer = setTimeout(() => setShowBallastToast(false), 3500)
    return () => clearTimeout(timer)
  }, [showBallastToast])
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

  // Балластный сброс: НЕ создаёт запись в таблице events (не попадает в ленту друзей,
  // мою историю и счётчики Сегодня / Неделя / Всего).
  // Лёгкий кулдаун защищает от двойного клика и спама пушами.
  const BALLAST_COOLDOWN_MS = 2500
  const handleResetBallast = async () => {
    if (isSendingBallast) return
    setIsSendingBallast(true)
    try {
      const rawUsername = (profile.username ?? '').trim()
      const senderName =
        rawUsername && rawUsername.toLowerCase() !== 'unknown' ? rawUsername : 'Друг'
      const pushBody =
        'Внимание! Газовая атака, воздушный балласт успешно сброшен 💨'
      // Подписчики текущего пользователя (строка friends, где user_id = текущий пользователь)
      const { data: followersData } = await supabase
        .from('friends')
        .select('follower_id')
        .eq('user_id', profile.id)
      const followersList = (followersData || []) as Array<{ follower_id: string }>
      for (const f of followersList) {
        if (f.follower_id === profile.id) continue
        await sendPushToUser(
          f.follower_id,
          `${senderName} объявляет газовую атаку!`,
          pushBody
        )
      }
    } catch (err) {
      console.warn('[Ballast] Ошибка отправки push подписчикам:', err)
    } finally {
      // Баннер показывается всегда, даже если подписчиков нет
      setShowBallastToast(true)
      // Кулдаун после отправки, чтобы не спамить пушами при случайном двойном тапе
      setTimeout(() => setIsSendingBallast(false), BALLAST_COOLDOWN_MS)
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
    <div className="mobile-container min-h-dvh bg-transparent text-[#111827] pb-24">
      <PWAInstallBanner />

      {activeTab === 'home' && (
        <div className="px-4 pt-4 space-y-4">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-emerald-100/80 flex items-center justify-center text-xl">
                {profile.avatar || '💩'}
              </div>
              <span className="text-[15px] font-bold text-[#111827]">{profile.username}</span>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-white transition-colors"
              aria-label="Настройки"
            >
              ⚙️
            </button>
          </header>

          <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 leading-none">
            Сводка
          </h1>

          <StatsCards todayCount={todayCount} weekCount={weekCount} totalCount={events.length} />
          <WeekChart weekData={weekData} maxCount={maxCount} />
          <PoopButton onPoop={handlePoop} onResetBallast={handleResetBallast} isSendingBallast={isSendingBallast} />

          {events.length > 0 ? (
            <div className="space-y-2">
              {events.slice(0, 7).map((event) => (
                <div key={event.id} className="bg-white rounded-[20px] p-3.5 border border-slate-200/70 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                      ✓
                    </div>
                    <div className="truncate">
                      <div className="text-sm font-bold text-[#111827]">Последняя запись</div>
                      <div className="text-xs text-slate-400 tabular-nums">{formatTimeAgo(event.created_at)}</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0">
                    {event.bristol_type ? `Тип ${event.bristol_type}` : 'Готово!'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-xs text-slate-400 py-4">
              Записей пока нет. Нажмите «У меня вышло!»
            </div>
          )}
        </div>
      )}

      {activeTab === 'people' && (
        <div className="px-4 pt-5 space-y-3.5">
          <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 leading-none">
            Люди
          </h1>

          <button
            onClick={handleAddFriend}
            className="w-full bg-white rounded-full p-2 pl-4 flex items-center justify-between shadow-[0_2px_10px_rgba(15,23,42,0.04)] text-left"
          >
            <span className="text-sm text-slate-400">🔍 Поиск пользователей по email</span>
            <span className="bg-[#111827] text-white text-xs font-semibold px-4 py-2 rounded-full">
              Найти
            </span>
          </button>

          <div className="bg-white p-1 rounded-full grid grid-cols-2 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
            <button
              onClick={() => setPeopleTab('following')}
              className={`py-2 rounded-full text-xs font-semibold transition-all ${
                peopleTab === 'following' ? 'bg-[#111827] text-white' : 'text-slate-600'
              }`}
            >
              Подписки ({following.length})
            </button>
            <button
              onClick={() => setPeopleTab('followers')}
              className={`py-2 rounded-full text-xs font-semibold transition-all ${
                peopleTab === 'followers' ? 'bg-[#111827] text-white' : 'text-slate-600'
              }`}
            >
              Подписчики ({followers.length})
            </button>
          </div>

          <div className="space-y-2.5">
            {(peopleTab === 'following' ? following : followers).map((f) => (
              <div
                key={f.id}
                onClick={() => navigate(`/user/${f.user_id}`)}
                className="bg-white rounded-[20px] p-3.5 flex items-center justify-between shadow-[0_2px_12px_rgba(15,23,42,0.04)] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-[52px] h-[52px] rounded-full bg-amber-50 flex items-center justify-center text-2xl shrink-0">
                    {f.avatar || '💩'}
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-bold text-[#111827] truncate">{f.username}</div>
                    <div className="text-xs text-slate-400">Открыть профиль</div>
                  </div>
                </div>
                <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-full shrink-0">
                  Профиль →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'feed' && <FeedTabView {...feedTabProps} />}

      {activeTab === 'settings' && <SettingsTab profile={profile} onLogout={onLogout} />}
      {showBristolModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-extrabold text-center mb-1 text-[#111827]">Какой формы?</h2>
            <p className="text-xs text-center mb-4 text-slate-400">Шкала Бристольской формы стула</p>
            <div className="space-y-2 mb-5">
             {[1, 2, 3, 4, 5, 6, 7].map((type) => (
                <button
                  key={type}
                  onClick={() => handleBristolSelect(type)}
                  className={`w-full p-3 rounded-2xl text-left transition-all flex items-center gap-3 ${
                    selectedType === type ? 'bg-indigo-50 ring-2 ring-indigo-500' : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <span
                  className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    type === 1 ? 'bg-amber-700' : type === 2 ? 'bg-amber-500' : type === 3 ? 'bg-emerald-500' : type === 4 ? 'bg-emerald-600' : type === 5 ? 'bg-orange-400' : type === 6 ? 'bg-orange-500' : 'bg-rose-500'
                  }`}
                />
                  <div>
                    <div className="font-bold text-sm text-[#111827]">
                      {type === 1 && 'Запор'}
                      {type === 2 && 'Склонность к запору'}
                      {type === 3 && 'Норма'}
                      {type === 4 && 'Идеал'}
                      {type === 5 && 'Склонность к диарее'}
                      {type === 6 && 'Диарея'}
                      {type === 7 && 'Сильная диарея'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {type === 1 && 'Отдельные твёрдые комочки'}
                      {type === 2 && 'Комковатая и плотная'}
                      {type === 3 && 'Колбаска с трещинами'}
                      {type === 4 && 'Гладкая колбаска'}
                      {type === 5 && 'Мягкие кусочки'}
                      {type === 6 && 'Пушистые кусочки'}
                      {type === 7 && 'Водянистый'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={handleBristolSkip} className="w-full py-2.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              Пропустить
            </button>
          </div>
        </div>
      )}

      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-extrabold text-center mb-1 text-[#111827]">Добавить друга</h2>
            <p className="text-xs text-center mb-4 text-slate-400">Введите email друга для поиска</p>
            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 h-11 bg-slate-50 border border-slate-200 rounded-full px-4 text-sm focus:outline-none focus:border-[#111827]"
              />
              <button
                onClick={handleSearchFriend}
                disabled={isSearchingFriend || !friendEmail.trim()}
                className="h-11 px-5 bg-[#111827] text-white rounded-full text-xs font-bold disabled:opacity-50"
              >
                {isSearchingFriend ? '...' : 'Искать'}
              </button>
            </div>
            {friendSearchResult && !friendSearchResult.error && (
              <div className="rounded-2xl p-4 mb-4 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-[52px] h-[52px] rounded-full overflow-hidden shrink-0">
                    <UserAvatar avatar={friendSearchResult.avatar || null} className="w-[52px] h-[52px] rounded-full overflow-hidden" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-sm text-[#111827] truncate">{friendSearchResult.username}</div>
                    <div className="text-xs text-slate-400 truncate">{friendSearchResult.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleFollowFriend(friendSearchResult.id, friendSearchResult.username)}
                  className="px-4 py-2 bg-[#111827] text-white rounded-full text-xs font-bold shrink-0"
                >
                  Подписаться
                </button>
              </div>
            )}
            {friendSearchResult?.error && (
              <div className="text-center text-xs text-rose-500 mb-4">{friendSearchResult.error}</div>
            )}
            <button onClick={() => setShowAddFriendModal(false)} className="w-full h-11 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              Закрыть
            </button>
          </div>
        </div>
      )}

      {showSuccess && <SuccessAnimation bristolType={successBristolType} onComplete={handleSuccessComplete} />}

      {/* Баннер «Сбросить балласт» — поверх контента, исчезает через 4 секунды */}
      {showBallastToast && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setShowBallastToast(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="ballast-modal-card ballast-card-gradient relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pb-6 pt-2 text-center">
              <h2 className="text-xl font-bold uppercase tracking-widest mb-2 text-lime-400">
                Внимание! Газовая атака!
              </h2>
              <p className="text-lg font-medium text-white leading-relaxed mb-4">
                Воздушный балласт успешно сброшен
              </p>
              <button
                type="button"
                onClick={() => setShowBallastToast(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/80 hover:bg-white text-sm text-slate-800 px-3 py-1.5 mt-4"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            {/* Gas stream SVG animations */}
            <svg className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none w-full h-full" aria-hidden="true">
              <g className="gas-stream">
                <path
                  stroke="rgba(163, 230, 53, 0.45)"
                  strokeWidth="2"
                  fill="none"
                  className="gas-stream"
                  d="M 20 190 Q 40 90, 80 40 Q 120 10, 160 0"
                />
                <path
                  stroke="rgba(250, 204, 21, 0.35)"
                  strokeWidth="2"
                  fill="none"
                  className="gas-stream"
                  d="M 50 200 Q 80 100, 130 50 Q 180 20, 230 5"
                />
                <path
                  stroke="rgba(16, 185, 129, 0.4)"
                  strokeWidth="2"
                  fill="none"
                  className="gas-stream"
                  d="M 80 210 Q 110 110, 160 60 Q 210 30, 260 15"
                />
              </g>
            </svg>
            {/* Flying 💨 emoji icons around the card */}
            <div className="gas-puff absolute top-8 left-8 text-3xl" style={{ animation: 'gasPuff 3s ease-in-out 0.2s infinite', fontSize: '2rem' }}>💨</div>
            <div className="gas-puff absolute top-4 right-10 text-3xl" style={{ animation: 'gasPuff 3s ease-in-out 1s infinite', fontSize: '2rem' }}>💨</div>
            <div className="gas-puff absolute bottom-8 left-10 text-3xl" style={{ animation: 'gasPuff 3s ease-in-out 1.8s infinite', fontSize: '2rem' }}>💨</div>
            <div className="gas-puff absolute bottom-4 right-8 text-3xl" style={{ animation: 'gasPuff 3s ease-in-out 2.6s infinite', fontSize: '2rem' }}>💨</div>
            {/* Floating gas clouds */}
            <div
              className="gas-cloud absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-yellow-400/30 -translate-x-1/2 -translate-y-1/2"
              style={{ animation: 'gasFloat 4s ease-in-out infinite' }}
            />
            <div
              className="gas-cloud absolute top-1/4 right-1/5 w-32 h-32 rounded-full bg-lime-400/20 blur-lg -translate-x-1/2 -translate-y-1/2"
              style={{ animation: 'gasFloat 5s ease-in-out 1.2s infinite' }}
            />
            <div
              className="gas-cloud absolute bottom-1/3 left-1/6 w-36 h-36 rounded-full bg-emerald-400/20 blur-xl -translate-x-1/2 -translate-y-1/2"
              style={{ animation: 'gasDrift 6s ease-in-out 2.4s infinite' }}
            />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteConfirmEventId}
        title="Удаление записи"
        message="Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDeleteEvent}
        onCancel={() => setDeleteConfirmEventId(null)}
        confirmClassName="bg-rose-500 hover:bg-rose-600 text-white"
      />

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} onPoop={handlePoop} />
    </div>
  )
}
