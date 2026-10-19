/**
 * Шапка светлая, пока под ней светлый блок с карточками моделей,
 * и тёмная над первым экраном и после него.
 */
export function initZones(root = document) {
  const top = root.querySelector('[data-top]')
  const products = root.querySelector('#products')
  if (!top || !products) return

  // Перекраска без плавного перехода: при загрузке посреди страницы и при скачке по якорю
  // шапка сразу получает нужный фон, а не проходит через промежуточный
  const instant = () => {
    top.classList.add('is-instant')
    requestAnimationFrame(() =>
      requestAnimationFrame(() => top.classList.remove('is-instant')),
    )
  }

  // На телефоне фон секции с карточками тёмный, шапка остаётся тёмной
  const phone = matchMedia('(max-width: 767px)')
  let lastY = scrollY
  const update = () => {
    if (Math.abs(scrollY - lastY) > 240) instant()
    lastY = scrollY
    const box = products.getBoundingClientRect()
    const light = !phone.matches && box.top < 72 && box.bottom > 72
    top.dataset.zone = light ? 'a' : 'b'
  }
  addEventListener('scroll', update, { passive: true })
  addEventListener('resize', update)
  instant()
  update()
}
