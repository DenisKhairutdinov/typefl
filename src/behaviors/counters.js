import { reducedMotion } from '../lib/dom.js'

/** Числа в полосе фактов один раз досчитываются до значения, когда попадают на экран. */
export function initCounters(root) {
  const nodes = root.querySelectorAll('[data-count]')
  if (!nodes.length || reducedMotion() || !('IntersectionObserver' in window)) return

  const run = (node) => {
    const target = Number(node.dataset.count)
    const started = performance.now()
    const duration = 900
    const tick = (now) => {
      const t = Math.min(1, (now - started) / duration)
      // Замедление к концу: число «доезжает», а не обрывается
      const eased = 1 - (1 - t) ** 3
      node.textContent = Math.round(target * eased).toLocaleString('ru-RU')
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        observer.unobserve(entry.target)
        run(entry.target)
      }
    },
    { threshold: 0.6 },
  )
  for (const node of nodes) observer.observe(node)
}
