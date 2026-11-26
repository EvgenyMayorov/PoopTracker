import React from 'react'

interface WeekChartProps {
  weekData: Array<{ day: string; count: number; isToday: boolean }>
  maxCount: number
  chartType?: 'poop' | 'ballast'
}

export function WeekChart({ weekData, maxCount, chartType }: WeekChartProps) {
  const maxCountForScale = Math.max(maxCount, 1)

  const chartGradients = {
    poop: 'from-indigo-600 to-indigo-950',
    ballast: 'from-cyan-500 to-sky-700',
  }

  const emptyDayStyle = {
    poop: 'bg-slate-300/60 border border-white/70',
    ballast: 'bg-slate-300/60 border border-white/70',
  }

  return (
    <div className="grid grid-cols-7 gap-2.5 items-end h-32 px-2 pt-2">
      {weekData.map((dayData, index) => {
        const heightPct =
          dayData.count > 0 ? Math.max(24, Math.round((dayData.count / maxCountForScale) * 100)) : 12

        const isEmpty = dayData.count === 0

        return (
          <div
            key={index}
            className="flex flex-col items-center h-full justify-end transition-all duration-500 ease-out cubic-bezier(0.34, 1.56, 0.64, 1)"
          >
            <div
              style={{ height: `${heightPct}%` }}
              className={`w-6 rounded-xl bar-grow bg-gradient-to-b ${
                isEmpty
                  ? emptyDayStyle[chartType ?? 'poop']
                  : chartGradients[chartType ?? 'poop']
              }`}
            />
            <span className="text-xs mt-2 whitespace-nowrap font-semibold text-slate-900">
              {dayData.day}
            </span>
          </div>
        )
      })}
    </div>
  )
}
