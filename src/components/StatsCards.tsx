import React from 'react'

interface StatsCardsProps {
  todayCount: number
  weekCount: number
  totalCount: number
}

export function StatsCards({ todayCount, weekCount, totalCount }: StatsCardsProps) {
  const progressToday = Math.min((todayCount / totalCount) * 100, 100)
  const progressWeek = Math.min((weekCount / totalCount) * 100, 100)

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Today Card */}
      <div className="bg-white rounded-3xl p-4 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 text-sm font-medium">●</div>
          <div className="text-sm font-medium text-slate-500">Сегодня</div>
        </div>
        <div className="text-2xl font-bold text-slate-900 tabular-nums">{todayCount}</div>
        <div className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-indigo-500 w-[{progressToday}%]"
            style={{ width: `${progressToday}%` }}
          />
        </div>
      </div>

      {/* Week Card */}
      <div className="bg-white rounded-3xl p-4 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 text-sm font-medium">●</div>
          <div className="text-sm font-medium text-slate-500">Неделя</div>
        </div>
        <div className="text-2xl font-bold text-slate-900 tabular-nums">{weekCount}</div>
        <div className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-500 w-[{progressWeek}%]"
            style={{ width: `${progressWeek}%` }}
          />
        </div>
      </div>
    </div>
  )
}