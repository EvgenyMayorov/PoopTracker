import { useState, useEffect } from 'react'
import { Lang, t } from '../i18n'

type Props = {
  lang: Lang
}

export function PWAInstallBanner({ lang }: Props) {
  const [isStandalone, setIsStandalone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Проверка режима standalone
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      setIsStandalone(isStandaloneMode)
    }

    checkStandalone()

    // Слушаем изменение режима отображения
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleChange = () => checkStandalone()
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    }

    // Перехват beforeinstallprompt для Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleBannerClick = async () => {
    // Если есть deferredPrompt (Android), показываем системное окно установки
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else {
      // Иначе показываем модалку с инструкцией
      setShowModal(true)
    }
  }

  // Если приложение уже установлено, не показываем баннер
  if (isStandalone) {
    return null
  }

  return (
    <>
      {/* Баннер */}
      <div 
        onClick={handleBannerClick}
        className="bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-purple-500 p-4 cursor-pointer hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-3xl">📲</div>
            <div className="text-white font-semibold text-sm">
              {t(lang, 'pwaBanner')}
            </div>
          </div>
          <button className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-white font-semibold text-sm whitespace-nowrap hover:bg-white/30 transition-colors">
            {deferredPrompt ? t(lang, 'pwaInstall') : t(lang, 'pwaGuide')}
          </button>
        </div>
      </div>

      {/* Модалка с инструкцией */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-950 border-2 border-cyan-500/30 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              {t(lang, 'pwaGuideTitle')}
            </h2>

            {/* Android инструкция */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-cyan-400 mb-3">
                {t(lang, 'pwaAndroidTitle')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaAndroidStep1')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaAndroidStep2')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaAndroidStep3')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold flex-shrink-0">
                    4
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaAndroidStep4')}</p>
                </div>
              </div>
            </div>

            {/* iOS инструкция */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-fuchsia-400 mb-3">
                {t(lang, 'pwaIOSTitle')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-fuchsia-400 font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaIOSStep1')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-fuchsia-400 font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaIOSStep2')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-fuchsia-400 font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaIOSStep3')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-fuchsia-400 font-bold flex-shrink-0">
                    4
                  </div>
                  <p className="text-gray-300 text-sm pt-1">{t(lang, 'pwaIOSStep4')}</p>
                </div>
              </div>
            </div>

            {/* Кнопка закрытия */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
            >
              {t(lang, 'pwaClose')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
