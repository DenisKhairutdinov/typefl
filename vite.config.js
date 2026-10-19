import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'

/**
 * Обычная сборка: сайт целиком, пути от корня.
 * Сборка для Тильды (--mode tilda): только скрипт и стили с постоянными именами,
 * все пути к файлам абсолютные и начинаются с ASSETS_BASE, см. tilda/README.md.
 */
export default defineConfig(({ mode }) => {
  const tilda = mode === 'tilda'

  return {
    base: tilda ? process.env.ASSETS_BASE : '/',
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
            inlineDynamicImports: true,
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
