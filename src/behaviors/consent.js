const STORAGE_KEY = 'typefl:cookie-notice'
const SHOW_DELAY = 1200

/** Хранилище может быть закрыто (приватный режим, запрет cookie): тогда плашка просто показывается каждый раз. */
const wasAccepted = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

const remember = () => {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Выбор не сохранится, плашка вернётся при следующем визите
  }
}

/** Плашка про cookie: показывается один раз, после «Понятно» запоминается в браузере. */
export function initConsent(root) {
  const notice = root.querySelector('[data-consent]')
  if (!notice) return
  if (wasAccepted()) {
    notice.remove()
    return
  }

  const close = () => {
    remember()
    notice.classList.remove('is-shown')
    notice.addEventListener('transitionend', () => notice.remove(), { once: true })
    // Запасной путь: при уменьшенном движении перехода нет, и событие не придёт
    setTimeout(() => notice.remove(), 600)
  }

  notice.querySelector('[data-consent-ok]')?.addEventListener('click', close)

  setTimeout(() => {
    notice.hidden = false
    // Один кадр на отрисовку, иначе переход появления не сработает
    requestAnimationFrame(() => notice.classList.add('is-shown'))
  }, SHOW_DELAY)
}
