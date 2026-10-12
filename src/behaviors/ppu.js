/** Окно про пенополиуретан: открывается по клику на характеристику «термоизоляция ППУ». */
const MENTION = /пенополиуретан|ппу/i
const HOLDERS = 'li, .badge, .specs__row, .kv__row, .opt'

export function initPpu(root) {
  const dialog = root.querySelector('[data-dialog="ppu"]')
  if (!dialog) return

  const open = () => dialog.showModal()

  const mark = (node) => {
    if (node.dataset.ppu !== undefined) return
    const text = node.textContent.trim()
    // Только короткие подписи характеристик, а не целые блоки с описанием
    if (!MENTION.test(text) || text.length > 90 || node.querySelector(HOLDERS)) return
    if (node.closest('dialog[data-dialog="ppu"]')) return
    node.dataset.ppu = ''
    if (node.matches('.opt')) {
      // В конфигураторе клик по подписи ставит галочку, поэтому справка отдельной кнопкой
      const info = document.createElement('button')
      info.type = 'button'
      info.className = 'ppu-info'
      info.setAttribute('aria-label', 'Почему пенополиуретан, а не минвата')
      info.textContent = '?'
      node.append(info)
    } else {
      node.tabIndex = 0
      // У элемента списка роль button недопустима: читалка перестала бы считать его пунктом списка
      if (!node.matches('li')) node.setAttribute('role', 'button')
    }
  }

  const scan = (scope) => {
    for (const node of scope.querySelectorAll?.(HOLDERS) ?? []) mark(node)
    if (scope.matches?.(HOLDERS)) mark(scope)
  }

  scan(root)
  let queued = false
  new MutationObserver(() => {
    if (queued) return
    queued = true
    setTimeout(() => {
      queued = false
      scan(root)
    }, 50)
  }).observe(root.body ?? root, { childList: true, subtree: true })

  root.addEventListener('click', (event) => {
    const info = event.target.closest('.ppu-info')
    if (info) {
      event.preventDefault()
      event.stopPropagation()
      open()
      return
    }
    const holder = event.target.closest('[data-ppu]')
    if (holder && !holder.matches('.opt') && !event.target.closest('a, button')) open()
  })

  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const holder = event.target.closest('[data-ppu]')
    if (holder && holder === event.target && !holder.matches('.opt')) {
      event.preventDefault()
      open()
    }
  })

  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-ppu-close]')) dialog.close()
    // Кнопка заявки закрывает справку, чтобы окна не копились друг на друге
    if (event.target.closest('[data-open="kp"]')) dialog.close()
    if (event.target === dialog && !('closedBy' in HTMLDialogElement.prototype)) dialog.close()
  })
}
