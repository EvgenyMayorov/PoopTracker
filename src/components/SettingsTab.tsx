import { useState } from 'react'
import { supabase, Profile } from '../lib/supabase'

interface SettingsTabProps {
  profile: Profile
  onLogout: () => void
}

// Животные и птицы (сохраняем существующие, добавляем новые без дублирования)
const avatarEmojis = ['💩', '🧻', '🚽', '😎', '🦊', '🐻', '🐸', '🦁', '🐼', '🦄', '👽', '🤖', '👻', '🔥', '🌟', '👑', '🥑', '🌶️', '🐱', '🐈', '🐶', '🐕', '🐯', '🐅', '🐓', '🐔', '🐨', '🐺', '🐷', '🐮', '🐵', '🐰', '🐹', '🦉', '🐧', '🦆', '🦖']

export function SettingsTab({ profile, onLogout }: SettingsTabProps) {
  const [editingUsername, setEditingUsername] = useState(false)
  const [tempUsername, setTempUsername] = useState(profile.username)
  const [profileUsername, setProfileUsername] = useState(profile.username)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string>(() =>
    profile?.avatar || localStorage.getItem('poop_avatar') || '💩'
  )
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const handleSaveUsername = async () => {
    const trimmedUsername = tempUsername.trim()
    if (!trimmedUsername) {
      setUsernameError('Введите никнейм')
      return
    }

    // Проверяем уникальность (без учёта регистра), исключая текущего пользователя
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', trimmedUsername)
      .neq('id', profile.id)

    if (existingProfiles && existingProfiles.length > 0) {
      setUsernameError('Этот никнейм уже занят, выберите другой')
      return
    }

    setUsernameError(null)

    await supabase
      .from('profiles')
      .update({ username: trimmedUsername })
      .eq('id', profile.id)

    setProfileUsername(trimmedUsername)
    setEditingUsername(false)
  }

  const handleSaveAvatar = async (emoji: string) => {
    setAvatar(emoji)
    localStorage.setItem('poop_avatar', emoji)
    setShowAvatarPicker(false)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar: emoji })
        .eq('id', profile.id)
      if (error) {
        console.error('[Settings] Ошибка сохранения аватара в Supabase:', error)
      }
    } catch (err) {
      console.error('[Settings] Исключение при сохранении аватара:', err)
    }
  }

  return (
    <div className="p-4">
      <h2 className={`text-xl font-bold mb-6 ${'text-gray-800'}`}>Настройки</h2>

      <div className="mb-6">
        <h3 className={`text-sm font-semibold mb-3 ${'text-gray-600'}`}>
          👤 Аккаунт
        </h3>
        <div className={`rounded-xl p-4 ${'bg-white border-2 border-gray-200'}`}>
          {editingUsername ? (
            <div className="space-y-3">
              <input
                type="text"
                value={tempUsername}
                onChange={e => {
                  setTempUsername(e.target.value)
                  if (usernameError) setUsernameError(null)
                }}
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:border-blue-400 ${
                  'bg-gray-50 border-2 border-gray-200 text-gray-800'
                }`}
              />
              {usernameError && (
                <p className="text-sm text-red-400 mt-1">❌ {usernameError}</p>
              )}
              <div className="flex gap-2">
                <button onClick={handleSaveUsername} className="flex-1 py-2 bg-blue-500 rounded-lg text-white font-semibold">
                  Сохранить
                </button>
                <button
                  onClick={() => { setEditingUsername(false); setTempUsername(profileUsername) }}
                  className={`flex-1 py-2 rounded-lg font-semibold ${'bg-gray-100 text-gray-700'}`}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowAvatarPicker(!showAvatarPicker)} className="text-4xl hover:scale-110 transition-transform">
                    {avatar}
                  </button>
                  <div>
                    <div className={`font-semibold ${'text-gray-800'}`}>{profileUsername}</div>
                    <div className={`text-xs ${'text-gray-500'}`}>{profile.id.substring(0, 8)}...</div>
                  </div>
                </div>
                <button
                  onClick={() => setEditingUsername(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    'bg-blue-50 border-2 border-blue-200 text-blue-600'
                  }`}
                >
                  Изменить профиль
                </button>
              </div>
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                'bg-gray-50 border border-gray-200'
              }`}>
                <span className={`text-xs font-semibold ${'text-gray-500'}`}>📧 Электронная почта</span>
                <span className={`text-sm truncate max-w-[60%] text-right ${'text-gray-800'}`}>{profile.email || '—'}</span>
              </div>
            </div>
          )}

          {showAvatarPicker && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className={`text-sm mb-3 ${'text-gray-600'}`}>Выберите аватарку:</p>
              <div className="grid grid-cols-5 gap-2 max-h-[280px] overflow-y-auto overscroll-contain pr-1">
                {avatarEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSaveAvatar(emoji)}
                    className={`text-3xl p-2 rounded-lg transition-all hover:scale-110 ${
                      avatar === emoji
                        ? 'bg-blue-100 border-2 border-blue-400'
                        : 'bg-gray-50 border-2 border-gray-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={onLogout}
          className={`w-full py-3 rounded-xl font-semibold ${
            'bg-red-50 border-2 border-red-200 text-red-600'
          }`}
        >
          Выйти
        </button>
      </div>

      <div className="text-center text-xs text-slate-400 space-y-1 pt-6 pb-4">
        <div>PoopTrack v0.9.2</div>
        <div>Made by Evgen. Powered by Supabase & GitHub, 2026.</div>
      </div>
    </div>
  )
}