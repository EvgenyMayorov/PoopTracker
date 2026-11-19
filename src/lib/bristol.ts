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
