import React from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  onConfirm: () => void
  onCancel: () => void
  confirmClassName?: string
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmClassName = 'bg-red-500 hover:bg-red-600 text-white',
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-purple-950 border-2 border-cyan-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-white text-center mb-3">{title}</h2>
        <p className="text-gray-300 text-center text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
              confirmClassName.includes('red')
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-500'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-semibold transition-colors border border-white/20 ${confirmClassName}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}