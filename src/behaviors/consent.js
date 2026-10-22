const STORAGE_KEY = 'typefl:cookie-notice'
/** Плашка показывается после первого действия посетителя; если его нет, то через это время. */
const SHOW_DELAY = 20000
// Только действия самого человека. Событие scroll не годится: оно приходит и без него (восстановление
// прокрутки, плавная прокрутка, скрипты конструктора), и плашка выскакивала на второй секунде
const INTERACTIONS = ['wheel', 'pointerdown', 'keydown', 'touchstart']

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

  const show = () => {
    for (const type of INTERACTIONS) window.removeEventListener(type, show)
    clearTimeout(fallback)
    notice.hidden = false
    // Один кадр на отрисовку, иначе переход появления не сработает
    requestAnimationFrame(() => notice.classList.add('is-shown'))
  }
  // Пока человек читает первый экран, плашка не нужна. К тому же текст плашки — крупный блок,
  // и появившись после загрузки, он стал бы главным элементом страницы и сдвинул LCP
  for (const type of INTERACTIONS)
    window.addEventListener(type, show, { once: true, passive: true })
  const fallback = setTimeout(show, SHOW_DELAY)
}
