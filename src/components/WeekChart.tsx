import React from 'react'

interface WeekChartProps {
  weekData: Array<{ day: string; count: number; isToday: boolean }>
  maxCount: number
}

export function WeekChart({ weekData, maxCount }: WeekChartProps) {
  const maxCountForScale = Math.max(maxCount, 1)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-400 mb-4">Активность за 7 дней</h3>
      <div className="flex items-end justify-between gap-1 h-32">
        {weekData.map((dayData, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div
              className={`w-3 rounded-t-md transition-all ${dayData.count > 0 ? 'bg-slate-800' : 'bg-slate-100'}`}
              style={{ height: `${(dayData.count / maxCountForScale) * 100}%` }}
            />
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{dayData.day}</span>
            <span className="text-xs font-bold text-slate-900 tabular-nums">{dayData.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}