/**
 * Модели с действующего typefl.ru: названия, опции и характеристики карточек
 * перенесены без изменений. Фото лежат в public/photos.
 */
import { CONFIGURATORS } from './configurator.js'

const DOPOG = 'Соответствие ДОПОГ'
const ARSHIN = 'Сертификат поверки в АРШИН'
const SUBSIDY = 'Субсидия Минпромторга'

const TRUCK_SPECS = (pump, flow, volume, sections) => [
  ['Объём цистерны', volume],
  ...(sections ? [['Секции', sections]] : []),
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

/** Фото лежат в public/photos/<модель>: cover.webp и пронумерованные 2.webp, 3.webp и т. д. */
const PHOTO_COUNT = { ac: 6, atz: 8, acn: 3, akn: 6, acv: 3, acpt: 3, ppc: 6, ppcn: 9 }
const photosOf = (id) => [
  `${id}/cover`,
  ...Array.from({ length: PHOTO_COUNT[id] - 1 }, (_, i) => `${id}/${i + 2}`),
]

const trailer = (id, code, kind, options) => ({
  id,
  group: 'trailer',
  kind,
  code,
  badges: [SUBSIDY, DOPOG, ARSHIN],
  options,
  specs: TRAILER_SPECS,
  photo: photosOf(id)[0],
  gallery: photosOf(id).slice(1),
})

export const MODELS = [
  {
    id: 'ac',
    group: 'truck',
    kind: 'Автоцистерна для топлива',
    code: 'АЦ',
    badges: [DOPOG, ARSHIN],
    options: ['Алюминиевые крылья', 'Установка доп. оборудования под ваши задачи'],
    specs: TRUCK_SPECS('СВН-80А', '583 л/мин', '10–22 м³', '1–3'),
    photo: photosOf('ac')[0],
    gallery: photosOf('ac').slice(1),
  },
  {
    id: 'atz',
    group: 'truck',
    kind: 'Автотопливозаправщик',
    code: 'АТЗ',
    badges: [DOPOG, ARSHIN],
    options: ['Алюминиевые крылья', 'Установка доп. оборудования под ваши задачи'],
    specs: TRUCK_SPECS('СВН-80А', '583 л/мин', '10–22 м³', '1–3'),
    photo: photosOf('atz')[0],
    gallery: photosOf('atz').slice(1),
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
    specs: TRUCK_SPECS('СЦЛ-01', '633 л/мин', '10–16 м³', '1'),
    photo: photosOf('acn')[0],
    gallery: photosOf('acn').slice(1),
  },
  {
    id: 'akn',
    group: 'truck',
    kind: 'Автоцистерна вакуумная для сбора нефти',
    code: 'АКН',
    badges: [DOPOG, ARSHIN],
    options: ['Термоизоляция 100 мм (пенополиуретан)', 'Горловины до 2', 'Алюминиевые крылья'],
    specs: TRUCK_SPECS('КО-505', '5167 л/мин', '10–15 м³'),
    photo: photosOf('akn')[0],
    gallery: photosOf('akn').slice(1),
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
    photo: photosOf('acv')[0],
    gallery: photosOf('acv').slice(1),
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
    photo: photosOf('acpt')[0],
    gallery: photosOf('acpt').slice(1),
  },
  trailer(
    'ppc',
    'ППЦ',
    'Полуприцеп-цистерна для светлых нефтепродуктов',
    EXTRAS.filter((x) => !x.startsWith('Термоизоляция')),
  ),
  trailer(
    'ppcn',
    'ППЦН',
    'Полуприцеп-цистерна для тёмных нефтепродуктов',
    EXTRAS.filter((x) => x !== 'Узел выдачи топлива').map((x) =>
      x.startsWith('Термоизоляция') ? 'Термоизоляция 100 мм (пенополиуретан)' : x,
    ),
  ),
]

/** Корень файлов: «/» на своём сайте, адрес хранилища при встраивании в Тильду. */
const BASE = import.meta.env.BASE_URL

export const photoUrl = (name) =>
  name.includes('.') ? `${BASE}photos/${name}` : `${BASE}photos/${name}.webp`

/**
 * Два размера одного фото: на телефоне браузер берёт лёгкий 1200 px, на широком экране и
 * при высокой плотности пикселей полный 2400 px. Адрес лёгкой версии: имя-1200.webp.
 */
export const photoSrcset = (name) => {
  const full = photoUrl(name)
  return `${full.replace('.webp', '-1200.webp')} 1200w, ${full} 2400w`
}

/** Какую ширину займёт фото на странице: подсказка браузеру при выборе размера. */
export const CARD_SIZES = '(min-width: 1200px) 58vw, 100vw'

/** Лёгкое превью для миниатюр: лежит в thumbs рядом с оригиналом. */
export const thumbUrl = (name) => {
  const [id, file] = name.split('/')
  return `${BASE}photos/${id}/thumbs/${file}.webp`
}
