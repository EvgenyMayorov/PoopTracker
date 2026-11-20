import React from 'react'

interface StatsCardsProps {
  todayCount: number
  weekCount: number
  totalCount: number
}

export function StatsCards({ todayCount, weekCount, totalCount }: StatsCardsProps) {
  return (
    <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 grid grid-cols-3 divide-x divide-slate-100">
      <div className="flex flex-col items-center">
        <div className="text-sm font-medium text-slate-500">Сегодня</div>
        <div className="text-xl font-bold text-slate-900 tabular-nums">{todayCount}</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-sm font-medium text-slate-500">Неделя</div>
        <div className="text-xl font-bold text-slate-900 tabular-nums">{weekCount}</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-sm font-medium text-slate-500">Всего</div>
        <div className="text-xl font-bold text-slate-900 tabular-nums">{totalCount}</div>
      </div>
    </div>
  )
}