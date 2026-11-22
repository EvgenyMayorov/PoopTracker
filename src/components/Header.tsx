import { useState, useEffect } from 'react'
import { Profile } from '../lib/supabase'
import { UserAvatar } from './UserAvatar'

interface HeaderProps {
  activeTab: string
  profile?: Profile | null
}

export function Header({ activeTab, profile }: HeaderProps) {
  const [displayName, setDisplayName] = useState<string>('Пользователь')
  const [avatar, setAvatar] = useState<string>('💩')

  useEffect(() => {
    let mounted = true
    if (profile) {
      const name = profile.username || (profile as any).email?.split('@')[0] || 'Пользователь'
      setDisplayName(name)
      setAvatar(profile.avatar || localStorage.getItem('poop_avatar') || '💩')
    } else {
      const cachedAvatar = localStorage.getItem('poop_avatar')
      if (cachedAvatar && mounted) setAvatar(cachedAvatar)
    }
    return () => {
      mounted = false
    }
  }, [profile])

  return (
    <header className="px-4 bg-transparent">
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center min-w-0">
          <div className="text-[34px] font-extrabold text-slate-900 leading-none tracking-tight">
            Сводка
          </div>
        </div>
        <div className="shrink-0">
          <UserAvatar
            avatar={avatar || '💩'}
            className="w-36 h-36 rounded-full overflow-hidden shrink-0 shadow-md ring-2 ring-white/70"
            style={{ width: 144, height: 144 }}
          />
        </div>
      </div>
    </header>
  )
}