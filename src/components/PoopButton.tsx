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
        className="flex-1 rounded-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
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
        className="rounded-full h-12 px-4 bg-white text-slate-700 font-medium shadow-[0_4px_14px_rgba(0,0,0,0.05)] transition-all"
        onClick={() => {}}
      >
        <span className="text-base">💨</span>
        Сбросить балласт
      </button>
    </div>
  )
}