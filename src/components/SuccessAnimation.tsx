import { useEffect, useState } from 'react'

type Props = {
  onComplete: () => void
}

export function SuccessAnimation({ onComplete }: Props) {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; color: string; delay: number }>>([])

  useEffect(() => {
    const colors = ['#06b6d4', '#d946ef', '#8b5cf6', '#f59e0b', '#10b981']
    const newConfetti = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
    }))
    setConfetti(newConfetti)

    const timer = setTimeout(() => {
      onComplete()
    }, 2000)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {confetti.map((item) => (
        <div
          key={item.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${item.left}%`,
            top: '-20px',
            backgroundColor: item.color,
            animationDelay: `${item.delay}s`,
          }}
        />
      ))}

      <div className="animate-successPop">
        <div className="bg-gradient-to-br from-cyan-500 to-fuchsia-500 rounded-full p-8 shadow-2xl">
          <div className="text-6xl mb-2">✅</div>
          <div className="text-white text-2xl font-bold text-center">
            Записано!
          </div>
        </div>
      </div>
    </div>
  )
}
