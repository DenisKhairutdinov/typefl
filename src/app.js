import { initConfigurator } from './behaviors/configurator.js'
import { initCounters } from './behaviors/counters.js'
import { initForms } from './behaviors/forms.js'
import { initHero } from './behaviors/hero.js'
import { initLegal } from './behaviors/legal.js'
import { initModels, initStageThumbs } from './behaviors/models.js'
import { initMotion } from './behaviors/motion.js'
import { initNav } from './behaviors/nav.js'
import { initPpu } from './behaviors/ppu.js'
import { initZones } from './behaviors/zones.js'

/** Оживляет готовую разметку страницы. */
export function initPage() {
  initHero(document)
  initConfigurator(document)
  initModels(document)
  initStageThumbs(document)
  initForms(document)
  initPpu(document)
  initLegal(document)
  initCounters(document)
  initMotion()
  initNav(document)
  initZones(document)
}
