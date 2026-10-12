import { LEAD_ENDPOINT } from '../config.js'
import { initPhoneInputs, isPhoneValid } from '../lib/phone.js'
import { hasTildaForm, sendViaTilda } from '../lib/tilda.js'
import { track } from '../lib/track.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Подсвечивает поле с ошибкой и встряхивает его; подсветка уходит, когда посетитель начинает исправлять. */
function shake(input) {
  const box = input.closest('.field, .consent')
  if (!box) return
  box.classList.remove('is-shake')
  // Перезапуск анимации: без чтения размеров повторное добавление класса её не запустит
  void box.offsetWidth
  box.classList.add('is-shake')
  box.addEventListener('animationend', () => box.classList.remove('is-shake'), { once: true })
  if (box.classList.contains('field')) {
    box.classList.add('field--invalid')
    input.addEventListener('input', () => box.classList.remove('field--invalid'), { once: true })
  }
}

/**
 * Проверяет форму и отправляет заявку.
 *
 * @param {HTMLFormElement} form
 * @param {string} goal событие Метрики при успешной отправке
 */
export async function submitLead(form, goal) {
  const status = form.querySelector('[data-form-status]')
  const say = (text, state) => {
    status.textContent = text
    status.dataset.state = state
  }
  const name = form.elements.namedItem('name')
  const phone = form.elements.namedItem('phone')
  const email = form.elements.namedItem('email')

  if (!name.value.trim()) {
    say('Напишите, как к вам обращаться.', 'error')
    name.focus()
    shake(name)
    return
  }
  if (!isPhoneValid(phone.value)) {
    say(
      'Укажите номер полностью, например +7 (900) 123-45-67, чтобы мы могли перезвонить.',
      'error',
    )
    phone.focus()
    shake(phone)
    return
  }
  if (email.value.trim() && !EMAIL.test(email.value.trim())) {
    say('Проверьте адрес почты или оставьте поле пустым.', 'error')
    email.focus()
    shake(email)
    return
  }
  const consent = form.elements.namedItem('consent')
  if (consent && !consent.checked) {
    say('Подтвердите согласие на обработку персональных данных.', 'error')
    consent.focus()
    shake(consent)
    return
  }
  const viaTilda = hasTildaForm()
  if (!viaTilda && !LEAD_ENDPOINT) {
    say('Отправка заявок ещё не подключена. Позвоните или напишите нам на почту.', 'error')
    return
  }

  say('Отправляем…', 'wait')
  try {
    const place = form.elements.namedItem('place')?.value ?? form.dataset.form
    if (viaTilda) {
      const value = (field) => form.elements.namedItem(field)?.value.trim() ?? ''
      await sendViaTilda({
        name: value('name'),
        phone: value('phone'),
        email: value('email'),
        comment: value('comment'),
        company: value('company'),
        model: value('model'),
        config: value('config'),
        place,
        consent: Boolean(consent?.checked),
      })
    } else {
      const response = await fetch(LEAD_ENDPOINT, { method: 'POST', body: new FormData(form) })
      if (!response.ok) throw new Error(String(response.status))
    }
    track(goal, { place })
    showThanks(form)
  } catch (error) {
    console.error('Заявка не отправилась:', error)
    say('Заявка не отправилась. Позвоните нам или попробуйте ещё раз.', 'error')
  }
}

/** После успешной отправки: очищает форму, закрывает окно заявки и показывает «Спасибо». */
function showThanks(form) {
  form.reset()
  form.querySelector('[data-form-status]').textContent = ''
  form.closest('dialog')?.close()
  document.querySelector('[data-dialog="thanks"]')?.showModal()
}

/** Показывает выбранную конфигурацию: код и параметры сплошным текстом. */
function renderConfig(note, code, rowsJson) {
  note.replaceChildren()
  const rows = (() => {
    try {
      return JSON.parse(rowsJson || '[]')
    } catch {
      return []
    }
  })()
  note.hidden = rows.length === 0
  if (!rows.length) return

  if (code) {
    const title = document.createElement('p')
    title.className = 'dialog__config-code'
    title.textContent = code
    note.append(title)
  }
  const text = document.createElement('p')
  text.className = 'dialog__config-text'
  text.textContent = rows.map(([key, value]) => `${key}: ${value}`).join(' · ')
  note.append(text)
}

/** Формы страницы и окно заявки. */
export function initForms(root) {
  initPhoneInputs(root)
  const dialog = root.querySelector('[data-dialog="kp"]')
  const thanks = root.querySelector('[data-dialog="thanks"]')
  const title = dialog.querySelector('[data-dialog-title]')
  const defaultTitle = title.textContent

  root.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open="kp"]')
    if (opener) {
      const {
        model = '',
        place = '',
        title: custom = '',
        config = '',
        configRows = '',
      } = opener.dataset
      title.textContent = custom || defaultTitle
      dialog.querySelector('[name="model"]').value = model
      dialog.querySelector('[name="place"]').value = place
      dialog.querySelector('[name="config"]').value = config
      renderConfig(
        dialog.querySelector('[data-dialog-config]'),
        custom.includes(model) ? '' : model,
        configRows,
      )
      dialog.querySelector('[data-form-status]').textContent = ''
      track('cta_click', { place, text: opener.textContent.trim() })
      dialog.showModal()
      return
    }
    if (event.target.closest('[data-close]')) dialog.close()
    if (event.target.closest('[data-thanks-close]')) thanks.close()
    // Запасной вариант лёгкого закрытия для браузеров без closedby
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      if (event.target === dialog) dialog.close()
      if (event.target === thanks) thanks.close()
    }
  })

  root.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-form]')
    if (!form) return
    event.preventDefault()
    submitLead(form, form.dataset.goal ?? 'kp_form_sent')
  })
}
