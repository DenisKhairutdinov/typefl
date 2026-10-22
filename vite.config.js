import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'

/**
 * Шрифты первого экрана: кириллица и латиница основного текста, кириллица заголовка и
 * моноширинных подписей. Замер показал, что с этими четырьмя первая отрисовка быстрее, чем
 * с двумя кириллическими.
 */
export const CRITICAL_FONTS =
  /(?:inter-(?:latin|cyrillic)|sofia-sans-extra-condensed-cyrillic|jetbrains-mono-cyrillic)-wght-normal-.*\.woff2$/

/**
 * Предзагрузка шрифтов первого экрана: без неё текст сначала рисуется запасным шрифтом, а потом
 * перестраивается, и блоки под ним сдвигаются.
 */
const preloadFonts = () => ({
  name: 'preload-critical-fonts',
  transformIndexHtml: {
    order: 'post',
    handler(_html, ctx) {
      if (!ctx.bundle) return []
      return Object.keys(ctx.bundle)
        .filter((file) => CRITICAL_FONTS.test(file))
        .map((file) => ({
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'font',
            type: 'font/woff2',
            crossorigin: '',
            href: `/${file}`,
          },
          injectTo: 'head-prepend',
        }))
    },
  },
})

/**
 * Обычная сборка: сайт целиком, пути от корня.
 * Сборка для Тильды (--mode tilda): только скрипт и стили с постоянными именами,
 * все пути к файлам абсолютные и начинаются с ASSETS_BASE, см. tilda/README.md.
 */
export default defineConfig(({ mode }) => {
  const tilda = mode === 'tilda'

  return {
    base: tilda ? process.env.ASSETS_BASE : '/',
    plugins: tilda ? [] : [preloadFonts()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      target: 'es2022',
      cssCodeSplit: false,
      ...(tilda && {
        outDir: 'tilda/dist',
        emptyOutDir: true,
        rollupOptions: {
          input: fileURLToPath(new URL('./src/main.js', import.meta.url)),
          output: {
            // Обычный скрипт без type="module": так его принимает любой конструктор и не нужен CORS
            format: 'iife',
            entryFileNames: 'assets/app.js',
            assetFileNames: (asset) => {
              const name = asset.names?.[0] ?? asset.name ?? ''
              return name.endsWith('.css') ? 'assets/app.css' : 'assets/[name]-[hash][extname]'
            },
          },
        },
      }),
    },
  }
})
