import React from 'react'

interface WeekChartProps {
  weekData: Array<{ day: string; count: number; isToday: boolean }>
  maxCount: number
}

export function WeekChart({ weekData, maxCount }: WeekChartProps) {
  return (
    <div className="mb-6 p-4 rounded-2xl bg-white border-2 border-gray-200">
      <h3 className="text-sm font-semibold mb-4 text-gray-600">📊 За последние 7 дней</h3>
      <div className="flex items-end justify-between gap-2 h-32">
        {weekData.map((day, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex flex-col justify-end h-20">
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${
                  day.isToday
                    ? 'bg-gradient-to-t from-cyan-500 to-fuchsia-500'
                    : 'bg-gradient-to-t from-blue-300 to-blue-400'
                }`}
                style={{ height: `${day.count > 0 ? Math.max((day.count / maxCount) * 100, 10) : 5}%` }}
              />
            </div>
            <div className={`text-xs font-medium ${day.isToday ? 'text-cyan-600' : 'text-gray-600'}`}>
              {day.day}
            </div>
            <div className={`text-xs ${day.count > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
              {day.count}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}