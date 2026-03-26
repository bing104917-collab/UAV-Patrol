import { resolve } from 'path'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import cesium from 'vite-plugin-cesium'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

// 路径查找
function pathResolve(dir: string) {
  return resolve(__dirname, '.', dir)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    base: './',
    resolve: {
      alias: [
        {
          find: /\@\//,
          replacement: `${pathResolve('src')}/`
        }
      ]
    },
    plugins: [
      vue(),
      vueJsx(),
      cesium(),
      UnoCSS(),
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia'],
        resolvers: [ElementPlusResolver()],
        dts: 'src/auto-import.d.ts'
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'src/components.d.ts'
      }),
      createSvgIconsPlugin({
        iconDirs: [pathResolve('src/assets/svgs')],
        symbolId: 'icon-[dir]-[name]'
      })
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/styles/variables.scss" as *;\n',
          javascriptEnabled: true
        }
      }
    },
    server: {
      port: 5174,
      host: '0.0.0.0',
      proxy: {
        '/api/v1/rec': {
          target: 'http://localhost:8715',
          changeOrigin: true
        },
        '/api/v1/violations': {
          target: 'http://localhost:8000',
          changeOrigin: true
        },
        '/admin-api': {
          target: 'http://localhost:8000',
          changeOrigin: true
        },
        '/iot': {
          target: 'http://localhost:8000',
          changeOrigin: true
        },
        '/dock': {
          target: 'http://localhost:8000',
          changeOrigin: true
        }
      }
    }
  }
})
