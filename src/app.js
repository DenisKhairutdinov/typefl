import { initConfigurator } from './behaviors/configurator.js'
import { initConsent } from './behaviors/consent.js'
import { initCounters } from './behaviors/counters.js'
import { initForms } from './behaviors/forms.js'
import { initHero } from './behaviors/hero.js'
import { initLegal } from './behaviors/legal.js'
import { initModels, initStageThumbs } from './behaviors/models.js'
import { initMotion } from './behaviors/motion.js'
import { initNav } from './behaviors/nav.js'
import { initPpu } from './behaviors/ppu.js'
import { initZones } from './behaviors/zones.js'

/**
 * Запускает один модуль. Сбой в нём не должен останавливать остальные:
 * в Тильде шапка, главная и подвал вставляются отдельно, и части страницы может не быть.
 */
function safely(name, init) {
  try {
    init()
  } catch (error) {
    console.error(`Модуль «${name}» не запустился:`, error)
  }
}

/** Оживляет готовую разметку страницы. */
export function initPage() {
  // Тильда может не задать язык страницы: подстрахуемся, чтобы читалки и поисковики знали язык
  if (!document.documentElement.lang) document.documentElement.lang = 'ru'
  safely('hero', () => initHero(document))
  safely('configurator', () => initConfigurator(document))
  safely('models', () => initModels(document))
  safely('stageThumbs', () => initStageThumbs(document))
  safely('forms', () => initForms(document))
  safely('ppu', () => initPpu(document))
  safely('legal', () => initLegal(document))
  safely('consent', () => initConsent(document))
  safely('counters', () => initCounters(document))
  safely('motion', () => initMotion())
  safely('nav', () => initNav(document))
  safely('zones', () => initZones(document))
}
