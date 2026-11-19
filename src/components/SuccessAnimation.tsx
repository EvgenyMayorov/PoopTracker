import { useEffect } from 'react'
import confetti from 'canvas-confetti'

type Props = {
  bristolType?: number | null
  onComplete: () => void
}

// ============ BRICKS TYPE (1–2) ============

function BrickShower() {
  const bricks = [
    { id: 0, x: 10, delay: 0, dur: 1.4, rotate: -15 },
    { id: 1, x: 25, delay: 0.2, dur: 1.6, rotate: 30 },
    { id: 2, x: 40, delay: 0.1, dur: 1.2, rotate: -10 },
    { id: 3, x: 55, delay: 0.3, dur: 1.5, rotate: 20 },
    { id: 4, x: 70, delay: 0, dur: 1.3, rotate: -25 },
    { id: 5, x: 85, delay: 0.15, dur: 1.7, rotate: 45 },
  ]

  return (
    <div className="relative w-full h-48 overflow-hidden">
      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-orange-900/80 to-orange-800/40 rounded-b-3xl" />
      {/* Falling bricks */}
      {bricks.map(b => (
        <div
          key={b.id}
          className="absolute brick-drop"
          style={{
            left: `${b.x}%`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
            ['--brick-rotate' as string]: `${b.rotate}deg`,
          }}
        >
          {/* CSS brick */}
          <div className="w-16 h-7 rounded bg-gradient-to-b from-red-500 to-red-800 border-b-2 border-red-900 shadow-lg relative">
            <div className="absolute top-0 left-1/3 right-1/3 h-1 bg-red-400/60 rounded-full" />
            <div className="absolute bottom-1 left-2 w-4 h-0.5 bg-red-900/60 rounded-full" />
            <div className="absolute bottom-1 right-2 w-4 h-0.5 bg-red-900/60 rounded-full" />
          </div>
        </div>
      ))}
      {/* Pile at bottom */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-12 h-5 rounded bg-gradient-to-b from-red-500 to-red-800 border-b border-red-900 shadow" style={{ transform: `rotate(${(i - 1) * 5}deg)` }} />
        ))}
      </div>
    </div>
  )
}

// ============ PARTY TYPE (3–4) ============

function PartyShow() {
  useEffect(() => {
    const duration = 3500
    const end = Date.now() + duration
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#FF69B4', '#00FF7F']
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0, y: 0.6 }, colors })
      confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1, y: 0.6 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
    const burstTimer = setTimeout(() => {
      confetti({ particleCount: 80, spread: 100, origin: { x: 0.5, y: 0.5 }, colors, startVelocity: 45 })
    }, 300)
    return () => clearTimeout(burstTimer)
  }, [])
  return (
    <div className="relative flex flex-col items-center justify-center py-6">
      <div className="relative mb-2">
        <div className="absolute inset-0 rounded-full bg-yellow-400/30 blur-2xl animate-glow-pulse" />
        <div className="relative text-7xl animate-crown-bounce" style={{ filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.8))' }}>
          👑
        </div>
      </div>
      <div className="flex gap-3 mt-1 mb-2">
        {['⭐', '🌟', '✨', '🌟', '⭐'].map((s, i) => (
          <span key={i} className="text-2xl animate-twinkle" style={{ animationDelay: `${i * 0.15}s` }}>{s}</span>
        ))}
      </div>
      <div className="text-6xl animate-trophy-bounce" style={{ filter: 'drop-shadow(0 0 16px rgba(255,215,0,0.6))' }}>
        🏆
      </div>
    </div>
  )
}

// ============ NUCLEAR TYPE (5–7) ============

function NuclearShow() {
  const bubbles = [
    { id: 0, x: 20, delay: 0, size: 'w-4 h-4' },
    { id: 1, x: 50, delay: 0.3, size: 'w-3 h-3' },
    { id: 2, x: 70, delay: 0.1, size: 'w-5 h-5' },
    { id: 3, x: 35, delay: 0.6, size: 'w-2 h-2' },
    { id: 4, x: 80, delay: 0.4, size: 'w-3 h-3' },
    { id: 5, x: 10, delay: 0.2, size: 'w-4 h-4' },
  ]
  return (
    <div className="relative flex flex-col items-center justify-center py-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-3 bg-hazard-stripes animate-hazard-scroll" />
      <div className="relative mb-2">
        <div className="absolute inset-0 rounded-full bg-lime-400/20 blur-xl animate-glow-pulse" />
        <div className="absolute inset-0 rounded-full bg-yellow-400/20 blur-lg" style={{ animation: 'glow-pulse 1.2s ease-in-out infinite', animationDelay: '0.4s' }} />
        <div className="relative text-8xl animate-radiation-pulse" style={{ filter: 'drop-shadow(0 0 20px rgba(132, 204, 22, 0.9)) drop-shadow(0 0 40px rgba(234, 179, 8, 0.6))' }}>
          ☢️
        </div>
      </div>
      <div className="relative w-40 h-16">
        {bubbles.map(b => (
          <div key={b.id} className={`absolute ${b.size} rounded-full bg-lime-400/60 border border-lime-300/80 animate-toxic-bubble`} style={{ left: `${b.x}%`, bottom: '0', animationDelay: `${b.delay}s` }} />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-hazard-stripes animate-hazard-scroll" style={{ animationDirection: 'reverse' }} />
    </div>
  )
}

// ============ MAIN COMPONENT ============

export function SuccessAnimation({ bristolType, onComplete }: Props) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000)
    return () => clearTimeout(timer)
  }, [onComplete])

  const getType = (): 'bricks' | 'party' | 'nuclear' | 'default' => {
    if (!bristolType) return 'default'
    if (bristolType <= 2) return 'bricks'
    if (bristolType <= 4) return 'party'
    return 'nuclear'
  }

  const type = getType()

  const config = {
    bricks: { title: 'Внимание!', subtitle: 'Обнаружен сброс кирпичей', cardClass: 'modal-bricks', titleClass: 'text-orange-400' },
    party: { title: 'Внимание!', subtitle: 'Обнаружен идеальный стул!', cardClass: 'modal-party', titleClass: 'text-yellow-300' },
    nuclear: { title: 'Внимание!', subtitle: 'Обнаружен сброс термоядерных отходов', cardClass: 'modal-nuclear', titleClass: 'text-lime-400' },
    default: { title: 'Записано!', subtitle: '', cardClass: 'modal-party', titleClass: 'text-white' },
  }[type]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onComplete}
      role="dialog"
      aria-modal="true"
    >
      <div className={`success-modal-card ${config.cardClass} relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl`} onClick={e => e.stopPropagation()}>
        {type === 'bricks' && <BrickShower />}
        {type === 'party' && <PartyShow />}
        {type === 'nuclear' && <NuclearShow />}
        {type === 'default' && <div className="flex flex-col items-center justify-center py-8"><div className="text-7xl animate-crown-bounce">✅</div></div>}
        <div className="px-6 pb-6 pt-2 text-center">
          {type !== 'default' && <div className={`text-lg font-black uppercase tracking-wide mb-1 ${config.titleClass}`}>{config.title}</div>}
          <div className={`font-black leading-tight ${type === 'default' ? 'text-3xl text-white' : 'text-xl text-white'}`}>{config.subtitle}</div>
          <div className="mt-3 text-xs text-white/50 animate-pulse">Нажмите, чтобы закрыть</div>
        </div>
      </div>
    </div>
  )
}
