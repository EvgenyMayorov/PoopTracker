import React from 'react'

interface StatsCardsProps {
  todayCount: number
  weekCount: number
  totalCount: number
}

export function StatsCards({ todayCount, weekCount, totalCount }: StatsCardsProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl grid grid-cols-3 divide-x divide-slate-200/80 py-3 mb-6">
      <div className="flex flex-col items-center justify-center px-2">
        <div className="text-xl font-semibold text-slate-900 tabular-nums leading-tight">{todayCount}</div>
        <div className="text-[11px] font-medium text-slate-400 mt-0.5">Сегодня</div>
      </div>
      <div className="flex flex-col items-center justify-center px-2">
        <div className="text-xl font-semibold text-slate-900 tabular-nums leading-tight">{weekCount}</div>
        <div className="text-[11px] font-medium text-slate-400 mt-0.5">Неделя</div>
      </div>
      <div className="flex flex-col items-center justify-center px-2">
        <div className="text-xl font-semibold text-slate-900 tabular-nums leading-tight">{totalCount}</div>
        <div className="text-[11px] font-medium text-slate-400 mt-0.5">Всего</div>
      </div>
    </div>
  )
}