/**
 * Сборка для Тильды.
 *
 * 1. Собирает скрипт и стили сайта в tilda/dist (имена файлов постоянные).
 * 2. Режет index.html на части и пишет готовые вставки:
 *    head.html, header.html, main.html, footer.html.
 *
 * Адрес хранилища берётся из tilda/config.json или из переменной ASSETS_BASE.
 *
 * Ключи:
 *   --ref=<хэш коммита>  скрипт и стили в head.html подключаются из этого коммита, а не из ветки main.
 *                        Адрес с хэшем не кэшируется как «ветка», поэтому обновление видно сразу.
 *   --head-only          vite не запускается: заново пишутся только вставки (после коммита dist).
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(join(root, 'tilda/config.json'), 'utf8'))

const withSlash = (url) => (url.endsWith('/') ? url : `${url}/`)
const base = withSlash(process.env.ASSETS_BASE ?? config.assetsBase)
const site = withSlash(config.siteUrl)
const version = Date.now().toString(36)

const args = process.argv.slice(2)
const headOnly = args.includes('--head-only')
const ref = args.find((arg) => arg.startsWith('--ref='))?.slice('--ref='.length)
/** Адрес для скрипта и стилей в head: с хэшем коммита, если он задан. */
const pinned = ref ? base.replace(/@[^/]+/, `@${ref}`) : base

const vite = join(root, 'node_modules/vite/bin/vite.js')
if (!headOnly) {
  const built = spawnSync(process.execPath, [vite, 'build', '--mode', 'tilda'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ASSETS_BASE: base },
  })
  if (built.status !== 0) process.exit(built.status ?? 1)
}

const html = readFileSync(join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n')

const between = (text, from, to) => {
  const start = text.indexOf(from)
  const end = text.indexOf(to, start)
  if (start < 0 || end < 0) throw new Error(`В index.html не найдено: ${from} … ${to}`)
  return text.slice(start, end + to.length)
}

/** Пути от корня сайта и абсолютные адреса сайта заменяем на адрес хранилища. */
const localize = (text) =>
  text
    .replace(
      /(src|href)="\/(?=photos\/|favicon|icon-|apple-touch|site\.webmanifest|logo\.svg|og-image)/g,
      `$1="${base}`,
    )
    .replaceAll(`${site}photos/`, `${base}photos/`)
    .replaceAll(`${site}og-image.jpg`, `${base}og-image.jpg`)
    .replaceAll(`${site}icon-512.png`, `${base}icon-512.png`)

const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'))
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'))

// В голове оставляем только то, чего нет в настройках Тильды: заголовок, описание, адрес и кодировку Тильда задаёт сама
const headKeep = head
  .replace(/<meta charset[^>]*>\s*/g, '')
  .replace(/<meta\s+name="viewport"[^>]*>\s*/g, '')
  .replace(/<title>[\s\S]*?<\/title>\s*/g, '')
  .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/g, '')
  .replace(/<link rel="canonical"[^>]*>\s*/g, '')
  // Манифест с адреса хранилища браузер отвергает (start_url другого домена), в Тильде он не нужен
  .replace(/<link rel="manifest"[^>]*>\s*/g, '')
  .replace(/<script type="module" src="\/src\/main\.js"><\/script>\s*/g, '')

const headFile = `<!-- Вставка в «Настройки сайта → Ещё → HTML-код для вставки внутрь HEAD». Сгенерировано tilda/build.mjs, руками не править. -->
<link rel="preconnect" href="${new URL(base).origin}" crossorigin />
<link rel="stylesheet" href="${config.cssUrl || `${pinned}assets/app.css?v=${version}`}" />
<style>html,body,.t-records{background-color:#1a1a18!important}</style>
${localize(headKeep).trim()}
<script defer src="${pinned}assets/app.js?v=${version}"></script>
`

const headerBlock = between(body, '<a class="skip"', '</header>')
const mainBlock = between(body, '<main id="main">', '</main>')
const footerBlock = body.slice(body.indexOf('<footer class="foot">')).trim()

const note = (name, where) =>
  `<!-- ${name}: вставьте в блок T123 «HTML» ${where}. Сгенерировано tilda/build.mjs, руками не править. -->\n`

writeFileSync(join(root, 'tilda/head.html'), headFile)
writeFileSync(
  join(root, 'tilda/header.html'),
  note('Шапка', 'на странице Header') + localize(headerBlock) + '\n',
)
writeFileSync(
  join(root, 'tilda/main.html'),
  note('Главная', 'на главной странице') + localize(mainBlock) + '\n',
)
writeFileSync(
  join(root, 'tilda/footer.html'),
  note('Подвал, нижняя панель и окна', 'на странице Footer') + localize(footerBlock) + '\n',
)

process.stdout.write(
  `\nГотово. Хранилище: ${base}\nСкрипт и стили в head.html: ${pinned}assets/\nВставки: tilda/head.html, header.html, main.html, footer.html\n`,
)
