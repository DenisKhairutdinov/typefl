/**
 * Подсветка активного раздела в шапке по положению на странице.
 * Блоки без своего пункта меню относятся к ближайшему пункту выше или ниже по смыслу.
 */
const SECTIONS = [
  { id: 'products', link: '#products' },
  { id: 'constructor', link: '#constructor' },
  { id: 'about', link: '#about' },
  { id: 'advantages', link: '#about' },
  { id: 'leasing', link: '#leasing' },
  { id: 'contacts', link: '#contacts' },
]

export function initNav(root = document) {
  initBurger(root)
  const links = [...root.querySelectorAll('.top__link')]
  const boxes = SECTIONS.map((s) => ({ ...s, el: root.getElementById(s.id) })).filter((s) => s.el)
  if (!links.length || !boxes.length) return

  let current = null
  const update = () => {
    // Активен последний раздел, верх которого уже прошёл линию на трети экрана
    const line = innerHeight * 0.35
    let active = null
    for (const box of boxes) {
      if (box.el.getBoundingClientRect().top <= line) active = box.link
    }
    // Кадр-утверждение между конфигуратором и «О нас» оставляет активным конфигуратор
    if (active === current) return
    current = active
    for (const link of links) {
      const on = link.getAttribute('href') === active
      link.classList.toggle('is-active', on)
      if (on) link.setAttribute('aria-current', 'true')
      else link.removeAttribute('aria-current')
    }
  }
  addEventListener('scroll', update, { passive: true })
  addEventListener('resize', update)
  update()
}

/** Меню на узких экранах: кнопка открывает список разделов под шапкой. */
function initBurger(root) {
  const top = root.querySelector('[data-top]')
  const burger = root.querySelector('[data-burger]')
  if (!top || !burger) return

  const set = (open) => {
    top.classList.toggle('is-menu', open)
    burger.setAttribute('aria-expanded', String(open))
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню')
  }

  burger.addEventListener('click', () => set(!top.classList.contains('is-menu')))
  root.addEventListener('click', (event) => {
    if (!top.classList.contains('is-menu')) return
    if (event.target.closest('.top__link') || !event.target.closest('.top__bar')) set(false)
  })
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape') set(false)
  })
  matchMedia('(min-width: 992px)').addEventListener('change', (event) => {
    if (event.matches) set(false)
  })
}
