import { HERO_VARIANTS } from '../data/content.js'
import { photoUrl } from '../data/models.js'
import { track } from '../lib/track.js'

/**
 * Подстраивает первый экран под группу объявлений по метке g в адресе.
 * Без метки и при неизвестном значении остаётся общий вариант из разметки.
 */
export function initHero(root) {
  const key = new URLSearchParams(location.search).get('g') ?? ''
  const variant = HERO_VARIANTS[key]
  track('hero_variant', { g: variant ? key : 'default' })
  if (!variant || key === 'default') return

  root.querySelector('[data-hero="title"]').textContent = variant.title
  root.querySelector('[data-hero="lead"]').textContent = variant.lead
  const img = root.querySelector('[data-hero="photo"]')
  if (img) {
    // srcset главного фото перекрыл бы src, поэтому для другого снимка он снимается.
    // Источники <source> (вертикальная обрезка для телефона) тоже: они выбираются раньше img
    img.removeAttribute('srcset')
    img.removeAttribute('sizes')
    img
      .closest('picture')
      ?.querySelectorAll('source')
      .forEach((source) => source.remove())
    img.src = photoUrl(variant.photo)
  }

  // Модели группы объявлений ставим первыми, а её раздел поднимаем наверх витрины
  const list = root.querySelector('[data-models]')
  if (!list) return
  for (const id of [...variant.first].reverse()) {
    const card = list.querySelector(`[data-model-card="${id}"]`)
    card?.parentElement.querySelector('.group')?.after(card)
  }
  const top = list.querySelector(`[data-model-card="${variant.first[0]}"]`)
  if (top) list.prepend(top.closest('[data-group-box]'))

  // Нумерация следует новому порядку
  const cards = [...list.querySelectorAll('[data-model-card]')]
  const rail = root.querySelector('[data-rail-nav]')
  cards.forEach((card, i) => {
    card.querySelector('.stage__count').firstChild.textContent = String(i + 1)
    rail?.append(rail.querySelector(`[data-rail="${card.dataset.modelCard}"]`))
  })
}
