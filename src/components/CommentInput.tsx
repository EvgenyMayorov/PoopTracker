import React from 'react'
import { memo, KeyboardEvent } from 'react'

interface CommentInputProps {
  eventId: string
  value: string
  onChange: (value: string) => void
  onSubmit: (eventId: string) => void
  placeholder?: string
  disabled?: boolean
}

export const CommentInput = memo(function CommentInput({
  eventId,
  value,
  onChange,
  onSubmit,
  placeholder = 'Добавить комментарий...',
  disabled = false,
}: CommentInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(eventId)
    }
  }

  return (
    <div className="flex gap-2 mt-3">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 ${
          disabled
            ? 'bg-gray-100 border-2 border-gray-200 text-gray-500 placeholder-gray-400 cursor-not-allowed'
            : 'bg-white border-2 border-gray-200 text-gray-800 placeholder-gray-400'
        }`}
        autoComplete="off"
      />
      <button
        onClick={() => onSubmit(eventId)}
        disabled={disabled || !value.trim()}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
          disabled || !value.trim()
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white hover:from-cyan-600 hover:to-fuchsia-600'
        }`}
      >
        Отправить
      </button>
    </div>
  )
})

CommentInput.displayName = 'CommentInput'