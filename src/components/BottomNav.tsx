import React from 'react'

type ActiveTab = 'home' | 'people' | 'feed' | 'settings'

interface BottomNavProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  onPoop: () => void
}

export function BottomNav({ activeTab, setActiveTab, onPoop }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-16 bg-white/90 backdrop-blur-md border-t border-slate-200/80 grid grid-cols-4 z-30">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeTab === 'home' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'home' ? 2.2 : 1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className={`text-[10px] mt-1 ${activeTab === 'home' ? 'font-medium' : 'font-normal'}`}>Главная</span>
        </button>
        <button
          onClick={() => setActiveTab('people')}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeTab === 'people' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'people' ? 2.2 : 1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className={`text-[10px] mt-1 ${activeTab === 'people' ? 'font-medium' : 'font-normal'}`}>Люди</span>
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeTab === 'feed' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'feed' ? 2.2 : 1.75} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <span className={`text-[10px] mt-1 ${activeTab === 'feed' ? 'font-medium' : 'font-normal'}`}>Лента</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeTab === 'settings' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'settings' ? 2.2 : 1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'settings' ? 2.2 : 1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className={`text-[10px] mt-1 ${activeTab === 'settings' ? 'font-medium' : 'font-normal'}`}>Настройки</span>
        </button>
    </div>
  )
}