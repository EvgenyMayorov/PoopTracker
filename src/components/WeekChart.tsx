import React from 'react'

interface WeekChartProps {
  weekData: Array<{ day: string; count: number; isToday: boolean }>
  maxCount: number
}

interface DonutSegment {
  startAngle: number
  endAngle: number
  color: string
}

function calculateDonutSegments(data: Array<{ count: number }>, total: number): DonutSegment[] {
  const colors = ['#6366F1', '#F59E0B', '#10B981']
  if (!data || data.length === 0 || total === 0) {
    return [{ startAngle: 0, endAngle: Math.PI * 2, color: '#e5e7eb' }]
  }
  const segmentAngles = data.map(d => (d.count / total) * Math.PI * 2)
  const segments: DonutSegment[] = []
  let currentAngle = 0
  segmentAngles.forEach((angle, i) => {
    segments.push({
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      color: colors[i % colors.length]
    })
    currentAngle += angle
  })
  if (currentAngle < Math.PI * 2) {
    segments[segments.length - 1].endAngle = Math.PI * 2
  }
  return segments
}

export function WeekChart({ weekData, maxCount }: WeekChartProps) {
  const totalCount = weekData.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="bg-white rounded-3xl p-5 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.06)] mb-6 max-w-xl">
      <div className="grid grid-cols-2 gap-5">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-400 mb-3">📊 Активность за 7 дней</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 text-sm font-medium mb-2">●</div>
              <div className="text-xl font-bold text-slate-900 tabular-nums">{totalCount}</div>
              <div className="text-xs text-slate-500">Всего</div>
            </div>
            <div>
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 text-sm font-medium mb-2">●</div>
              <div className="text-xl font-bold text-slate-900 tabular-nums">{weekData[1]?.count || 0}</div>
              <div className="text-xs text-slate-500">Сегодня</div>
            </div>
            <div>
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 text-sm font-medium mb-2">●</div>
              <div className="text-xl font-bold text-slate-900 tabular-nums">{weekData[0]?.count || 0}</div>
              <div className="text-xs text-slate-500">За неделю</div>
            </div>
          </div>
        </div>
        <div className="relative">
          <svg className="w-40 h-40 mx-auto" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="6" />
            {calculateDonutSegments(weekData.map(d => ({ count: d.count })), totalCount).map((seg, i) => (
              <path
                key={i}
                d={`M18 18 m0 ${-14} a14 14 0 ${seg.endAngle > Math.PI ? 1 : 0} 1 ${(seg.endAngle - seg.startAngle) > Math.PI ? 0 : 1} ${seg.endAngle - seg.startAngle > 0 ? (seg.endAngle - seg.startAngle) * 14 : 0},0`}
                fill="none"
                stroke={seg.color}
                strokeWidth="6"
                strokeLinecap="round"
              />
            ))}
            <circle cx="18" cy="18" r="6" fill="white" />
          </svg>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-center text-sm text-slate-500">
            <div className="font-medium text-slate-900">За 7 дней</div>
            <div className="mt-1">{totalCount}</div>
          </div>
        </div>
      </div>
    </div>
  )
}