import React from 'react'

interface WeekChartProps {
  weekData: Array<{ day: string; count: number; isToday: boolean }>
  maxCount: number
}

export function WeekChart({ weekData, maxCount }: WeekChartProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 mb-6">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 mb-3">📊 За последние 7 дней</h3>
      <div className="flex items-end justify-between gap-2 h-32">
        {weekData.map((day, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex flex-col justify-end h-20">
              <div
                className={`w-2.5 rounded-t-sm transition-all duration-500 ${
                  day.isToday
                    ? 'bg-emerald-600'
                    : day.count > 0
                      ? 'bg-slate-900'
                      : 'bg-slate-100 h-1.5'
                }`}
                style={{ height: `${day.count > 0 ? Math.max((day.count / maxCount) * 100, 10) : 5}%` }}
              />
            </div>
            <div className="text-[11px] font-medium text-slate-400 tabular-nums mt-2">{day.day}</div>
            <div className={`text-[11px] font-medium tabular-nums ${day.count > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
              {day.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}