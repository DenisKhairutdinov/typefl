import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

import { reducedMotion } from '../lib/dom.js'
import { splitWords } from '../lib/split.js'

gsap.registerPlugin(ScrollTrigger)

// Адресная строка телефона прячется и показывается при прокрутке и шлёт resize. Без этой настройки каждый такой
// resize пересчитывает все триггеры и сбрасывает инерцию: страница на ходу «упирается» в невидимую стену.
ScrollTrigger.config({ ignoreMobileResize: true })

const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

/**
 * Прокрутка на устройствах с касанием остаётся родной: у телефона своя инерция, и подмена её
 * собственной прокруткой даёт рывки и резкие остановки. Здесь нужна только блокировка страницы под
 * окнами и плавный переход к якорю.
 */
function nativeScroll() {
  const root = document.documentElement
  return {
    scrollTo: (target) => target.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    stop: () => root.classList.add('is-locked'),
    start: () => root.classList.remove('is-locked'),
  }
}

/** Плавная прокрутка Lenis (колесо мыши), согласованная с ScrollTrigger; на телефоне родная. */
function initSmoothScroll() {
  const touch = matchMedia('(pointer: coarse), (max-width: 767px)').matches
  let lenis
  if (touch) {
    lenis = nativeScroll()
  } else {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  }

  // Якоря едут плавно и с поправкой на шапку
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]')
    if (!link) return
    const target = document.querySelector(link.getAttribute('href'))
    if (!target) return
    event.preventDefault()
    if (touch) lenis.scrollTo(target)
    else lenis.scrollTo(target, { offset: -12, duration: 1.4 })
  })

  // Пока открыто окно заявки, страница под ним не едет
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-open="kp"], [data-model-open], [data-ppu], [data-legal]'))
      lenis.stop()
  })
  for (const box of document.querySelectorAll('dialog')) {
    box.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) lenis.start()
    })
  }
  return lenis
}

/** После этого времени с начала загрузки вступительная анимация первого экрана не запускается. */
const LATE_START = 1500

/** Первый экран: фото проявляется из увеличения, заголовок поднимается по словам. */
function introHero() {
  // Скрипт пришёл поздно (медленная сеть): первый экран давно показан, и прятать его ради анимации
  // значило бы заставить посетителя смотреть, как текст исчезает и появляется снова
  if (performance.now() > LATE_START) return
  const title = document.querySelector('[data-hero="title"]')
  const words = splitWords(title)
  const photo = document.querySelector('.hero__photo')
  const timeline = gsap.timeline({ defaults: { ease: 'power4.out' } })

  timeline
    .from(photo, { scale: 1.15, duration: 1.8, ease: 'power3.out' }, 0)
    .from(words, { yPercent: 110, duration: 0.9, stagger: 0.05 }, 0.25)
    .from('[data-hero-in]', { y: 28, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.7)
    .from('.top__bar', { y: -16, opacity: 0, duration: 0.7 }, 0.5)
}

/** Прокрутка двигает слои первого экрана с разной скоростью. */
function parallaxHero() {
  const scrub = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  gsap.to('.hero__photo', { yPercent: 10, ease: 'none', scrollTrigger: scrub })
  gsap.to('.hero__title', { yPercent: -16, opacity: 0.5, ease: 'none', scrollTrigger: scrub })
}

/**
 * Каждый кадр техники раскрывается на всю ширину, фото приближается и отъезжает,
 * а панель данных выезжает сбоку. Всё входит одной шкалой и заканчивается в одной точке,
 * поэтому в конце кадры не «магнитятся» по очереди. Прокрутку сглаживает Lenis, а у scrub
 * дополнительного сглаживания нет: два сглаживания подряд дают запаздывание и рывок в конце.
 */
function stages() {
  for (const stage of $$('[data-stage]')) {
    const frame = stage.querySelector('[data-stage-frame]')
    const photo = stage.querySelector('[data-stage-photo]')
    const panel = stage.querySelector('[data-stage-panel]')

    gsap
      .timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: stage, start: 'top 95%', end: 'top 30%', scrub: true },
      })
      .fromTo(frame, { clipPath: 'inset(5% 2.5%)' }, { clipPath: 'inset(0% 0%)' }, 0)
      .fromTo(photo, { scale: 1.07 }, { scale: 1 }, 0)
      .fromTo(panel, { xPercent: 5, opacity: 0 }, { xPercent: 0, opacity: 1 }, 0)

    // Фото медленно плывёт внутри кадра, пока карточка проходит экран
    gsap.fromTo(
      photo,
      { yPercent: -3 },
      {
        yPercent: 3,
        ease: 'none',
        scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    )
  }
}

