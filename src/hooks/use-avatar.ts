import { useState, useCallback } from 'react'

export function useAvatar(initialAvatar?: string) {
  const [avatar, setAvatar] = useState<string>(() =>
    initialAvatar || localStorage.getItem('poop_avatar') || '💩'
  )

  const updateAvatar = useCallback((newAvatar: string) => {
    setAvatar(newAvatar)
    localStorage.setItem('poop_avatar', newAvatar)
  }, [])

  return { avatar, setAvatar: updateAvatar }
}