import { useState, useEffect } from 'react'

function App() {
  const [greeting, setGreeting] = useState('')
  const [showContent, setShowContent] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [time, setTime] = useState(new Date())

  const greetings = [
    'Привет!',
    'Hola!',
    'Hello!',
    'Bonjour!',
    'Ciao!',
    'こんにちは!',
    '你好!',
    'Hallo!',
    '안녕하세요!',
    'Olá!',
  ]

  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      setGreeting(greetings[index])
      index = (index + 1) % greetings.length
    }, 1500)

    setTimeout(() => setShowContent(true), 500)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const cards = [
    { icon: '🚀', title: 'Быстро', description: 'Молниеносная скорость и производительность' },
    { icon: '🎨', title: 'Красиво', description: 'Современный дизайн и анимации' },
    { icon: '💡', title: 'Умные решения', description: 'Инновационные подходы к разработке' },
    { icon: '🌍', title: 'Доступно', description: 'Работает везде и для всех' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden relative">
      {/* Animated background orbs */}
      <div
        className="fixed w-96 h-96 rounded-full bg-purple-500/20 blur-3xl transition-all duration-1000 ease-out pointer-events-none"
        style={{
          left: mousePos.x - 192,
          top: mousePos.y - 192,
        }}
      />
      <div className="fixed w-72 h-72 rounded-full bg-blue-500/10 blur-3xl top-1/4 left-1/4 animate-pulse pointer-events-none" />
      <div className="fixed w-80 h-80 rounded-full bg-pink-500/10 blur-3xl bottom-1/4 right-1/4 animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Greeting animation */}
        <div className="mb-8">
          <h1 className="text-7xl md:text-9xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
            {greeting}
          </h1>
        </div>

        {/* Subtitle */}
        <div
          className={`transition-all duration-1000 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <p className="text-xl md:text-2xl text-gray-300 text-center mb-4">
            Добро пожаловать в удивительный мир веб-разработки ✨
          </p>
          <p className="text-lg text-gray-400 text-center mb-12">
            {time.toLocaleTimeString('ru-RU')} • {time.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Feature cards */}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl transition-all duration-1000 delay-300 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {cards.map((card, index) => (
            <div
              key={index}
              className="group bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="text-4xl mb-4 group-hover:scale-125 transition-transform duration-300">
                {card.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">{card.title}</h3>
              <p className="text-gray-400 text-sm">{card.description}</p>
            </div>
          ))}
        </div>

        {/* Interactive button */}
        <div
          className={`mt-12 transition-all duration-1000 delay-700 ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <button
            onClick={() => {
              const messages = ['🎉 Ура!', '✨ Круто!', '🌟 Супер!', '💫 Отлично!', '🎊 Здорово!']
              const random = messages[Math.floor(Math.random() * messages.length)]
              setGreeting(random)
            }}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-lg font-semibold hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/25 active:scale-95"
          >
            Нажми меня! 🎯
          </button>
        </div>

        {/* Footer */}
        <div
          className={`absolute bottom-8 text-center text-gray-500 text-sm transition-all duration-1000 delay-1000 ${
            showContent ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p>Сделано с ❤️ и React + Tailwind CSS</p>
        </div>
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default App
