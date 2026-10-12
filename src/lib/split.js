/**
 * Разбивает текст элемента на слова в масках для построчного появления.
 * Вложенная разметка (например, знак рубля в отдельном шрифте) и переносы строк сохраняются.
 * Возвращает внутренние слои слов, которые двигает анимация.
 *
 * @param {HTMLElement} el
 * @returns {HTMLElement[]}
 */
export function splitWords(el) {
  const label = [...el.childNodes].map((n) => (n.nodeName === 'BR' ? ' ' : n.textContent)).join('')
  el.setAttribute('aria-label', label.replace(/\s+/g, ' ').trim())

  // Сначала собираем слова из узлов, потом заменяем содержимое
  const words = []
  let current = null
  const flush = () => {
    if (current) words.push(current)
    current = null
  }
  const add = (node) => {
    current ??= []
    current.push(node)
  }

  for (const node of [...el.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const piece of node.textContent.split(/([ \t\r\n]+)/)) {
        if (!piece) continue
        if (/^[ \t\r\n]+$/.test(piece)) flush()
        else add(document.createTextNode(piece))
      }
    } else if (node.nodeName === 'BR') {
      flush()
      words.push('br')
    } else {
      add(node.cloneNode(true))
    }
  }
  flush()

  el.textContent = ''
  const inners = []
  words.forEach((word, index) => {
    if (word === 'br') {
      el.append(document.createElement('br'))
      return
    }
    const mask = document.createElement('span')
    mask.className = 'w'
    mask.setAttribute('aria-hidden', 'true')
    const inner = document.createElement('span')
    inner.className = 'w__i'
    inner.append(...word)
    mask.append(inner)
    el.append(mask)
    const next = words[index + 1]
    if (next !== undefined && next !== 'br') el.append(' ')
    inners.push(inner)
  })
  return inners
}
