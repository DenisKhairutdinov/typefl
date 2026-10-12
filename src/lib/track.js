import { METRIKA_ID } from '../config.js'

/**
 * Отправляет событие в Яндекс Метрику. Имена событий описаны в docs/07-tracking.md.
 * В параметры не передаются имя, телефон и почта.
 *
 * @param {string} goal
 * @param {Record<string, string | number | boolean>} [params]
 */
export function track(goal, params = {}) {
  if (typeof window.ym === 'function') {
    window.ym(METRIKA_ID, 'reachGoal', goal, params)
  }
}
