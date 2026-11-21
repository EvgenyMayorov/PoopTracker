import { useCallback, useEffect, useRef, useState } from 'react';

// Глобальная версия приложения, встраиваемая Vite'ом при сборке
declare const __APP_VERSION__: string;

interface VersionInfo {
  version: string;
}

/**
 * Сравнивает две семантические версии.
 * Возвращает true, если remoteVersion строго новее localVersion.
 */
function isVersionNewer(remoteVersion: string, localVersion: string): boolean {
  const parse = (v: string) =>
    v
      .split('.')
      .map((n) => parseInt(n, 10))
      .concat([0, 0, 0])
      .slice(0, 3);
  const [rMajor, rMinor, rPatch] = parse(remoteVersion);
  const [lMajor, lMinor, lPatch] = parse(localVersion);
  if (rMajor !== lMajor) return rMajor > lMajor;
  if (rMinor !== lMinor) return rMinor > lMinor;
  return rPatch > lPatch;
}

/**
 * Хук для автоматической проверки обновлений и применения их.
 * - Проверяет version.json каждые 3 минуты (после 5 секунд от старта).
 * - Если найдена новая версия, показывает модальное окно.
 * - Функция applyUpdate() очищает кэши, обновляет SW и перезагружает страницу.
 */
export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const dismissedVersionRef = useRef<string | null>(null);
  const checkInProgressRef = useRef(false);

  /**
   * Принудительно обновляет приложение:
   * 1. Удаляет все кэши.
   * 2. Обновляет регистрацию Service Worker и активирует ожидающий.
   * 3. Перезагружает страницу.
   */
  const applyUpdate = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        // Удаляем все кэши
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));

        // Обновляем регистрацию SW
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.update()));

        // Активируем ожидающий SW, если есть
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }
    } catch (err) {
      console.warn('[AppUpdate] Ошибка при обновлении SW/кэшей:', err);
    }

    // Небольшая задержка, затем принудительная перезагрузка
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }, []);

  /**
   * Проверяет наличие новой версии на сервере.
   */
  const checkForUpdate = useCallback(async () => {
    if (checkInProgressRef.current) return;
    checkInProgressRef.current = true;

    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${baseUrl}version.json?t=${Date.now()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        console.warn('[AppUpdate] Не удалось загрузить version.json:', response.status);
        return;
      }

      const data = (await response.json()) as VersionInfo;
      const serverVersion = data.version;

      if (!serverVersion) return;

      // Если версия на сервере новее текущей и мы её ещё не отклоняли
      if (isVersionNewer(serverVersion, __APP_VERSION__) && dismissedVersionRef.current !== serverVersion) {
        setRemoteVersion(serverVersion);
        setUpdateAvailable(true);
      }
    } catch (err) {
      console.warn('[AppUpdate] Ошибка проверки обновления:', err);
    } finally {
      checkInProgressRef.current = false;
    }
  }, []);

  /**
   * Закрывает модальное окно обновления до следующей проверки
   * (помечает версию как «отложенную»).
   */
  const dismiss = useCallback(() => {
    if (remoteVersion) {
      dismissedVersionRef.current = remoteVersion;
    }
    setUpdateAvailable(false);
    setRemoteVersion(null);
  }, [remoteVersion]);

  // Запускаем проверку: через 5 секунд после старта, затем каждые 3 минуты
  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      checkForUpdate();
    }, 5000);

    const interval = setInterval(() => {
      checkForUpdate();
    }, 3 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkForUpdate]);

  return {
    updateAvailable,
    remoteVersion,
    applyUpdate,
    checkForUpdate,
    dismiss,
  };
}