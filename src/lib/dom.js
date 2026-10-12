/** Пользователь попросил систему уменьшить движение. */
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Меняет DOM с плавным переходом, если браузер умеет View Transitions.
 * Без поддержки, при уменьшенном движении и в скрытой вкладке изменение применяется сразу.
 *
 * @param {() => void} update
 */
export function transition(update) {
  const canAnimate =
    typeof document.startViewTransition === 'function' &&
    document.visibilityState === 'visible' &&
    !reducedMotion()

  if (!canAnimate) {
    update()
    return
  }

  const animation = document.startViewTransition(update)
  // Переход может быть прерван, например при быстрой смене шагов: это не ошибка
  animation.ready.catch(() => {})
  animation.finished.catch(() => {})
}
