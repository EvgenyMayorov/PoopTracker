import React from 'react'

interface WeekChartProps {
  weekData: Array<{ day: string; count: number; isToday: boolean }>
  maxCount: number
}

export function WeekChart({ weekData, maxCount }: WeekChartProps) {
  const maxCountForScale = Math.max(maxCount, 1)

  return (
    <div className="grid grid-cols-7 gap-2.5 items-end h-32 px-2 pt-2">
      {weekData.map((dayData, index) => {
        const heightPct =
          dayData.count > 0 ? Math.max(24, Math.round((dayData.count / maxCountForScale) * 100)) : 12

        return (
          <div key={index} className="flex flex-col items-center h-full justify-end">
            <div
              style={{ height: `${heightPct}%` }}
              className={`w-6 rounded-xl transition-all duration-300 ${
                dayData.count === 0
                  ? 'bg-slate-200/70'
                  : dayData.isToday
                  ? 'bg-gradient-to-b from-indigo-500 to-[#111827]'
                  : 'bg-gradient-to-b from-emerald-400 to-teal-500'
              }`}
            />
            <span
              className={`text-xs mt-2 whitespace-nowrap ${
                dayData.isToday ? 'font-bold text-[#111827]' : 'font-medium text-slate-400'
              }`}
            >
              {dayData.day}
            </span>
          </div>
        )
      })}
    </div>
  )
}
