import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layout/MainLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '巡護工作台', icon: 'DataBoard' }
      },
      {
        path: 'wayline',
        name: 'Wayline',
        component: () => import('@/views/Wayline.vue'),
        meta: { title: '航線管理', icon: 'MapLocation' }
      },
      {
        path: 'wayline/generator',
        name: 'WayLineGenerator',
        component: () => import('@/views/WayLineGenerator/index.vue'),
        meta: { title: '航線編輯器', icon: 'Edit', hidden: true }
      },
      {
        path: 'violations',
        name: 'Violations',
        component: () => import('@/views/Violations.vue'),
        meta: { title: '違規紀錄管理', icon: 'List' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { title: '系統設置', icon: 'Setting' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
