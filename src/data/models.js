/**
 * Модели с действующего typefl.ru: названия, опции и характеристики карточек
 * перенесены без изменений. Фото лежат в public/photos.
 */
import { CONFIGURATORS } from './configurator.js'

const DOPOG = 'Соответствие ДОПОГ'
const ARSHIN = 'Сертификат поверки в АРШИН'
const SUBSIDY = 'Субсидия Минпромторга'

const TRUCK_SPECS = (pump, flow, volume) => [
  ['Объём цистерны', volume],
  ['Шасси', 'КАМАЗ-43118 (6х6) / 65115 (6х4)'],
  ['Насос', pump],
  ['Выработка', flow],
]

/** Опции и диапазоны карточек полуприцепов берём из конструктора, чтобы данные не расходились. */
const CONFIG = CONFIGURATORS.find((c) => c.id === 'trailer')
const step = (key) => CONFIG.steps.find((x) => x.key === key)
const EXTRAS = step('extras').options

const volume = step('volume')
const TRAILER_SPECS = [
  ['Объём цистерны', `${volume.min}–${volume.max} м³`],
  ['Оси', step('axles').options.join(' / ')],
  ['Секции', `${step('sections').options[0]}–${step('sections').options.at(-1)}`],
  ['Форма цистерны', step('shape').options.join(' / ').toLowerCase()],
]

const TRAILER_PHOTOS = ['ppc28', 'ppc30', 'ppc32', 'ppc38', 'ship-ppc32', 'ship-ppc30']

const trailer = (id, code, kind, photo, options) => ({
  id,
  group: 'trailer',
  kind,
  code,
  badges: [SUBSIDY, DOPOG, ARSHIN],
  options,
  specs: TRAILER_SPECS,
  photo,
  gallery: TRAILER_PHOTOS.filter((x) => x !== photo),
})

export const MODELS = [
  {
    id: 'ac',
    group: 'truck',
    kind: 'Автоцистерна для топлива',
    code: 'АЦ',
    badges: [DOPOG, ARSHIN],
    options: [
      'Количество секций до 3',
      'Алюминиевые крылья',
      'Установка доп. оборудования под ваши задачи',
    ],
    specs: TRUCK_SPECS('СВН-80А', '583 л/мин', '10–22 м³'),
    photo: 'ac',
    gallery: ['atz', 'atz-2', 'atz-3', 'ship-atz'],
  },
  {
    id: 'atz',
    group: 'truck',
    kind: 'Автотопливозаправщик',
    code: 'АТЗ',
    badges: [DOPOG, ARSHIN],
    options: [
      'Количество секций до 3',
      'Алюминиевые крылья',
      'Установка доп. оборудования под ваши задачи',
    ],
    specs: TRUCK_SPECS('СВН-80А', '583 л/мин', '10–22 м³'),
    photo: 'atz',
    gallery: ['atz-2', 'atz-3', 'atz-4', 'ship-atz'],
  },
  {
    id: 'acn',
    group: 'truck',
    kind: 'Автоцистерна для нефти',
    code: 'АЦН',
    badges: [DOPOG, ARSHIN],
    options: [
      'Термоизоляция 100 мм (пенополиуретан)',
      'Утеплённый насосный отсек, подогрев',
      'Алюминиевые крылья',
      'Установка доп. оборудования под ваши задачи',
    ],
    specs: TRUCK_SPECS('СЦЛ-01', '633 л/мин', '10–16 м³'),
    photo: 'acn',
    gallery: ['acn-2', 'acn-3', 'ship-acn'],
  },
  {
    id: 'akn',
    group: 'truck',
    kind: 'Автоцистерна вакуумная для сбора нефти',
    code: 'АКН',
    badges: [DOPOG, ARSHIN],
    options: ['Термоизоляция 100 мм (пенополиуретан)', 'Горловины до 2', 'Алюминиевые крылья'],
    specs: TRUCK_SPECS('КО-505', '5167 л/мин', '10–15 м³'),
    photo: 'akn',
    gallery: ['akn-2'],
  },
  {
    id: 'acv',
    group: 'truck',
    kind: 'Автоцистерна для технической воды',
    code: 'АЦВ',
    badges: [ARSHIN],
    options: [
      'Термоизоляция 100 мм (пенополиуретан)',
      'Утеплённый насосный отсек, подогрев',
      'Алюминиевые крылья',
      'Установка доп. оборудования под ваши задачи',
    ],
    specs: TRUCK_SPECS('СВН-80А', '583 л/мин', '10–16 м³'),
    photo: 'acv',
    gallery: ['acpt'],
  },
  {
    id: 'acpt',
    group: 'truck',
    kind: 'Автоцистерна для питьевой воды',
    code: 'АЦПТ',
    badges: [
      ARSHIN,
      'Термоизоляция 100 мм (пенополиуретан)',
      'Утеплённый насосный отсек, подогрев',
    ],
    options: ['Алюминиевые крылья', 'Установка доп. оборудования под ваши задачи'],
    specs: TRUCK_SPECS('1СВН-80АС', '583 л/мин', '10 м³'),
    photo: 'acpt',
    gallery: ['acv'],
  },
  trailer(
    'ppc',
    'ППЦ',
    'Полуприцеп-цистерна для светлых нефтепродуктов',
    'ppc32',
    EXTRAS.filter((x) => !x.startsWith('Термоизоляция')),
  ),
  trailer(
    'ppcn',
    'ППЦН',
    'Полуприцеп-цистерна для тёмных нефтепродуктов',
    'ppc38',
    EXTRAS.filter((x) => x !== 'Узел выдачи топлива').map((x) =>
      x.startsWith('Термоизоляция') ? 'Термоизоляция 100 мм (пенополиуретан)' : x,
    ),
  ),
]

export const photoUrl = (name) => (name.includes('.') ? `/photos/${name}` : `/photos/${name}.webp`)
