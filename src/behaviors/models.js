import Lenis from 'lenis'

import { DETAILS } from '../data/model-details.js'
import { CARD_SIZES, MODELS, photoSrcset, photoUrl, thumbUrl } from '../data/models.js'
import { reducedMotion } from '../lib/dom.js'
import { track } from '../lib/track.js'

const li = (text) => {
  const node = document.createElement('li')
  node.textContent = text
  return node
}

const make = (tag, className, text) => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** Строки «название — значение»; пустые значения пропускаются. */
const rowsList = (rows) => {
  const dl = make('dl', 'kv')
  for (const [key, value] of rows) {
    if (value === null || value === undefined) continue
    const row = make('div', 'kv__row')
    row.append(make('dt', '', key), make('dd', '', value))
    dl.append(row)
  }
  return dl
}

/** Подставляет оба размера фото и подсказку по ширине: браузер сам берёт нужный. */
function setSource(node, name, sizes) {
  node.sizes = sizes
  node.srcset = photoSrcset(name)
  node.src = photoUrl(name)
}

/**
 * Меняет фото: новое быстро проявляется поверх прежнего. Направление dir задаёт, с какой стороны
 * оно слегка сдвигается (1 вперёд, -1 назад); 0 — просто проявление, когда порядка нет.
 */
function swapPhoto(img, name, alt, dir = 0, force = false) {
  if (img.dataset.name === name) return true
  // Пока идёт смена слайда, новая не запускается; force нужен при открытии окна другой модели
  if (img._busy && !force) return false
  img.dataset.name = name
  const sizes = img.dataset.sizes ?? CARD_SIZES
  if (force) {
    img._last = null
    img.parentNode.querySelectorAll(':scope > .photo-incoming').forEach((node) => node.remove())
  }
  // Пустое основное фото (первое открытие окна) заполняем сразу, без перехода
  if (!img.getAttribute('src')) {
    setSource(img, name, sizes)
    if (alt !== undefined) img.alt = alt
    img._busy = false
    return true
  }
  img._busy = true
  const release = () => {
    if (img.dataset.name === name) img._busy = false
  }
  // Подстраховка: замок не должен остаться, даже если анимация не дошла до конца
  setTimeout(release, 1000)
  const loader = new Image()
  loader.decoding = 'async'
  setSource(loader, name, sizes)
  // Декодируем заранее, чтобы кадр не тормозил ни на старте, ни в конце перехода
  const ready = Promise.race([
    loader.decode ? loader.decode().catch(() => {}) : Promise.resolve(),
    new Promise((resolve) => setTimeout(resolve, 250)),
  ])
  ready.then(() => {
    if (img.dataset.name !== name) return
    const layer = img.cloneNode(false)
    for (const attr of ['data-stage-photo', 'data-model-main', 'id', 'srcset']) {
      layer.removeAttribute(attr)
    }
    layer.className = `${img.className} photo-incoming`
    layer.dataset.dir = String(dir)
    layer.alt = ''
    layer.decoding = 'async'
    // Клон наследует loading="lazy": слой подгружался бы с задержкой и появлялся посреди перехода
    layer.loading = 'eager'
    layer.setAttribute('aria-hidden', 'true')
    setSource(layer, name, sizes)
    // Быстрые переключения не обрываем: новое фото ложится поверх прежних слоёв
    // Нижние слои уже закрыты верхними, лишние убираем, чтобы не копились
    const stack = [...img.parentNode.querySelectorAll(':scope > .photo-incoming')]
    for (const old of stack.slice(0, Math.max(0, stack.length - 1))) old.remove()
    ;(img._last ?? img).after(layer)
    img._last = layer
    // Клон скопировал transform, который прокрутка двигает у основного фото: пока слой жив,
    // повторяем его каждый кадр, иначе при уходе слоя картинка «подпрыгивает»
    let syncing = true
    const follow = () => {
      if (!syncing || !layer.isConnected) return
      layer.style.transform = img.style.transform
      requestAnimationFrame(follow)
    }
    requestAnimationFrame(follow)
    const finish = () => {
      if (img._last !== layer) return
      img._last = null
      // Базовое фото получает картинку, пока слой ещё закрывает его, и только потом слой уходит
      setSource(img, name, sizes)
      if (alt !== undefined) img.alt = alt
      const done = () => {
        // Декодирование закончилось, но на экран новое фото попадёт на следующем кадре. Уберёшь слой
        // раньше — на кадр мелькнёт прежнее фото. Ждём два кадра.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            syncing = false
            img.parentNode
              .querySelectorAll(':scope > .photo-incoming')
              .forEach((node) => node.remove())
            release()
          }),
        )
      }
      if (img.decode)
        Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 120))]).then(
          done,
        )
      else done()
    }
    layer.addEventListener('animationend', finish, { once: true })
    setTimeout(finish, 450)
  })
  return true
}

