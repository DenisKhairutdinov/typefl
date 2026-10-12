/**
 * Телефон: разбор, форматирование на лету и проверка.
 * Российские и казахстанские номера (+7) форматируются по маске +7 (900) 123-45-67,
 * номера с другим кодом страны принимаются в международном виде (10–15 цифр).
 */

/** Разбирает ввод в цифры и режим. */
function parse(raw) {
  const text = String(raw)
  let digits = text.replace(/\D/g, '')
  const wantsPlus = text.trim().startsWith('+')
  const international = wantsPlus && digits !== '' && !['7', '8'].includes(digits[0])

  if (international) return { digits: digits.slice(0, 15), international, wantsPlus }

  // 8 вместо +7, а также ввод без кода страны
  if (digits[0] === '8') digits = `7${digits.slice(1)}`
  else if (digits !== '' && digits[0] !== '7') digits = `7${digits}`
  return { digits: digits.slice(0, 11), international, wantsPlus }
}

/** Форматирует номер по мере ввода. */
export function formatPhone(raw) {
  const { digits, international, wantsPlus } = parse(raw)
  if (!digits) return wantsPlus ? '+' : ''
  if (international) return `+${digits}`

  const rest = digits.slice(1)
  let out = '+7'
  if (rest.length > 0) out += ` (${rest.slice(0, 3)}`
  if (rest.length >= 3) out += ')'
  if (rest.length > 3) out += ` ${rest.slice(3, 6)}`
  if (rest.length > 6) out += `-${rest.slice(6, 8)}`
  if (rest.length > 8) out += `-${rest.slice(8, 10)}`
  return out
}

/**
 * Состояние номера:
 * empty — пусто, partial — вводится, valid — полный, bad-code — код города или оператора не бывает.
 */
export function phoneState(raw) {
  const { digits, international } = parse(raw)
  if (!digits) return 'empty'
  if (international) return digits.length >= 10 ? 'valid' : 'partial'
  const rest = digits.slice(1)
  // Коды городов и операторов начинаются с 3–9
  if (rest.length > 0 && !/^[3-9]/.test(rest)) return 'bad-code'
  return rest.length === 10 ? 'valid' : 'partial'
}

export const isPhoneValid = (raw) => phoneState(raw) === 'valid'

const MESSAGES = {
  partial: 'Введите номер полностью, например +7 (900) 123-45-67',
  'bad-code': 'Код города или оператора начинается с цифры от 3 до 9. Проверьте номер.',
}

/** Подключает маску и живую проверку ко всем полям телефона внутри root. */
export function initPhoneInputs(root) {
  const touch = (input) => {
    const field = input.closest('.field')
    let note = field.querySelector('.field__msg')
    if (!note) {
      note = document.createElement('span')
      note.className = 'field__msg'
      note.setAttribute('role', 'status')
      field.append(note)
    }
    return { field, note }
  }

  const render = (input, final) => {
    const { field, note } = touch(input)
    const state = phoneState(input.value)
    field.classList.toggle('field--valid', state === 'valid')
    const invalid = state === 'bad-code' || (final && state === 'partial')
    field.classList.toggle('field--invalid', invalid)
    input.setAttribute('aria-invalid', String(invalid))
    note.textContent = invalid ? MESSAGES[state] : ''
  }

  root.addEventListener('input', (event) => {
    const input = event.target.closest('input[name="phone"]')
    if (!input) return

    const before = input.value
    const caret = input.selectionStart ?? before.length
    let digitsBeforeCaret = before.slice(0, caret).replace(/\D/g, '').length

    // Backspace по знаку маски должен удалять цифру, а не «застревать»
    if (event.inputType === 'deleteContentBackward' && input.dataset.last) {
      const prev = input.dataset.last.replace(/\D/g, '')
      if (prev === before.replace(/\D/g, '') && digitsBeforeCaret > 0) {
        digitsBeforeCaret -= 1
        const digits = before.replace(/\D/g, '')
        const trimmed = digits.slice(0, digitsBeforeCaret) + digits.slice(digitsBeforeCaret + 1)
        input.value = trimmed
      }
    }

    const formatted = formatPhone(input.value)
    input.value = formatted
    input.dataset.last = formatted

    // Курсор остаётся после того же количества цифр
    let pos = 0
    let seen = 0
    const hasPlusOnly = formatted === '+'
    if (!hasPlusOnly) {
      for (; pos < formatted.length && seen < digitsBeforeCaret; pos += 1) {
        if (/\d/.test(formatted[pos])) seen += 1
      }
    } else {
      pos = 1
    }
    if (event.inputType === 'insertText' || event.inputType === 'insertFromPaste')
      pos = formatted.length
    input.setSelectionRange(pos, pos)
    render(input, false)
  })

  root.addEventListener(
    'blur',
    (event) => {
      const input = event.target.closest?.('input[name="phone"]')
      if (input && input.value) render(input, true)
    },
    true,
  )
}
