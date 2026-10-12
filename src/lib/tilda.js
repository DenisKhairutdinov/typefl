/**
 * Мост к скрытой форме Тильды. На сайте заявку заполняет посетитель, а отправляет её форма Тильды:
 * скрипт переносит значения в её поля и нажимает её кнопку. Форма Тильды находится в блоке
 * с CSS-классом uc-form и спрятана стилями сайта.
 *
 * Поля формы Тильды находятся по типу и имени, поэтому точные названия переменных не важны:
 * имя, телефон, почта, комментарий (textarea) и чекбокс согласия.
 */
const FORM = '.uc-form form'
const TIMEOUT = 20000

const tildaForm = () => document.querySelector(FORM)

/** Есть ли на странице форма Тильды, через которую можно отправлять заявки. */
export const hasTildaForm = () => Boolean(tildaForm())

const fields = (form) => {
  const inputs = [...form.querySelectorAll('input, textarea')]
  const text = (input) => input.type === 'text' || input.type === ''
  const named = (input, pattern) => pattern.test(input.name)
  return {
    name: inputs.find((i) => text(i) && named(i, /^(name|имя|fio|фио)/i)),
    phone: inputs.find((i) => i.type === 'tel' || named(i, /phone|тел/i)),
    email: inputs.find((i) => i.type === 'email' || named(i, /e-?mail|почт/i)),
    comment: inputs.find((i) => i.tagName === 'TEXTAREA'),
    consent: inputs.find((i) => i.type === 'checkbox'),
  }
}

/** Записывает значение так, чтобы Тильда его заметила (маски, проверка). */
function fill(input, value) {
  if (!input) return
  if (input.type === 'checkbox') {
    if (input.checked !== Boolean(value)) input.click()
    return
  }
  const proto =
    input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value)
  for (const type of ['input', 'change', 'keyup', 'blur']) {
    input.dispatchEvent(new Event(type, { bubbles: true }))
  }
}

const visible = (node) => Boolean(node) && getComputedStyle(node).display !== 'none'

/** Ждёт ответа Тильды: окно успеха, ошибка или время вышло. */
function waitForResult(form) {
  const root = form.closest('.t-rec') ?? form
  const success = () => visible(root.querySelector('.js-successbox, .t-form__successbox'))
  const failure = () => visible(root.querySelector('.js-errorbox-all, .t-form__errorbox-middle'))
  return new Promise((resolve, reject) => {
    const finish = (done, value) => {
      observer.disconnect()
      clearTimeout(timer)
      done(value)
    }
    const check = () => {
      if (success()) finish(resolve)
      else if (failure()) finish(reject, new Error('Тильда вернула ошибку'))
    }
    const observer = new MutationObserver(check)
    observer.observe(root, { subtree: true, childList: true, attributes: true })
    const timer = setTimeout(() => finish(reject, new Error('Тильда не ответила')), TIMEOUT)
    check()
  })
}

/** Возвращает форму Тильды в исходное состояние, чтобы ею можно было воспользоваться снова. */
function reset(form) {
  const root = form.closest('.t-rec') ?? form
  form.reset()
  for (const box of root.querySelectorAll('.js-successbox, .t-form__successbox'))
    box.style.display = 'none'
  for (const box of root.querySelectorAll('.t-form__inputsbox')) box.style.display = ''
  form.classList.remove('t-form_sending')
}

/** Склеивает поля, которых нет в форме Тильды, в комментарий. */
function commentOf(values) {
  const lines = []
  if (values.model) lines.push(`Модель: ${values.model}`)
  if (values.config) lines.push(`Конфигурация: ${values.config}`)
  if (values.company) lines.push(`Организация или ИНН: ${values.company}`)
  if (values.place) lines.push(`Источник заявки: ${values.place}`)
  if (values.comment) lines.push(`Комментарий: ${values.comment}`)
  return lines.join('\n')
}

/**
 * Отправляет заявку через форму Тильды.
 *
 * @param {{name: string, phone: string, email?: string, comment?: string, company?: string,
 *   model?: string, config?: string, place?: string}} values
 * @returns {Promise<void>} успех или ошибка
 */
export async function sendViaTilda(values) {
  const form = tildaForm()
  if (!form) throw new Error('Форма Тильды не найдена')
  const target = fields(form)

  fill(target.name, values.name)
  fill(target.phone, values.phone)
  fill(target.email, values.email ?? '')
  fill(target.comment, commentOf(values))
  fill(target.consent, true)

  const result = waitForResult(form)
  const button = form.querySelector('.t-submit, button[type="submit"], input[type="submit"]')
  if (button) button.click()
  else form.requestSubmit()

  try {
    await result
  } finally {
    // Тильда показывает своё сообщение об успехе внутри спрятанной формы: убираем его до следующей заявки
    setTimeout(() => reset(form), 300)
  }
}
