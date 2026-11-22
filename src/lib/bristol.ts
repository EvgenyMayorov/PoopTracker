// ============================================
// Helper: полные описания типов по Бристольской шкале
// ============================================

import { t } from '../i18n'

export const BRISTOL_MIN_TYPE = 1
export const BRISTOL_MAX_TYPE = 7

const isValidBristolType = (type?: number | null): type is number =>
  typeof type === 'number' && type >= BRISTOL_MIN_TYPE && type <= BRISTOL_MAX_TYPE

/**
 * Возвращает полное описание типа стула по Бристольской шкале,
 * например: «Запор — отдельные твёрдые комочки».
 */
export function getBristolDescription(type?: number | null): string {
  if (!isValidBristolType(type)) return ''

  const label = t(`bristolLabel${type}`)
  const desc = t(`bristolDesc${type}`)
  if (!desc) return label

  const lowerDesc = desc.charAt(0).toLowerCase() + desc.slice(1)
  return `${label} — ${lowerDesc}`
}

/**
 * Короткий заголовок («Тип 1», «Тип 2»...) — сохраняем для модалки выбора.
 */
export function getBristolTitle(type?: number | null): string {
  if (!isValidBristolType(type)) return ''
  return t(`bristolType${type}`)
}

/**
 * Короткое название статуса стула по Бристольской шкале — для бейджей
 * (без слова «Тип» и без длинного описания).
 *
 * 1 — Запор, 2 — Склонность к запору, 3 — Норма, 4 — Идеал,
 * 5 — Склонность к диарее, 6 — Диарея, 7 — Сильная диарея.
 */
const BRISTOL_SHORT_LABELS: Record<number, string> = {
  1: 'Запор',
  2: 'Склонность к запору',
  3: 'Норма',
  4: 'Идеал',
  5: 'Склонность к диарее',
  6: 'Диарея',
  7: 'Сильная диарея',
}

export function getBristolShortLabel(type?: number | null): string {
  if (!isValidBristolType(type)) return ''
  return BRISTOL_SHORT_LABELS[type] || ''
}
