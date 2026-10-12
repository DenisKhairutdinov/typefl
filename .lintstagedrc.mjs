/** Файлы, собранные скриптом tilda/build.mjs, не проверяются: их правит только сборка. */
const generated = (file) => /[\\/]tilda[\\/](dist[\\/]|(head|header|main|footer)\.html$)/.test(file)

const quote = (files) => files.map((file) => `"${file}"`).join(' ')
const own = (files) => files.filter((file) => !generated(file))

export default {
  '*.{js,mjs,cjs}': (files) => {
    const list = quote(own(files))
    return list ? [`eslint --fix ${list}`, `prettier --write ${list}`] : []
  },
  '*.css': (files) => {
    const list = quote(own(files))
    return list ? [`stylelint --fix ${list}`, `prettier --write ${list}`] : []
  },
  '*.{html,json,md,yml,yaml}': (files) => {
    const list = quote(own(files))
    return list ? [`prettier --write ${list}`] : []
  },
}
