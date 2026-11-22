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
    <header className="w-full">
      <div className="flex items-start justify-between gap-4 w-full">
        <div className="flex flex-col items-start text-left min-w-0">
          <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 leading-none mb-2 truncate max-w-full">
            Сводка
          </h1>
          <div className="text-xl sm:text-2xl font-bold text-slate-800 truncate max-w-full">
            {displayName}
          </div>
        </div>
        <div className="shrink-0">
          <UserAvatar
            avatar={avatar || '💩'}
            containerClassName="w-[150px] h-[150px] !w-[150px] !h-[150px] overflow-hidden rounded-full shrink-0 shadow-md ring-2 ring-white/70"
            className="text-7xl"
          />
        </div>
      </div>
    </header>
  )
}