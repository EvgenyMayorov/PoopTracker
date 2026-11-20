import React from 'react'
import { useNavigate } from 'react-router-dom'

interface PoopButtonProps {
  onPoop: () => void
}

export function PoopButton({ onPoop }: PoopButtonProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => {
        onPoop()
        navigate('/')
      }}
      className={`relative w-48 h-48 rounded-full shadow-2xl border-4 transition-all duration-200 hover:scale-105 active:scale-90 group bg-gradient-to-br from-blue-400 via-cyan-400 to-sky-400 shadow-blue-500/40 border-blue-300/50`}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <svg className="w-20 h-20 text-white transition-transform duration-200 group-active:scale-125" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 21h10c1.1 0 2-.9 2-2v-1c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
          <path d="M8 16h8c1.1 0 2-.9 2-2v-1c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
          <path d="M9 11h6c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v1c0 1.1.9 2 2 2z" />
          <path d="M11 6c0-1.1.9-2 2-2s2 .9 2 2" />
          <circle cx="10" cy="14" r="0.5" fill="currentColor" />
          <circle cx="14" cy="14" r="0.5" fill="currentColor" />
        </svg>
        <span className="text-sm font-bold mt-2 text-center leading-tight">У МЕНЯ ВЫШЛО!</span>
      </div>
    </button>
  )
}