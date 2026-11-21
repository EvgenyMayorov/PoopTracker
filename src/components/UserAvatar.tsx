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
 * - 3D-аватары (ключи: 'dino', 'wolf' и т.д.) — рендерит  с картинкой из public/avatars/
 * - Старые эмодзи-аватары ('💩', '🦖' и т.д.) — рендерит текст эмодзи
 * - null / пустую строку — рендерит дефолтный эмодзи '💩'
 *
 * @param avatar  Значение поля profiles.avatar (ключ 3D-аватара, эмодзи или null)
 * @param className Tailwind-классы для контейнера (размер и т.п.)
 * @param containerClassName Дополнительные классы контейнера
 */
interface UserAvatarProps {
  avatar: string | null | undefined
  className?: string
  containerClassName?: string
}

export function UserAvatar({ avatar, className, containerClassName }: UserAvatarProps) {
  const fallbackAvatar = avatar || '💩'

  if (is3DAvatarKey(fallbackAvatar)) {
    const avatarInfo = AVATARS_3D.find((a) => a.id === fallbackAvatar)
    const fileName = avatarInfo ? avatarInfo.fileName : 'Dino.png'
    return (
      <div className={`rounded-full overflow-hidden shrink-0 ${containerClassName ?? ''}`}>
        <img
          src={getAvatarUrl(fileName)}
          alt={avatarInfo?.label || fallbackAvatar}
          className={`w-full h-full object-cover rounded-full ${className ?? ''}`}
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  // Старый эмодзи-аватар или дефолтный — рендерим текст как раньше
  return (
    <div className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center ${containerClassName ?? ''}`}>
      <span className={`text-center ${className ?? ''}`}>{fallbackAvatar}</span>
    </div>
  )
}
