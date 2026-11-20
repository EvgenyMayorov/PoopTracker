import { useState, useEffect } from 'react'
import { Profile } from '../lib/supabase'

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

  const tabTitles: Record<string, string> = {
    home: 'Сводка активности',
    people: 'Люди',
    feed: 'Лента',
    settings: 'Настройки',
  }

  return (
    <header className="h-20 px-4 bg-transparent flex flex-col justify-center gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-full bg-slate-200/80 flex items-center justify-center text-lg shrink-0">
            {avatar || '💩'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {displayName || 'Пользователь'}
            </div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
              PoopTrack
            </div>
          </div>
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
        {tabTitles[activeTab] || 'Сводка активности'}
      </div>
    </header>
  )
}