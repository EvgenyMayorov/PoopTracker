import { useState, useCallback } from 'react'
import { AVATARS_3D, AVATAR_3D_IDS, getAvatarUrl, is3DAvatarKey } from '../components/UserAvatar'

export function useAvatar(initialAvatar?: string) {
  // Определяем начальный аватар: из prop'а, localStorage или дефолт 'Panda'
  const initial = initialAvatar || localStorage.getItem('poop_avatar') || 'Panda'
  const [avatar, setAvatar] = useState<string>(initial)

  const updateAvatar = useCallback((newAvatar: string) => {
    setAvatar(newAvatar)
    localStorage.setItem('poop_avatar', newAvatar)
  }, [])

  return { avatar, setAvatar: updateAvatar }
}