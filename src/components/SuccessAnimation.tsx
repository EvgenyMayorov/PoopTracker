import { useEffect, useState } from 'react'

type Props = {
  bristolType?: number
  onComplete: () => void
}

export function SuccessAnimation({ bristolType, onComplete }: Props) {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([])

  useEffect(() => {
    // Создаём частицы в зависимости от типа
    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1,
      duration: 1.5 + Math.random() * 1,
    }))
    setParticles(newParticles)

    const timer = setTimeout(() => {
      onComplete()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onComplete])

  // Определяем тип анимации
  const getType = () => {
    if (!bristolType) return 'default'
    if (bristolType <= 2) return 'bricks'
    if (bristolType <= 4) return 'party'
    return 'nuclear'
  }

  const type = getType()

  // Рендер частиц в зависимости от типа
  const renderParticles = () => {
    if (type === 'bricks') {
      return particles.map((item) => (
        <div
          key={item.id}
          className="absolute text-4xl animate-fallDown"
          style={{
            left: `${item.left}%`,
            top: '-50px',
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          }}
        >
          🧱
        </div>
      ))
    }

    if (type === 'party') {
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
      return particles.map((item) => (
        <div
          key={item.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${item.left}%`,
            top: '-20px',
            backgroundColor: colors[item.id % colors.length],
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          }}
        />
      ))
    }

    if (type === 'nuclear') {
      return particles.map((item) => (
        <div
          key={item.id}
          className="absolute text-3xl animate-floatUp"
          style={{
            left: `${item.left}%`,
            bottom: '-50px',
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          }}
        >
          ☢️
        </div>
      ))
    }

    return null
  }

  // Рендер центрального сообщения
  const renderMessage = () => {
    if (type === 'bricks') {
      return (
        <div className="animate-successPop">
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-8 shadow-2xl border-4 border-orange-300">
            <div className="text-7xl mb-4">🧱</div>
            <div className="text-white text-2xl font-bold text-center">
              Внимание!
            </div>
            <div className="text-white text-xl font-bold text-center mt-2">
              Обнаружен сброс кирпичей
            </div>
          </div>
        </div>
      )
    }

    if (type === 'party') {
      return (
        <div className="animate-successPop">
          <div className="bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 rounded-3xl p-8 shadow-2xl border-4 border-yellow-300">
            <div className="text-7xl mb-4">🎉</div>
            <div className="text-white text-2xl font-bold text-center">
              Внимание!
            </div>
            <div className="text-white text-xl font-bold text-center mt-2">
              Обнаружен идеальный стул!
            </div>
          </div>
        </div>
      )
    }

    if (type === 'nuclear') {
      return (
        <div className="animate-successPop">
          <div className="bg-gradient-to-br from-green-500 via-yellow-500 to-orange-600 rounded-3xl p-8 shadow-2xl border-4 border-green-300 animate-pulse">
            <div className="text-7xl mb-4">☢️</div>
            <div className="text-white text-2xl font-bold text-center">
              Внимание!
            </div>
            <div className="text-white text-xl font-bold text-center mt-2">
              Обнаружен сброс термоядерных отходов
            </div>
          </div>
        </div>
      )
    }

    // Default
    return (
      <div className="animate-successPop">
        <div className="bg-gradient-to-br from-cyan-500 to-fuchsia-500 rounded-full p-8 shadow-2xl">
          <div className="text-6xl mb-2">✅</div>
          <div className="text-white text-2xl font-bold text-center">
            Записано!
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {renderParticles()}
      {renderMessage()}
    </div>
  )
}