/** Направление перехода между миниатюрами: вперёд, если новая правее выбранной. */
function directionOf(buttons, target) {
  const list = [...buttons]
  const from = list.findIndex((b) => b.getAttribute('aria-pressed') === 'true')
  const to = list.indexOf(target)
  if (from < 0 || to < 0 || from === to) return 0
  return to > from ? 1 : -1
}

/** Стрелки «назад» и «вперёд» поверх главного фото. */
function addArrows(host, onStep) {
  if (host.querySelector('.arrow')) return
  for (const [delta, label] of [
    [-1, 'Предыдущее фото'],
    [1, 'Следующее фото'],
  ]) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `arrow arrow--${delta < 0 ? 'prev' : 'next'}`
    button.setAttribute('aria-label', label)
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      onStep(delta)
    })
    host.append(button)
  }
}

/**
 * Смахивание в сторону листает фото: влево следующее, вправо предыдущее.
 * Все слушатели пассивные: непассивный touchmove заставляет браузер ждать скрипт перед каждым
 * сдвигом страницы, и на телефоне прокрутка по карточкам застывает. Вертикальную прокрутку при боковом
 * жесте запрещает стиль touch-action: pan-y у области фото: боковое движение страницу не сдвигает.
 */
function addSwipe(target, onStep) {
  let startX = 0
  let startY = 0
  let single = false
  target.addEventListener(
    'touchstart',
    (event) => {
      single = event.touches.length === 1
      startX = event.touches[0].clientX
      startY = event.touches[0].clientY
    },
    { passive: true },
  )
  target.addEventListener(
    'touchend',
    (event) => {
      if (!single) return
      single = false
      const dx = event.changedTouches[0].clientX - startX
      const dy = event.changedTouches[0].clientY - startY
      // Боковой жест, а не прокрутка страницы
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) onStep(dx < 0 ? 1 : -1)
    },
    { passive: true },
  )
}
/** Экономный режим или медленная сеть: заранее ничего не качаем. */
const saveData = () => {
  const link = navigator.connection
  return Boolean(link?.saveData) || /(^|-)2g$/.test(link?.effectiveType ?? '')
}

/**
 * Подгружает все фото модели очередью, по два за раз: ближние к показанному раньше, дальние позже.
 * Картинки грузятся тем же размером, что и на странице (тот же srcset и sizes), поэтому потом
 * браузер берёт их из кэша, и листание не ждёт сети.
 */
function preloadPhotos(names, sizes, current = 0) {
  if (saveData()) return
  const order = names
    .map((name, index) => ({ name, distance: Math.abs(index - current) }))
    .filter((item) => item.distance > 0)
    .sort((a, b) => a.distance - b.distance)
  const queue = order.map((item) => item.name)
  const keep = (preloadPhotos.keep ??= [])
  const next = () => {
    const name = queue.shift()
    if (!name) return
    const image = new Image()
    keep.push(image)
    image.onload = image.onerror = next
    setSource(image, name, sizes)
  }
  next()
  next()
}
/** Заранее подгружает соседние фото, чтобы листание не ждало сети. */
function warmNeighbours(buttons, button) {
  const list = [...buttons]
  const at = list.indexOf(button)
  if (at < 0) return
  for (const near of [list[(at + 1) % list.length], list[(at - 1 + list.length) % list.length]]) {
    if (near && near !== button) setSource(new Image(), near.dataset.stageThumb, CARD_SIZES)
  }
}

