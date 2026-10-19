import { CONFIGURATORS } from '../data/configurator.js'
import { track } from '../lib/track.js'

/** Страна производителя осей: PLT российский, BPW немецкий. */
const MAKER_FLAGS = { PLT: 'ru', BPW: 'de' }

const el = (tag, className, text) => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/**
 * Правила совместимости полуприцепа.
 * Возвращают список допустимых значений параметра при текущих остальных или null, если ограничений нет.
 */
// Верхних границ по назначению сейчас нет: техническая вода, как и нефтепродукты, до 40 м³
const LIMITS = {}

const INSULATION = 'Термоизоляция (пенополиуретан 100 мм)'

const RULES = {
  sections: (s) => {
    if (s.purpose === 'Техническая вода') return ['1']
    // Три секции от 20 м³, четыре от 28 м³
    return ['1', '2', ...(s.volume >= 20 ? ['3'] : []), ...(s.volume >= 28 ? ['4'] : [])]
  },
  axles: (s) => {
    if (s.volume <= 24) return ['2']
    // Четыре оси только от 32 м³
    return s.volume >= 32 ? ['3', '4'] : ['3']
  },
}

/** Опции, доступные не всегда: ключ шага, затем название опции. */
const OPTION_RULES = {
  extras: {
    [INSULATION]: (s) => s.purpose !== 'Светлые нефтепродукты',
    'Узел выдачи топлива': (s) => s.purpose === 'Светлые нефтепродукты',
    'Нижний налив / рекуперация': (s) => s.purpose !== 'Техническая вода',
  },
}

/** Почему вариант закрыт: короткая причина для плитки и сообщения. Пустая строка, если открыт. */
function reasonOf(key, option, s) {
  if (key === 'sections' && s.purpose === 'Техническая вода' && option !== '1') {
    return 'для воды: 1'
  }
  if (key === 'sections' && option === '3') return 'от 20 м³'
  if (key === 'sections' && option === '4') return 'от 28 м³'
  if (key === 'axles' && option === '2') return 'до 24 м³'
  if (key === 'axles' && option === '3') return 'от 25 м³'
  if (key === 'axles' && option === '4') return 'от 32 м³'
  if (key === 'extras' && option === INSULATION) return 'не для светлых нефтепродуктов'
  if (key === 'extras' && option === 'Узел выдачи топлива') return 'только для светлых'
  if (key === 'extras' && option === 'Нижний налив / рекуперация') return 'не для воды'
  return ''
}

/** Префикс по назначению: светлые нефтепродукты, тёмные, техническая вода. */
const PURPOSE_PREFIX = {
  'Светлые нефтепродукты': 'ППЦ',
  'Тёмные нефтепродукты': 'ППЦН',
  'Техническая вода': 'ППЦТВ',
}

/** Название комплектации по выбранным параметрам. */
function codeOf(cfg, s) {
  if (cfg.id === 'trailer') {
    const prefix = PURPOSE_PREFIX[s.purpose] ?? cfg.prefix
    const shape = s.shape === 'Круг' ? 'К' : ''
    const insulation = s.extras.includes(INSULATION) ? 'Т' : ''
    const suspension = s.suspension === 'Рессорная' ? 'Р' : 'П'
    return `${prefix}-${s.volume}/${s.sections}${insulation}${shape}-${suspension}${s.axles}-${s.maker}-${s.ssu}`.toUpperCase()
  }
  return `${cfg.prefix}-${s.volume}/${s.sections}`.toUpperCase()
}

