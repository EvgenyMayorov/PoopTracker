import React from 'react'

interface StatsCardsProps {
  todayCount: number
  weekCount: number
  totalCount: number
}

export function StatsCards({ todayCount, weekCount, totalCount }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="rounded-xl p-3 text-center bg-white border-2 border-blue-200">
        <div className="text-2xl font-bold text-blue-400">{todayCount}</div>
        <div className="text-xs text-gray-600">Сегодня</div>
      </div>
      <div className="rounded-xl p-3 text-center bg-white border-2 border-cyan-200">
        <div className="text-2xl font-bold text-cyan-600">{weekCount}</div>
        <div className="text-xs text-gray-600">Неделя</div>
      </div>
      <div className="rounded-xl p-3 text-center bg-white border-2 border-sky-200">
        <div className="text-2xl font-bold text-sky-600">{totalCount}</div>
        <div className="text-xs text-gray-600">Всего</div>
      </div>
    </div>
  )
}