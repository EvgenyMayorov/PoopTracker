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
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col items-start min-w-0">
          <div className="text-lg font-bold text-slate-700 leading-tight mb-0.5 truncate">
            {displayName || 'Пользователь'}
          </div>
          <div className="text-[34px] font-extrabold text-slate-900 leading-none tracking-tight">
            Сводка
          </div>
        </div>
        <div className="shrink-0">
          <UserAvatar
            avatar={avatar || '💩'}
            className="w-24 h-24 rounded-full overflow-hidden shrink-0 shadow-md ring-2 ring-white/70"
            style={{ width: 96, height: 96 }}
          />
        </div>
      </div>
    </header>
  )
}