/** Строки сводки: название параметра и выбранное значение. */
function summaryOf(cfg, s) {
  const rows = [['Назначение', s.purpose.toLowerCase()]]
  rows.push(['Объём цистерны', `${s.volume} м³`], ['Количество секций', s.sections])
  if (cfg.id === 'trailer') {
    rows.push(
      ['Форма цистерны', s.shape.toLowerCase()],
      ['Конструкция', s.frame.toLowerCase()],
      ['Материал', `сталь 09Г2С, ${s.wall}`],
      ['Количество осей', s.axles],
      ['Производитель осей', s.maker],
      ['Высота ССУ', `${s.ssu} мм`],
      ['Шины', s.tyres.split(' (')[0]],
      ['Подвеска', s.suspension.toLowerCase()],
      ['Тормоза', s.brakes.toLowerCase()],
      [
        'Опции',
        s.extras.length
          ? s.extras.map((x) => x.split(' (')[0].toLowerCase()).join(', ')
          : 'без опций',
      ],
    )
  } else {
    rows.push(
      ['Шасси', s.chassis],
      ['Узел выдачи топлива', s.unit.toLowerCase()],
      ['Материал', 'сталь 09Г2С, 4 мм'],
    )
  }
  return rows
}

/** Конфигуратор: шаги слева, живая сводка справа, две кнопки заявки. */
export function initConfigurator(root) {
  const box = root.querySelector('[data-configurator]')
  if (!box) return
  box.replaceChildren()

  const state = {}
  for (const cfg of CONFIGURATORS) {
    state[cfg.id] = { ...cfg.defaults }
    for (const step of cfg.steps) {
      if (state[cfg.id][step.key] === undefined) {
        state[cfg.id][step.key] = step.type === 'multi' ? [] : step.options[0]
      }
    }
  }
  let current = CONFIGURATORS[0]
  let reported = false
  let notice = ''
  const refs = {}
  normalize(state.trailer)

  const tabs = el('div', 'cfg__tabs')
  tabs.setAttribute('role', 'tablist')
  const form = el('div', 'cfg__steps')
  const aside = el('aside', 'cfg__summary')
  aside.setAttribute('aria-live', 'polite')
  // На телефоне и планшете итог лежит под всеми шагами, поэтому код и кнопка дублируются в полосе,
  // которая держится над нижней панелью, пока конфигуратор на экране
  const bar = el('div', 'cfg__bar')
  box.append(...(CONFIGURATORS.length > 1 ? [tabs] : []), form, aside, bar)

  const renderSummary = () => {
    const s = state[current.id]
    const code = codeOf(current, s)
    const rows = summaryOf(current, s)
    const text = `${code}. ${rows.map(([k, v]) => `${k}: ${v}`).join('; ')}`

    const list = el('dl', 'specs specs--cfg')
    for (const [k, v] of rows) {
      const row = el('div', v.length > 20 ? 'specs__row specs__row--wide' : 'specs__row')
      row.append(el('dt', '', k), el('dd', '', v))
      list.append(row)
    }
    const actions = el('div', 'cfg__actions')
    const kp = el('button', 'btn btn--primary btn--big', 'Получить КП')
    const talk = el('button', 'btn btn--line btn--big', 'Обсудить с менеджером')
    const barKp = el('button', 'btn btn--primary', 'Получить КП')
    for (const [btn, title] of [
      [kp, `Получите КП на ${code}`],
      [talk, 'Обсудить с менеджером'],
      [barKp, `Получите КП на ${code}`],
    ]) {
      btn.type = 'button'
      btn.dataset.open = 'kp'
      btn.dataset.place = 'constructor'
      btn.dataset.model = code
      btn.dataset.title = title
      btn.dataset.config = text
      btn.dataset.configRows = JSON.stringify(rows)
    }
    actions.append(kp, talk)
    const head = [el('p', 'cfg__label', 'Ваша конфигурация'), el('p', 'cfg__code', code)]
    if (notice) {
      const note = el('p', 'cfg__notice', notice)
      note.setAttribute('role', 'status')
      head.push(note)
    }
    aside.replaceChildren(...head, list, actions)
    const barCode = el('span', 'cfg__bar-code', code)
    bar.replaceChildren(barCode, barKp)
  }

  // На низком экране список прокручивается внутри итога. Колесо над любой частью итога листает
  // список, пока ему есть куда ехать; дальше событие уходит плавной прокрутке страницы
  aside.addEventListener(
    'wheel',
    (event) => {
      const list = aside.querySelector('.specs--cfg')
      if (!list || event.ctrlKey || !event.deltaY) return
      const max = list.scrollHeight - list.clientHeight
      if (max <= 1) return
      const step = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaY
      if (step < 0 ? list.scrollTop <= 0 : list.scrollTop >= max - 1) return
      event.preventDefault()
      event.stopPropagation()
      list.scrollTop += step
    },
    { passive: false },
  )

  const changed = (key) => {
    notice = normalize(state[current.id]).join(' ')
    refresh()
    renderSummary()
    if (!reported) {
      reported = true
      track('configurator_start', { type: current.id, step: key })
    }
  }

  const restricted = (key) => current.id === 'trailer' && (key in RULES || key in OPTION_RULES)

  /** Закрыт ли вариант при текущем состоянии. */
  const isOff = (key, option) => {
    if (!restricted(key)) return false
    const s = state[current.id]
    const list = RULES[key]?.(s)
    if (list && !list.includes(option)) return true
    const rule = OPTION_RULES[key]?.[option]
    return Boolean(rule) && !rule(s)
  }

  /** Если выбранное значение стало недоступным, берём первое допустимое. */
  function normalize(s) {
    const notes = []
    const titleOf = (key) => current.steps.find((x) => x.key === key)?.title ?? key
    for (const key of Object.keys(LIMITS)) {
      const max = LIMITS[key](s)
      if (max !== null && s[key] > max) s[key] = max
    }
    for (const key of Object.keys(RULES)) {
      const list = RULES[key](s)
      if (list && !list.includes(s[key])) {
        const was = s[key]
        s[key] = list[0]
        notes.push(
          `${titleOf(key)}: теперь ${s[key]}. Вариант ${was} недоступен (${reasonOf(key, was, s)}).`,
        )
      }
    }
    for (const [key, rules] of Object.entries(OPTION_RULES)) {
      const kept = s[key].filter((option) => !rules[option] || rules[option](s))
      for (const option of s[key]) {
        if (!kept.includes(option)) {
          notes.push(`Опция «${option.split(' (')[0]}» снята (${reasonOf(key, option, s)}).`)
        }
      }
      s[key] = kept
    }
    return notes
  }

  /** Закрывает недоступные варианты и обновляет подсказки. */
  function refresh() {
    if (current.id !== 'trailer') return
    const s = state.trailer
    for (const key of Object.keys(LIMITS)) {
      const ref = refs[key]
      if (!ref) continue
      const max = LIMITS[key](s) ?? ref.step.max
      ref.input.max = max
      ref.input.value = s[key]
      ref.out.textContent = `${s[key]} ${ref.step.unit}`
      ref.input.style.setProperty(
        '--fill',
        `${((s[key] - ref.step.min) / (max - ref.step.min)) * 100}%`,
      )
      ref.scale.lastChild.textContent = `${max} ${ref.step.unit}`
    }
    for (const key of Object.keys(RULES)) {
      const ref = refs[key]
      if (!ref) continue
      const list = RULES[key](s)
      for (const [option, node] of ref.options) {
        const off = Boolean(list) && !list.includes(option)
        node.label.classList.toggle('is-disabled', off)
        node.input.setAttribute('aria-disabled', String(off))
        node.why.textContent = off ? reasonOf(key, option, s) : ''
        node.input.checked = s[key] === option
      }
    }
    for (const [key, rules] of Object.entries(OPTION_RULES)) {
      const ref = refs[key]
      if (!ref) continue
      for (const [option, node] of ref.options) {
        const off = Boolean(rules[option]) && !rules[option](s)
        node.label.classList.toggle('is-disabled', off)
        node.input.setAttribute('aria-disabled', String(off))
        node.why.textContent = off ? reasonOf(key, option, s) : ''
        node.input.checked = s[key].includes(option)
      }
    }
  }

  const renderStep = (step, index) => {
    const s = state[current.id]
    const wide = step.type === 'multi' || ['purpose', 'volume'].includes(step.key)
    // Обычные div, а не fieldset с legend: legend рисуется поверх верхней границы и вылезает за блок
    const set = el('div', wide ? 'cfg__step cfg__step--wide' : 'cfg__step')
    const legend = el('div', 'cfg__legend')
    legend.id = `cfg-step-${current.id}-${step.key}`
    set.setAttribute('role', 'group')
    set.setAttribute('aria-labelledby', legend.id)
    legend.append(el('span', 'cfg__n', String(index + 1).padStart(2, '0')), step.title)
    set.append(legend)
    if (step.hint) set.append(el('p', 'cfg__hint', step.hint))

    if (step.type === 'range') {
      const out = el('output', 'cfg__out', `${s[step.key]} ${step.unit}`)
      const input = el('input', 'cfg__range')
      Object.assign(input, {
        type: 'range',
        min: step.min,
        max: step.max,
        step: step.step ?? 1,
        value: s[step.key],
      })
      input.setAttribute('aria-label', step.title)
      input.addEventListener('input', () => {
        s[step.key] = Number(input.value)
        out.textContent = `${input.value} ${step.unit}`
        input.style.setProperty(
          '--fill',
          `${((input.value - input.min) / (input.max - input.min)) * 100}%`,
        )
        changed(step.key)
      })
      input.style.setProperty(
        '--fill',
        `${((s[step.key] - step.min) / (step.max - step.min)) * 100}%`,
      )
      const scale = el('div', 'cfg__scale')
      scale.append(
        el('span', '', `${step.min} ${step.unit}`),
        el('span', '', `${step.max} ${step.unit}`),
      )
      set.append(out, input, scale)
      if (step.key in LIMITS) refs[step.key] = { input, out, scale, step }
      return set
    }

    const group = el('div', 'cfg__opts')
    // Колонки по числу вариантов; длинные подписи идут в один столбец
    const longest = Math.max(...step.options.map((o) => o.length))
    const cols = wide
      ? Math.min(step.options.length, step.type === 'multi' ? 4 : 3)
      : longest > 18
        ? 1
        : Math.min(step.options.length, 4)
    group.style.setProperty('--cols', String(cols))
    const options = new Map()
    for (const option of step.options) {
      const label = el('label', 'opt')
      // Производитель осей: рядом с названием флаг страны
      if (step.key === 'maker' && option in MAKER_FLAGS) label.dataset.flag = MAKER_FLAGS[option]
      const input = el('input')
      input.type = step.type === 'multi' ? 'checkbox' : 'radio'
      input.name = `${current.id}-${step.key}`
      input.value = option
      input.checked = step.type === 'multi' ? s[step.key].includes(option) : s[step.key] === option
      const why = el('span', 'opt__why')
      label.addEventListener('click', (event) => {
        if (isOff(step.key, option)) {
          event.preventDefault()
          notice = `Вариант «${option.split(' (')[0]}» недоступен: ${reasonOf(step.key, option, s)}.`
          renderSummary()
        }
      })
      input.addEventListener('change', () => {
        // Стрелки на клавиатуре обходят click: закрытый вариант не выбираем и там
        if (isOff(step.key, option)) {
          notice = `Вариант «${option.split(' (')[0]}» недоступен: ${reasonOf(step.key, option, s)}.`
          refresh()
          renderSummary()
          return
        }
        if (step.type === 'multi') {
          s[step.key] = [...group.querySelectorAll('input:checked')].map((i) => i.value)
        } else {
          s[step.key] = option
        }
        changed(step.key)
      })
      const text = el('span', 'opt__text')
      text.append(el('span', 'opt__name', option), why)
      label.append(input, text)
      group.append(label)
      options.set(option, { label, input, why })
    }
    set.append(group)
    if (restricted(step.key)) refs[step.key] = { options }
    return set
  }

  const renderSteps = () => {
    form.replaceChildren(...current.steps.map((step, index) => renderStep(step, index)))
    notice = normalize(state[current.id]).join(' ')
    refresh()
    renderSummary()
  }

  for (const cfg of CONFIGURATORS) {
    const tab = el('button', 'cfg__tab', cfg.tab)
    tab.type = 'button'
    tab.setAttribute('role', 'tab')
    tab.addEventListener('click', () => {
      current = cfg
      for (const t of tabs.children) t.setAttribute('aria-selected', String(t === tab))
      renderSteps()
    })
    tab.setAttribute('aria-selected', String(cfg === current))
    tabs.append(tab)
  }
  renderSteps()
}
