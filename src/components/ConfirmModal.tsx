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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-center mb-3 text-slate-900">{title}</h2>
        <p className="text-slate-600 text-center text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 py-3 rounded-xl font-semibold transition-colors border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-semibold transition-colors border border-slate-200 bg-slate-900 text-white hover:bg-slate-800 ${confirmClassName}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}