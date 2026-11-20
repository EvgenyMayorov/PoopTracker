import { Event } from './types'

export function useWeekStats(events: Event[]) {
  const weekData = events && events.length > 0 ? (() => {
    const data: Array<{ day: string; count: number; isToday: boolean }> = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const count = events.filter(e => {
        const eventDate = new Date(e.created_at)
        return eventDate.toDateString() === date.toDateString()
      }).length
      data.push({
        day: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
        count,
        isToday: i === 0,
      })
    }
    return data
  })() : Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return {
      day: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
      count: 0,
      isToday: i === 6,
    }
  })

  const todayCount = events.filter(e => {
    const eventDate = new Date(e.created_at)
    const today = new Date()
    return eventDate.toDateString() === today.toDateString()
  }).length

  const weekCount = weekData.reduce((sum, d) => sum + d.count, 0)
  const maxCount = Math.max(...weekData.map(d => d.count), 1)

  return {
    weekData,
    todayCount,
    weekCount,
    maxCount,
  }
}