/** Миниатюры на карточках переключают главное фото карточки. */
export function initStageThumbs(root) {
  /** Переключает фото; false, если предыдущая смена ещё идёт и новая не запущена. */
  const choose = (button, forced) => {
    const stage = button.closest('[data-stage]')
    const img = stage?.querySelector('[data-stage-photo]')
    if (!img) return false
    const buttons = stage.querySelectorAll('[data-stage-thumb]')
    const dir = forced ?? directionOf(buttons, button)
    if (!swapPhoto(img, button.dataset.stageThumb, undefined, dir)) return false
    for (const b of buttons) b.setAttribute('aria-pressed', String(b === button))
    warmNeighbours(buttons, button)
    return true
  }

  /** Соседнее фото по кругу; пока идёт смена слайда, нажатия игнорируются. */
  const step = (stage, delta) => {
    const buttons = [...stage.querySelectorAll('[data-stage-thumb]')]
    if (buttons.length < 2) return
    const at = Math.max(
      0,
      buttons.findIndex((b) => b.getAttribute('aria-pressed') === 'true'),
    )
    choose(buttons[(at + delta + buttons.length) % buttons.length], delta)
  }

  // Когда до карточки осталось меньше экрана, все её фото начинают грузиться заранее
  const preloader = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        preloader.unobserve(entry.target)
        const names = [...entry.target.querySelectorAll('[data-stage-thumb]')].map(
          (button) => button.dataset.stageThumb,
        )
        preloadPhotos(names, CARD_SIZES, 0)
      }
    },
    { rootMargin: '900px 0px' },
  )

  for (const stage of root.querySelectorAll('[data-stage]')) {
    preloader.observe(stage)
    const host = stage.querySelector('[data-stage-photo]')?.parentElement
    if (host && stage.querySelectorAll('[data-stage-thumb]').length > 1) {
      addArrows(host, (delta) => step(stage, delta))
      addSwipe(host, (delta) => step(stage, delta))
    }
  }

  // Стрелки клавиатуры листают фото карточки под курсором
  let hovered = null
  root.addEventListener('mouseover', (event) => {
    hovered = event.target.closest('[data-stage]')
  })
  root.addEventListener('keydown', (event) => {
    if (!hovered || document.querySelector('dialog[open]')) return
    if (event.target.closest('input, textarea, select')) return
    if (event.key === 'ArrowRight') step(hovered, 1)
    else if (event.key === 'ArrowLeft') step(hovered, -1)
    else return
    event.preventDefault()
  })
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-stage-thumb]')
    if (button) choose(button)
  })
}

