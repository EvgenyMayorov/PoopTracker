// ============================================
// Helper: единое правило отображения имени пользователя
// ============================================

export function getDisplayName(profile?: { username?: string | null; email?: string | null; id?: string | null } | null): string {
  if (!profile) return ''

  const username = (profile.username ?? '').trim()
  if (username && username.toLowerCase() !== 'unknown') {
    return username
  }

  const email = (profile.email ?? '').trim()
  if (email && email.includes('@')) {
    const local = email.split('@')[0]?.trim()
    if (local) return local.slice(0, 8)
  } else if (email) {
    return email.slice(0, 8)
  }

  const id = (profile.id ?? '').trim()
  if (id) return `user_${id.slice(0, 6)}`

  return ''
}

export function isNicknameMissing(profile?: { username?: string | null } | null): boolean {
  if (!profile) return true
  const username = (profile.username ?? '').trim()
  if (!username || username.toLowerCase() === 'unknown') return true
  if (/^user_[0-9a-f]{6,}$/i.test(username)) return true
  return false
}
