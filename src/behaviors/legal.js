import Lenis from 'lenis'

import { LEGAL } from '../data/legal.js'
import { reducedMotion } from '../lib/dom.js'

const make = (tag, className, text) => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** Окно с политиками и соглашением: текст берётся из src/data/legal.js. */
export function initLegal(root) {
  const dialog = root.querySelector('[data-dialog="legal"]')
  if (!dialog) return
  const title = dialog.querySelector('[data-legal-title]')
  const body = dialog.querySelector('[data-legal-body]')
  const content = dialog.querySelector('[data-legal-content]')

  // Плавная прокрутка внутри окна: отдельный Lenis на время показа
  let scroller = null
  let frame = 0
  const stopScroll = () => {
    cancelAnimationFrame(frame)
    scroller?.destroy()
    scroller = null
  }
  const startScroll = () => {
    stopScroll()
    body.scrollTop = 0
    if (reducedMotion()) return
    scroller = new Lenis({ wrapper: body, content, lerp: 0.1, smoothWheel: true })
    const raf = (time) => {
      scroller?.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)
  }
  dialog.addEventListener('close', stopScroll)

  const show = (key) => {
    const doc = LEGAL[key]
    if (!doc) return
    title.textContent = doc.title
    const nodes = doc.sections.map((section, index) => {
      const box = make('section', 'legal__section')
      box.append(make('h3', 'legal__h', `${String(index + 1).padStart(2, '0')}. ${section.title}`))
      for (const item of section.items) {
        if (item.list) {
          const list = make('ul', 'legal__list')
          list.append(...item.list.map((text) => make('li', '', text)))
          box.append(list)
        } else {
          const numbered = /^\d+(\.\d+)+\./.test(item.p)
          const depth = numbered ? item.p.split(/\s/)[0].split('.').length - 2 : 0
          const p = make('p', depth >= 2 && item.p.length < 90 ? 'legal__sub' : '', item.p)
          box.append(p)
        }
      }
      return box
    })
    content.replaceChildren(...nodes)
    dialog.showModal()
    startScroll()
  }

  root.addEventListener('click', (event) => {
    const link = event.target.closest('[data-legal]')
    if (link) {
      event.preventDefault()
      // Окно заявки остаётся под текстом, поэтому лёгкое закрытие не трогаем
      show(link.dataset.legal)
    }
  })

  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-legal-close]')) dialog.close()
    if (event.target === dialog && !('closedBy' in HTMLDialogElement.prototype)) dialog.close()
  })
}
