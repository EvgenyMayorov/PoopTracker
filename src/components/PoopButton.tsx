import React from 'react'
import { useNavigate } from 'react-router-dom'

interface PoopButtonProps {
  onPoop: () => void
}

export function PoopButton({ onPoop }: PoopButtonProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-stretch gap-2.5 my-4">
      <button
        onClick={() => {
          onPoop()
          navigate('/')
        }}
        className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl font-medium text-sm tracking-tight flex items-center justify-center gap-2 transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 21h10c1.1 0 2-.9 2-2v-1c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
          <path d="M8 16h8c1.1 0 2-.9 2-2v-1c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
          <path d="M9 11h6c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
          <path d="M11 6c0-1.1.9-2 2-2s2 .9 2 2" />
          <circle cx="10" cy="14" r="0.5" fill="currentColor" />
          <circle cx="14" cy="14" r="0.5" fill="currentColor" />
        </svg>
        У МЕНЯ ВЫШЛО!
      </button>
      <button
        onClick={() => {}}
        className="shrink-0 h-12 px-3.5 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 border border-slate-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
      >
        <span className="text-base">💨</span>
        Сбросить балласт
      </button>
    </div>
  )
}