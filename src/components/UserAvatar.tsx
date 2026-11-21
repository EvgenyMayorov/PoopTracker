import React from 'react'

// Список доступных 3D-аватаров (ключ -> файл картинки, человекочитаемое имя)
export const AVATARS_3D: Array<{ id: string; fileName: string; label: string }> = [
  { id: 'dino', fileName: 'Dino.png', label: 'Дино' },
  { id: 'wolf', fileName: 'Wolf.png', label: 'Волк' },
  { id: 'capybara', fileName: 'Capybara.png', label: 'Капибара' },
  { id: 'lion-little', fileName: 'LionLittle.png', label: 'Львёнок' },
  { id: 'lion', fileName: 'Lion.png', label: 'Лев' },
  { id: 'crocodile', fileName: 'Crocodile.png', label: 'Крокодил' },
  { id: 'fox-little', fileName: 'FoxLittle.png', label: 'Лисёнок' },
  { id: 'panther', fileName: 'Panther.png', label: 'Пантера' },
  { id: 'raven', fileName: 'Raven.png', label: 'Ворон' },
  { id: 'panda', fileName: 'Panda.png', label: 'Панда' },
  { id: 'bear', fileName: 'Bear.png', label: 'Медведь' },
  { id: 'raccoon', fileName: 'Raccoon.png', label: 'Енот' },
  { id: 'fox', fileName: 'Fox.png', label: 'Лис' },
]

// Множество ключей 3D-аватаров для быстрой проверки
export const AVATAR_3D_IDS = new Set(AVATARS_3D.map((a) => a.id))

/**
 * Формирует полный URL картинки аватара с учётом base path Vite.
 * Работает как в dev-режиме, так и на GitHub Pages (/PoopTracker/).
 */
export function getAvatarUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}avatars/${fileName}`
}

/**
 * Проверяет, является ли переданное значение ключом 3D-аватара.
 */
export function is3DAvatarKey(value: string | null | undefined): value is string {
  return !!value && AVATAR_3D_IDS.has(value)
}

/**
 * Единый компонент отрисовки аватара пользователя.
 *
 * Поддерживает:
 * - 3D-аватары (ключи: 'dino', 'wolf' и т.д.) — рендерит с картинкой из public/avatars/
 * - Старые эмодзи-аватары ('💩', '🦖' и т.д.) — рендерит текст эмодзи
 * - null / пустую строку — рендерит дефолтный эмодзи '💩'
 *
 * @param avatar  Значение поля profiles.avatar (ключ 3D-аватара, эмодзи или null)
 * @param className Tailwind-классы для внутреннего <img>
 * @param containerClassName Tailwind-классы для контейнера (размер и т.п.)
 */
interface UserAvatarProps {
  avatar: string | null | undefined
  className?: string
  containerClassName?: string
}

// Страховка размеров: если размер не передан, всегда w-10 h-10 (40px),
// чтобы ни одна картинка 512×512 не могла раздуться на пол-экрана.
const DEFAULT_CONTAINER_CLASS = 'w-10 h-10 rounded-full overflow-hidden shrink-0'
const DEFAULT_IMG_CLASS = 'w-full h-full object-cover rounded-full block'

function hasSizeClass(cls: string | undefined): boolean {
  if (!cls) return false
  return /(^|\s)(w-|h-)/.test(cls)
}

export function UserAvatar({ avatar, className, containerClassName }: UserAvatarProps) {
  const fallbackAvatar = avatar || '💩'
  const imgClass = className
    ? hasSizeClass(className)
      ? `object-cover block ${className}`
      : DEFAULT_IMG_CLASS
    : DEFAULT_IMG_CLASS

  if (is3DAvatarKey(fallbackAvatar)) {
    const avatarInfo = AVATARS_3D.find((a) => a.id === fallbackAvatar)
    const fileName = avatarInfo ? avatarInfo.fileName : 'Dino.png'
    const containerClass = hasSizeClass(containerClassName)
      ? (containerClassName as string)
      : `${DEFAULT_CONTAINER_CLASS} ${containerClassName ?? ''}`.trim()

    return (
      <div className={containerClass}>
        <img
          src={getAvatarUrl(fileName)}
          alt={avatarInfo?.label || fallbackAvatar}
          className={imgClass}
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  // Старый эмодзи-аватар или дефолтный — рендерим текст как раньше
  const containerClass = hasSizeClass(containerClassName)
    ? `flex items-center justify-center ${containerClassName}`
    : `${DEFAULT_CONTAINER_CLASS} flex items-center justify-center ${containerClassName ?? ''}`.trim()

  return (
    <div className={containerClass}>
      <span className={`text-center ${className ?? ''}`}>{fallbackAvatar}</span>
    </div>
  )
}
