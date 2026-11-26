import React from 'react'
import { useNavigate } from 'react-router-dom'

interface PoopButtonProps {
  onPoop: () => void
  onResetBallast?: () => void
  isSendingBallast?: boolean
  showBallastButton?: boolean
  showPoopButton?: boolean
}

export function PoopButton({
  onPoop,
  onResetBallast,
  isSendingBallast = false,
  showBallastButton = true,
  showPoopButton = true,
}: PoopButtonProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-2.5 pt-1">
      <button
        onClick={() => {
          onPoop()
          navigate('/')
        }}
        className="w-full h-14 rounded-full bg-[#111827] hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-[15px] flex items-center justify-center shadow-md shadow-slate-900/10 transition-all"
      >
        У меня вышло!
      </button>
      {showBallastButton && (
        <button
          type="button"
          onClick={() => onResetBallast?.()}
          disabled={isSendingBallast}
          className={`w-full h-12 rounded-full bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-semibold text-sm flex items-center justify-center gap-1.5 shadow-[0_2px_10px_rgba(15,23,42,0.05)] border border-slate-100 transition-all ${isSendingBallast ? 'opacity-60' : ''}`}
        >
          <span>Сбросить балласт</span>
          <span className="text-base">💨</span>
        </button>
      )}
    </div>
  )
}
