import { useState, useEffect } from 'react'
import { t } from '../i18n'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [isStandalone, setIsStandalone] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')
  const [dismissed, setDismissed] = useState(false)

  // Проверка режима standalone и платформы
  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      setIsStandalone(standalone)
    }

    checkStandalone()

    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkStandalone)
    }

    // Определяем мобильную платформу (iOS / Android / другое)
    const ua = navigator.userAgent || ''
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1)
    const isAndroid = /Android/.test(ua)

    if (isIOS) {
      setPlatform('ios')
    } else if (isAndroid) {
      setPlatform('android')
    }

    // Перехват beforeinstallprompt для Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as any)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', checkStandalone)
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  // Читаем состояние закрытия баннера из localStorage
  useEffect(() => {
    setDismissed(localStorage.getItem('poop_pwa_dismissed') === 'true')
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem('poop_pwa_dismissed', 'true')
    } catch {
      /* ignore */
    }
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else {
      setShowModal(true)
    }
  }

  if (isStandalone || dismissed) {
    return null
  }

  const isIOS = platform === 'ios'
  const isMobile = window.matchMedia('(max-width: 480px)').matches

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-white p-3 shadow-sm mb-3">
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">📲</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{t('pwaBanner')}</p>
          {isIOS ? (
            <p className="text-xs text-slate-600 mt-1 leading-snug">
              {t('pwaIOSMobileHint')}
            </p>
          ) : platform === 'android' && !deferredPrompt ? (
            <p className="text-xs text-slate-600 mt-1 leading-snug">
              {t('pwaAndroidMobileHint')}
            </p>
          ) : null}
        </div>
        <button
          onClick={handleDismiss}
          aria-label={t('pwaDismissAria')}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 leading-none sm:text-sm"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-2 border-t border-slate-100">
        <button
          onClick={handleInstallClick}
          className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
            deferredPrompt
              ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white'
              : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'
          }`}
        >
          {deferredPrompt ? t('pwaInstall') : t('pwaGuide')}
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
        >
          {t('pwaLater')}
        </button>
      </div>
{showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">
              {t('pwaGuideTitle')}
            </h2>

            {/* Android инструкция */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-blue-600 mb-3">
                {t('pwaAndroidTitle')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-slate-700 text-sm pt-1">
                    {t('pwaAndroidStep1')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-slate-700 text-sm pt-1">
                    {t('pwaAndroidStep2')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-slate-700 text-sm pt-1">
                    {t('pwaAndroidStep3')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                    4
                  </div>
                  <p className="text-slate-700 text-sm pt-1">
                    {t('pwaAndroidStep4')}
                  </p>
                </div>
              </div>
            </div>

            {/* iOS инструкция */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-purple-600 mb-3">
                {t('pwaIOSTitle')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold flex-shrink-0">
                    1
                  </div>
                  <p className="text-slate-700 text-sm pt-1">
                    {t('pwaIOSStep1')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold flex-shrink-0">
                    2
                  </div>
                  <p className="text-slate-700 text-sm pt-1">
                    {t('pwaIOSStep2')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold flex-shrink-0">
                    3
                  </div>
                  <p className="text-slate-700 text-sm pt-1">
                    {t('pwaIOSStep3')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold flex-shrink-0">
                    4
                  </div>
                  <p className="text-slate-700 text-sm pt-1">
                    {t('pwaIOSStep4')}
                  </p>
                </div>
              </div>
            </div>

            {/* Кнопка закрытия */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
            >
              {t('pwaClose')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
