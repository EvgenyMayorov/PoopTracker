import React from 'react'

interface StatsCardsProps {
  todayCount: number
  weekCount: number
  totalCount: number
}

export function StatsCards({ todayCount, weekCount, totalCount }: StatsCardsProps) {
  return (
    <div className="bg-white rounded-[20px] py-4 px-2 grid grid-cols-3 divide-x divide-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col items-center">
        <div key={todayCount} className="text-2xl font-extrabold text-[#111827] tabular-nums animate-number-pop">
          {todayCount}
        </div>
        <div className="text-xs font-medium text-slate-400 mt-0.5">Сегодня</div>
      </div>
      <div className="flex flex-col items-center">
        <div key={weekCount} className="text-2xl font-extrabold text-[#111827] tabular-nums animate-number-pop">
          {weekCount}
        </div>
        <div className="text-xs font-medium text-slate-400 mt-0.5">Неделя</div>
      </div>
      <div className="flex flex-col items-center">
        <div key={totalCount} className="text-2xl font-extrabold text-[#111827] tabular-nums animate-number-pop">
          {totalCount}
        </div>
        <div className="text-xs font-medium text-slate-400 mt-0.5">Всего</div>
      </div>
    </div>
  )
}
