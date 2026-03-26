import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import 'virtual:uno.css'
import '@/styles/index.scss'
import VueCesium from 'vue-cesium'
import 'vue-cesium/dist/index.css'
import { Icon } from '@/components/Icon'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.component('Icon', Icon)
app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.use(VueCesium)

app.mount('#app')
