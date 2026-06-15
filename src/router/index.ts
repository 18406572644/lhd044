import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue')
  },
  {
    path: '/mini',
    name: 'Mini',
    component: () => import('@/views/MiniView.vue')
  },
  {
    path: '/interactive-wallpaper',
    name: 'InteractiveWallpaper',
    component: () => import('@/views/InteractiveWallpaperView.vue')
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('@/views/HistoryView.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
