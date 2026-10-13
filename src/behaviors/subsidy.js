import { track } from '../lib/track.js'

/** Условия программы: 10% от стоимости, не более 500 000 ₽, техника передана до 30 ноября 2026. */
const RATE = 0.1
const CAP = 500_000
const DEADLINE = new Date(2026, 10, 30, 23, 59, 59)
const DAY = 86_400_000

const format = (value) => new Intl.NumberFormat('ru-RU').format(value)

/** «1 день», «2 дня», «5 дней». */
function plural(n) {
  const last = n % 10
  const tens = n % 100
  if (tens >= 11 && tens <= 14) return 'дней'
  if (last === 1) return 'день'
  if (last >= 2 && last <= 4) return 'дня'
  return 'дней'
}

/**
 * Калькулятор субсидии: по стоимости полуприцепа показывает размер скидки на аванс.
 * После 30 ноября 2026 блок скрывается сам. Посчитанное уходит в заявку вместе с кнопкой.
 */
export function initSubsidy(root) {
  const box = root.querySelector('[data-subsidy]')
  if (!box) return

  const left = Math.ceil((DEADLINE - Date.now()) / DAY)
  if (left < 0) {
    box.hidden = true
    return
  }

  const input = box.querySelector('[data-subsidy-input]')
  const sum = box.querySelector('[data-subsidy-sum]')
  const note = box.querySelector('[data-subsidy-note]')
  const cta = root.querySelector('[data-subsidy-cta]')
  const initialNote = note.textContent.trim()
  box.querySelector('[data-subsidy-days]').textContent =
    `Техника должна быть передана до 30 ноября, осталось ${left} ${plural(left)}`

  let tracked = false
  input.addEventListener('input', () => {
    const digits = input.value.replace(/\D/g, '').slice(0, 10)
    const cost = Number(digits)
    input.value = cost ? format(cost) : ''

    if (!cost) {
      sum.textContent = '0'
      note.textContent = initialNote
      delete cta?.dataset.config
      delete cta?.dataset.configRows
      return
    }

    const subsidy = Math.min(Math.round(cost * RATE), CAP)
    sum.textContent = format(subsidy)
    note.textContent =
      subsidy === CAP
        ? `Максимум программы: ${format(CAP)} ₽ достигается при стоимости от ${format(CAP / RATE)} ₽. Работает как скидка на аванс по лизингу.`
        : `10% от ${format(cost)} ₽. Максимум ${format(CAP)} ₽ достигается при стоимости от ${format(CAP / RATE)} ₽.`

    if (cta) {
      const rows = [
        ['Стоимость техники', `${format(cost)} ₽`],
        ['Субсидия', `${format(subsidy)} ₽`],
      ]
      cta.dataset.config = rows.map(([key, value]) => `${key}: ${value}`).join(', ')
      cta.dataset.configRows = JSON.stringify(rows)
    }
    if (!tracked) {
      tracked = true
      track('subsidy_calc', { value: cost })
    }
  })
}