/** Окно модели: фото, варианты исполнения и полные характеристики модели. */
export function initModels(root) {
  const dialog = root.querySelector('[data-dialog="model"]')
  if (!dialog) return
  const byId = new Map(MODELS.map((m) => [m.id, m]))
  const $ = (name) => dialog.querySelector(`[data-model-${name}]`)
  const main = $('main')
  const thumbs = $('thumbs')

  const renderDetails = (details = {}) => {
    $('lead').textContent = details.lead ?? ''
    $('lead').hidden = !details.lead

    const variants = details.variants ?? []
    $('variants-box').hidden = variants.length === 0
    $('variants').replaceChildren(
      ...variants.map((v, index) => {
        const card = make('article', `variant variant--${(index % 5) + 1}`)
        card.append(make('h4', 'variant__name', v.name), rowsList(v.rows))
        if (v.kit?.length) {
          const kit = make('ul', 'variant__kit')
          kit.append(...v.kit.map((x) => make('li', '', x)))
          card.append(kit)
        }
        return card
      }),
    )

    $('sections').replaceChildren(
      ...(details.sections ?? []).map((section, index) => {
        const box = document.createElement('details')
        box.className = 'sheet__item'
        box.open = index === 0
        const head = make('summary', 'sheet__title', section.title)
        box.append(head)
        if (section.rows) box.append(rowsList(section.rows))
        if (section.list) {
          const list = make('ul', 'sheet__list')
          list.append(...section.list.map((x) => make('li', '', x)))
          box.append(list)
        }
        return box
      }),
    )
    $('note').textContent = details.note ?? ''
    $('note').hidden = !details.note
  }

  /** Показывает фото; false, если предыдущая смена ещё идёт. force — при открытии другой модели. */
  const showPhoto = (name, alt, forced, force = false) => {
    const buttons = thumbs.querySelectorAll('button')
    const target = [...buttons].find((b) => b.dataset.photo === name)
    const dir = target ? (forced ?? directionOf(buttons, target)) : 0
    if (!swapPhoto(main, name, alt, dir, force)) return false
    for (const btn of buttons) btn.setAttribute('aria-pressed', String(btn === target))
    return true
  }

  /** Соседнее фото по кругу. */
  const stepPhoto = (delta) => {
    const buttons = [...thumbs.querySelectorAll('button')]
    if (buttons.length < 2) return
    const at = Math.max(
      0,
      buttons.findIndex((b) => b.getAttribute('aria-pressed') === 'true'),
    )
    showPhoto(
      buttons[(at + delta + buttons.length) % buttons.length].dataset.photo,
      undefined,
      delta,
    )
  }
  addArrows(main.parentElement, stepPhoto)
  addSwipe(main.parentElement, stepPhoto)
  dialog.addEventListener('keydown', (event) => {
    if (event.target.closest('input, textarea, select')) return
    if (event.key === 'ArrowRight') stepPhoto(1)
    else if (event.key === 'ArrowLeft') stepPhoto(-1)
    else return
    event.preventDefault()
  })

  const fill = (model) => {
    const title = `${model.kind} ${model.code}`
    $('kind').textContent = model.kind
    $('code').textContent = model.code
    $('badges').replaceChildren(
      ...model.badges.map((b) => Object.assign(li(b), { className: 'badge' })),
    )
    $('options').replaceChildren(...model.options.map(li))
    $('specs').replaceChildren(
      ...model.specs.map(([term, value]) => {
        const row = document.createElement('div')
        row.className = 'specs__row'
        const dt = document.createElement('dt')
        dt.textContent = term
        const dd = document.createElement('dd')
        dd.textContent = value
        row.append(dt, dd)
        return row
      }),
    )

    renderDetails(DETAILS[model.id])

    const photos = [model.photo, ...(model.gallery ?? [])]
    thumbs.replaceChildren(
      ...(photos.length > 1
        ? photos.map((name, i) => {
            const item = document.createElement('li')
            const btn = document.createElement('button')
            btn.type = 'button'
            btn.className = 'thumb'
            btn.dataset.photo = name
            btn.setAttribute('aria-label', `Фото ${i + 1} из ${photos.length}`)
            const img = document.createElement('img')
            img.src = thumbUrl(name)
            img.alt = ''
            img.width = 160
            img.height = 120
            btn.append(img)
            item.append(btn)
            return item
          })
        : []),
    )
    showPhoto(model.photo, title, undefined, true)
    preloadPhotos([model.photo, ...(model.gallery ?? [])], main.dataset.sizes ?? CARD_SIZES, 0)

    const kp = $('kp')
    // В заявку уходит полное название модели, а не одна аббревиатура
    kp.dataset.model = `${model.kind} ${model.code}`
    kp.dataset.title = `Получить КП: ${model.kind} ${model.code}`
  }

  // Плавная прокрутка внутри окна: отдельный Lenis на время показа
  let scroller = null
  let frame = 0
  const startScroll = () => {
    const wrapper = dialog.querySelector('.model')
    wrapper.scrollTop = 0
    if (reducedMotion() || !wrapper.firstElementChild) return
    scroller = new Lenis({
      wrapper,
      content: wrapper.firstElementChild,
      lerp: 0.1,
      smoothWheel: true,
    })
    const raf = (time) => {
      scroller?.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)
  }
  const stopScroll = () => {
    cancelAnimationFrame(frame)
    scroller?.destroy()
    scroller = null
  }
  dialog.addEventListener('close', stopScroll)

  const open = (model) => {
    fill(model)
    track('model_open', { model: model.code })
    dialog.showModal()
    stopScroll()
    startScroll()
  }

  root.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-model-open]')
    if (opener) {
      const model = byId.get(opener.dataset.modelOpen)
      if (!model) return
      open(model)
      return
    }
    const thumb = event.target.closest('[data-photo]')
    if (thumb && dialog.contains(thumb)) {
      showPhoto(thumb.dataset.photo, main.alt)
      return
    }
    // Кнопка КП внутри окна: сначала закрываем окно модели
    if (event.target.closest('[data-model-kp]')) dialog.close()
    if (event.target.closest('[data-close]') && dialog.contains(event.target)) dialog.close()
    if (event.target === dialog && !('closedBy' in HTMLDialogElement.prototype)) dialog.close()
  })
}