/** Боковой указатель: появляется вместе с витриной и подсвечивает текущую модель. */
function rail() {
  const nav = document.querySelector('[data-rail-nav]')
  const list = document.querySelector('[data-models]')
  if (!nav || !list) return

  ScrollTrigger.create({
    trigger: list,
    start: 'top 60%',
    end: 'bottom 40%',
    onToggle: (self) => nav.classList.toggle('is-visible', self.isActive),
  })
  for (const stage of $$('[data-stage]')) {
    const link = nav.querySelector(`[data-rail="${stage.dataset.modelCard}"]`)
    ScrollTrigger.create({
      trigger: stage,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => link?.classList.toggle('is-active', self.isActive),
    })
  }
}

/** Фоновые фото секций плывут медленнее содержимого. */
function backdrops() {
  for (const box of $$('[data-parallax]')) {
    const img = box.querySelector('img')
    gsap.fromTo(
      img,
      { yPercent: -3 },
      {
        yPercent: 3,
        ease: 'none',
        scrollTrigger: {
          trigger: box.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    )
  }
}

/** Блоки внутри секций едут с разной скоростью, чуть глубже, чем сам скролл. */
function parallaxBlocks() {
  const rules = [
    ['.about__text', 5],
    ['.figures', -6],
    ['.adv:nth-child(even)', 6],
    ['.terms__item:nth-child(even)', 8],
    ['.contact__head', 4],
    ['.subsidy__sum', -6],
  ]
  for (const [selector, shift] of rules) {
    for (const el of $$(selector)) {
      gsap.fromTo(
        el,
        { yPercent: -shift },
        {
          yPercent: shift,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
    }
  }
}

/** Заголовки секций поднимаются по словам, карточки появляются один раз. */
function reveals() {
  for (const title of $$('[data-split]')) {
    const words = splitWords(title)
    gsap.from(words, {
      yPercent: 110,
      duration: 0.9,
      stagger: 0.04,
      ease: 'power4.out',
      scrollTrigger: {
        trigger: title,
        start: 'top 88%',
        toggleActions: 'play none none reverse',
      },
    })
    // Слова слегка расходятся в стороны и собираются в строку по мере прокрутки
    words.forEach((word, i) => {
      gsap.fromTo(
        word.parentElement,
        { x: i % 2 ? 36 : -36 },
        {
          x: 0,
          ease: 'none',
          scrollTrigger: { trigger: title, start: 'top bottom', end: 'top 40%', scrub: true },
        },
      )
    })
  }
  // Остальные блоки появляются пачками, чуть по очереди
  const groups = [
    '[data-reveal]',
    '.group',
    '.cfg__step',
    '.cfg__summary',
    '.about__text',
    '.figure',
    '.terms__item',
    '.partner',
    '.subsidy',
    '.contact__info',
    '.form--panel',
  ]
  const items = [...new Set(groups.flatMap((selector) => $$(selector)))]
  gsap.set(items, { opacity: 0, y: 30 })
  // IntersectionObserver, а не ScrollTrigger: считает по реальному положению блока и не зависит от
  // пересчёта триггеров, когда высота страницы меняется (шрифты, миниатюры, конфигуратор)
  const observer = new IntersectionObserver(
    (entries) => {
      const shown = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target)
      // Блок ушёл вниз за экран при прокрутке вверх: прячем снова, чтобы он появился заново
      const hidden = entries
        .filter((entry) => !entry.isIntersecting && entry.boundingClientRect.top > 0)
        .map((entry) => entry.target)
      if (shown.length) {
        gsap.to(shown, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.06,
          ease: 'power3.out',
          overwrite: true,
        })
      }
      if (hidden.length) {
        gsap.to(hidden, {
          opacity: 0,
          y: 30,
          duration: 0.45,
          stagger: 0.03,
          ease: 'power2.in',
          overwrite: true,
        })
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  )
  for (const item of items) observer.observe(item)
}

/** Кадр-утверждение: слова заполняются по мере прокрутки, без закрепления, и обратно. */
function fillStatement() {
  const text = document.querySelector('[data-fill]')
  const section = text?.closest('.statement')
  if (!text || !section) return
  const words = splitWords(text)
  gsap.set(words, { opacity: 0.28 })
  gsap.set('.statement__sub, .statement .btn', { opacity: 0, y: 12 })
  gsap
    .timeline({
      scrollTrigger: {
        trigger: text,
        start: 'top 88%',
        end: 'bottom 70%',
        scrub: true,
      },
    })
    .to(words, { opacity: 1, ease: 'none', stagger: 0.12 })
    .to('.statement__sub, .statement .btn', { opacity: 1, y: 0, ease: 'none' }, '>-0.2')
}

/** Крупная подпись бренда в подвале поднимается и собирается при подходе к концу страницы. */
function footerMark() {
  const mark = document.querySelector('.foot__mark')
  if (!mark) return
  gsap.fromTo(
    mark,
    { yPercent: 26, opacity: 0.3, letterSpacing: '0.06em' },
    {
      yPercent: 0,
      opacity: 1,
      letterSpacing: '0em',
      ease: 'none',
      scrollTrigger: { trigger: mark, start: 'top bottom', end: 'bottom bottom', scrub: true },
    },
  )
}

/** Шапка плотнее после первого экрана. */
function header() {
  const top = document.querySelector('[data-top]')
  if (!top) return
  ScrollTrigger.create({
    start: 80,
    end: 'max',
    onToggle: (self) => top.classList.toggle('is-solid', self.isActive),
  })
}

/** Подключает движение. При настройке «уменьшить движение» страница остаётся статичной. */
export function initMotion() {
  if (reducedMotion()) return
  initSmoothScroll()
  introHero()
  // На телефоне прокрутка идёт на слабом процессоре, и покадровые анимации от неё (раскрытие кадра,
  // параллакс, смена межбуквенного расстояния) заставляют страницу замирать. Там их нет, остаются
  // появление блоков и заполнение текста.
  const phone = matchMedia('(max-width: 767px)').matches
  if (!phone) {
    parallaxHero()
    stages()
    backdrops()
    parallaxBlocks()
    footerMark()
  }
  rail()
  reveals()
  fillStatement()
  header()

  // Положения триггеров пересчитываются, когда реально изменилась высота страницы (догрузились
  // шрифты, собрались миниатюры и конфигуратор). Без пересчёта блоки ниже по странице появлялись бы
  // не там, где они на экране. Пересчёт посреди прокрутки сбрасывает инерцию на телефоне, поэтому
  // он ждёт, пока страница остановится.
  let timer = 0
  let lastScroll = 0
  let lastHeight = document.documentElement.scrollHeight
  addEventListener('scroll', () => (lastScroll = performance.now()), { passive: true })
  const refresh = () => {
    clearTimeout(timer)
    timer = setTimeout(function run() {
      if (performance.now() - lastScroll < 250) timer = setTimeout(run, 250)
      else {
        lastHeight = document.documentElement.scrollHeight
        ScrollTrigger.refresh()
      }
    }, 120)
  }
  const changed = () => Math.abs(document.documentElement.scrollHeight - lastHeight) > 2
  window.addEventListener('load', refresh, { once: true })
  document.fonts?.ready.then(refresh)
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => changed() && refresh()).observe(document.body)
  }
}
