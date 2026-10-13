/**
 * Шапка светлая, пока под ней светлый блок с карточками моделей,
 * и тёмная над первым экраном и после него.
 */
export function initZones(root = document) {
  const top = root.querySelector('[data-top]')
  const products = root.querySelector('#products')
  if (!top || !products) return

  // На телефоне фон секции с карточками тёмный, шапка остаётся тёмной
  const phone = matchMedia('(max-width: 767px)')
  const update = () => {
    const box = products.getBoundingClientRect()
    const light = !phone.matches && box.top < 72 && box.bottom > 72
    top.dataset.zone = light ? 'a' : 'b'
  }
  addEventListener('scroll', update, { passive: true })
  addEventListener('resize', update)
  update()
}
