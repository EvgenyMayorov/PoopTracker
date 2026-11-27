import React from 'react'

type StatsVariant = 'poop' | 'ballast'

interface StatsCardsProps {
  todayCount: number
  weekCount: number
  totalCount: number
  variant: StatsVariant
}

// Русское склонение слова «сброс» с учётом исключений 11–14.
// 1 -> 'сброс', 2..4 -> 'сброса', 0, 5..20 (и 11–14) -> 'сбросов'
function pluralizeReset(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'сбросов'
  const mod10 = n % 10
  if (mod10 === 1) return 'сброс'
  if (mod10 >= 2 && mod10 <= 4) return 'сброса'
  return 'сбросов'
}

function cellLabel(variant: StatsVariant, index: number, todayCount: number, weekCount: number, totalCount: number): string {
  if (variant === 'poop') {
    return ['Вышло сегодня', 'Вышло за неделю', 'Вышло всего'][index]
  }

  const count = index === 0 ? todayCount : index === 1 ? weekCount : totalCount
  const word = pluralizeReset(count)
  // Заглавная буква в начале подписи: «Сброс…», «Сброса…», «Сбросов…»
  const capitalized = word.charAt(0).toUpperCase() + word.slice(1)

  if (index === 0) {
    // 1-я ячейка: «Сброс балласта сегодня» для единицы, иначе «{склонение} сегодня»
    return count === 1 ? 'Сброс балласта сегодня' : `${capitalized} сегодня`
  }
  if (index === 1) {
    return `${capitalized} за неделю`
  }
  return `${capitalized} всего`
}

export function StatsCards({ todayCount, weekCount, totalCount, variant }: StatsCardsProps) {
  const counts = [todayCount, weekCount, totalCount]

  return (
    <div className="bg-white rounded-[20px] py-4 px-2 grid grid-cols-3 divide-x divide-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      {counts.map((count, index) => (
        <div key={`${index}-${count}`} className="flex flex-col items-center">
          <div className="text-2xl font-extrabold text-[#111827] tabular-nums animate-number-pop">
            {count}
          </div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5 leading-tight text-center">
            {cellLabel(variant, index, todayCount, weekCount, totalCount)}
          </div>
        </div>
      ))}
    </div>
  )
}
