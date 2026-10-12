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

/** Идентификатор окна капчи, которое Тильда добавляет в body. */
const CAPTCHA_BOX = 'tildaformcaptchabox'

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
    // Состояние ставим напрямую и сообщаем Тильде о смене: клик по спрятанному чекбоксу ненадёжен
    input.checked = Boolean(value)
    for (const type of ['input', 'change']) input.dispatchEvent(new Event(type, { bubbles: true }))
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

/** Текст видимых сообщений об ошибке в форме Тильды: проверка полей или сбой отправки. */
const errorText = (root) =>
  [...root.querySelectorAll('.js-errorbox-all .t-form__errorbox-item, .t-input-error')]
    .filter(visible)
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join('; ')

/**
 * Ждёт ответа Тильды: окно успеха, ошибка или время вышло. Состояние опрашивается, а не только
 * отслеживается: Тильда меняет его по-разному (классы, стили, вставка узлов). До отправки
 * ничего не проверяется, иначе заранее видимый контейнер ошибок дал бы ложную ошибку.
 */
function waitForResult(form) {
  const root = form.closest('.t-rec') ?? form
  // Тильда помечает принятую форму классом js-send-form-success; окно с сообщением может быть пустым
  const success = () =>
    form.classList.contains('js-send-form-success') ||
    visible(root.querySelector('.js-successbox, .t-form__successbox'))
  return new Promise((resolve, reject) => {
    let started = Date.now()
    const timer = setInterval(() => {
      // Пока посетитель проходит капчу Тильды, ответа ждём без ограничения по времени
      if (document.getElementById(CAPTCHA_BOX)) started = Date.now()
      if (success()) {
        clearInterval(timer)
        resolve()
        return
      }
      const message = errorText(root)
      if (message) {
        clearInterval(timer)
        reject(new Error(`Тильда: ${message}`))
      } else if (Date.now() - started > TIMEOUT) {
        clearInterval(timer)
        reject(new Error(`Тильда не ответила, классы формы: ${form.className}`))
      }
    }, 150)
  })
}
/** Возвращает форму Тильды в исходное состояние, чтобы ею можно было воспользоваться снова. */
function reset(form) {
  const root = form.closest('.t-rec') ?? form
  form.reset()
  for (const box of root.querySelectorAll('.js-successbox, .t-form__successbox'))
    box.style.display = 'none'
  for (const box of root.querySelectorAll('.t-form__inputsbox')) box.style.display = ''
  form.classList.remove('t-form_sending', 'js-send-form-success')
}

/**
 * Капча Тильды открывается на весь экран, но добавляется в конец страницы, а открытые окна сайта
 * (dialog.showModal) лежат в верхнем слое браузера и закрывают её. Переносим капчу внутрь
 * открытого окна: тогда она поверх и посетитель может её пройти.
 */
function liftCaptcha() {
  const observer = new MutationObserver(() => {
    const box = document.getElementById(CAPTCHA_BOX)
    const dialog = document.querySelector('dialog[open]')
    if (box && dialog && box.parentElement !== dialog) dialog.append(box)
  })
  observer.observe(document.body, { childList: true })
  return () => observer.disconnect()
}

/**
 * Окно «Спасибо» самой Тильды скрыто стилями сайта, но пока оно «открыто», Тильда блокирует
 * прокрутку страницы. Блокировку снимаем сами, иначе страница перестала бы прокручиваться.
 */
function dismissPopup() {
  document.body.classList.remove('t-body_success-popup-showed')
  window.tildaForm?.unlockBodyScroll?.()
}

/** Склеивает поля, которых нет в форме Тильды, в комментарий. */
function commentOf(values) {
  const lines = []
  if (values.model) lines.push(`Модель: ${values.model}`)
  if (values.config) lines.push(`Конфигурация: ${values.config}`)
  if (values.company) lines.push(`Организация или ИНН: ${values.company}`)
  if (values.place) lines.push(`Источник заявки: ${values.place}`)
  if (values.consent !== undefined) {
    lines.push(`Согласие на обработку данных: ${values.consent ? 'да' : 'нет'}`)
  }
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

  const found = Object.fromEntries(
    Object.entries(target).map(([key, node]) => [key, node?.name ?? null]),
  )
  console.warn('[Тильда] форма', form.id, 'поля', found)
  if (!target.name || !target.phone) throw new Error('В форме Тильды нет полей имени или телефона')

  fill(target.name, values.name)
  fill(target.phone, values.phone)
  fill(target.email, values.email ?? '')
  fill(target.comment, commentOf(values))
  fill(target.consent, values.consent ?? true)

  // Если скрипты Тильды не обработали отправку, браузер сам отправил бы форму и перезагрузил страницу
  form.addEventListener(
    'submit',
    (event) => {
      if (event.defaultPrevented) {
        console.warn('[Тильда] отправку приняли скрипты Тильды')
        return
      }
      event.preventDefault()
      console.warn('[Тильда] скрипты Тильды не обработали отправку формы')
    },
    { once: true },
  )

  const stopLifting = liftCaptcha()
  const result = waitForResult(form)
  const button = form.querySelector('.t-submit, button[type="submit"], input[type="submit"]')
  if (button) button.click()
  else form.requestSubmit()

  try {
    await result
    console.warn('[Тильда] заявка принята')
    dismissPopup()
    setTimeout(dismissPopup, 400)
  } finally {
    stopLifting()
    // Тильда показывает своё сообщение об успехе внутри спрятанной формы: убираем его до следующей заявки
    setTimeout(() => reset(form), 300)
  }
}

/**
 * У чекбокса в форме Тильды нет подписи (его текст выключен в блоке), а проверка доступности
 * требует имя у каждого поля. Форма скрыта, поэтому подпись задаём сами.
 */
export function labelTildaForm() {
  const form = tildaForm()
  if (!form) return
  const consent = fields(form).consent
  if (consent && !consent.getAttribute('aria-label')) {
    consent.setAttribute('aria-label', 'Согласие на обработку персональных данных')
  }
}
