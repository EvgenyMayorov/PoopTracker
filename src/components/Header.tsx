import React from 'react'

interface HeaderProps {
  activeTab: string
}

export function Header({ activeTab }: HeaderProps) {
  const tabTitles: Record<string, string> = {
    home: 'Поиск',
    people: 'Люди',
    feed: 'Лента',
    settings: 'Настройки',
  }

  return (
    <header className="h-14 px-4 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20">
      <span className="text-base font-semibold tracking-tight text-slate-900">
        {tabTitles[activeTab] || 'Поиск'}
      </span>
      <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-base shrink-0">
        💩
      </span>
    </header>
  )
}