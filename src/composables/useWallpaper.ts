import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useCountdownStore } from '@/stores/countdown'
import { renderWallpaperAsync } from '@/utils/wallpaperRenderer'
import type { WallpaperMode, InteractiveAction } from '@/types'
import dayjs from 'dayjs'

export function useWallpaper() {
  const store = useCountdownStore()
  const canvas = ref<HTMLCanvasElement | null>(null)
  const isGenerating = ref(false)
  const lastWallpaperPath = ref<string>('')
  const currentMode = ref<WallpaperMode>('static')
  const isInteractiveRunning = ref(false)
  let tickTimer: number | null = null
  let removeTick: (() => void) | null = null
  let removeRefresh: (() => void) | null = null
  let removeInteractiveAction: (() => void) | null = null
  let removeRequestData: (() => void) | null = null
  let rotateTimer: number | null = null

  async function generateAndSetWallpaper() {
    if (!canvas.value) return
    const countdown = store.activeCountdown
    if (!countdown) return

    isGenerating.value = true
    try {
      const dataUrl = await renderWallpaperAsync(canvas.value, {
        width: store.settings.displayWidth,
        height: store.settings.displayHeight,
        countdown,
        style: store.settings.currentWallpaperStyle,
        allCountdowns: store.wallpaperCountdowns
      })

      const filename = `wallpaper_${dayjs().format('YYYYMMDD_HHmmss')}.png`
      if (window.electronAPI) {
        const savedPath = await window.electronAPI.saveWallpaperImage(filename, dataUrl)
        const success = await window.electronAPI.setWallpaper(savedPath)
        if (success) {
          lastWallpaperPath.value = savedPath
          await window.electronAPI.cleanOldWallpapers(filename)
        }
      }
    } catch (e) {
      console.error('Failed to generate wallpaper:', e)
    } finally {
      isGenerating.value = false
    }
  }

  function startTickTimer() {
    stopTickTimer()
    tickTimer = window.setInterval(() => {
      store.checkExpiredCountdowns()
      if (store.settings.autoUpdateWallpaper) {
        generateAndSetWallpaper()
      }
    }, store.settings.wallpaperUpdateInterval)
  }

  function stopTickTimer() {
    if (tickTimer !== null) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }

  function startRotateTimer() {
    stopRotateTimer()
    if (store.settings.autoRotateWallpaper && store.wallpaperCountdowns.length > 1) {
      rotateTimer = window.setInterval(() => {
        const list = store.wallpaperCountdowns
        const currentIndex = list.findIndex(c => c.id === store.settings.activeCountdownId)
        const nextIndex = (currentIndex + 1) % list.length
        store.setActiveCountdown(list[nextIndex].id)
        generateAndSetWallpaper()
      }, store.settings.rotateIntervalMinutes * 60 * 1000)
    }
  }

  function stopRotateTimer() {
    if (rotateTimer !== null) {
      clearInterval(rotateTimer)
      rotateTimer = null
    }
  }

  async function switchToMode(mode: WallpaperMode) {
    currentMode.value = mode
    store.updateSettings({ wallpaperMode: mode })

    if (mode === 'interactive') {
      await startInteractiveWallpaper()
      stopTickTimer()
    } else {
      await stopInteractiveWallpaper()
      startTickTimer()
    }
  }

  async function startInteractiveWallpaper() {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.interactiveWallpaperShow()
      isInteractiveRunning.value = true
      syncInteractiveData()
    } catch (e) {
      console.error('Failed to start interactive wallpaper:', e)
    }
  }

  async function stopInteractiveWallpaper() {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.interactiveWallpaperClose()
      isInteractiveRunning.value = false
    } catch (e) {
      console.error('Failed to stop interactive wallpaper:', e)
    }
  }

  async function toggleInteractiveWallpaper() {
    if (isInteractiveRunning.value) {
      await switchToMode('static')
    } else {
      await switchToMode('interactive')
    }
  }

  function syncInteractiveData() {
    if (!window.electronAPI || !isInteractiveRunning.value) return
    const countdown = store.activeCountdown
    if (!countdown) return
    const data = {
      countdown,
      allCountdowns: store.wallpaperCountdowns,
      style: store.settings.currentWallpaperStyle,
      interactiveConfig: store.settings.interactiveConfig
    }
    window.electronAPI.interactiveWallpaperUpdateData(data)
      .then((success) => {
        if (!success) {
          console.warn('Interactive wallpaper window not ready, retrying...')
          setTimeout(syncInteractiveData, 500)
        }
      })
      .catch(() => {
        setTimeout(syncInteractiveData, 500)
      })
  }

  function handleInteractiveAction(action: string) {
    try {
      const parsed = JSON.parse(action) as InteractiveAction
      switch (parsed.type) {
        case 'switch-countdown': {
          const list = store.wallpaperCountdowns
          if (list.length <= 1) break
          const currentIndex = list.findIndex(c => c.id === store.settings.activeCountdownId)
          if (parsed.direction === 'next') {
            const nextIndex = (currentIndex + 1) % list.length
            store.setActiveCountdown(list[nextIndex].id)
          } else {
            const prevIndex = (currentIndex - 1 + list.length) % list.length
            store.setActiveCountdown(list[prevIndex].id)
          }
          syncInteractiveData()
          break
        }
        case 'open-main-window': {
          window.electronAPI?.mainWindowShow()
          break
        }
        case 'new-countdown': {
          window.electronAPI?.mainWindowShow()
          break
        }
        case 'toggle-mode': {
          switchToMode('static')
          break
        }
        case 'hot-zone': {
          const zone = parsed.zone
          if (zone.action === 'new-countdown') {
            window.electronAPI?.mainWindowShow()
          } else if (zone.action === 'toggle-mode') {
            switchToMode('static')
          } else if (zone.action === 'next-countdown') {
            const list = store.wallpaperCountdowns
            if (list.length > 1) {
              const currentIndex = list.findIndex(c => c.id === store.settings.activeCountdownId)
              const nextIndex = (currentIndex + 1) % list.length
              store.setActiveCountdown(list[nextIndex].id)
              syncInteractiveData()
            }
          } else if (zone.action === 'show-main') {
            window.electronAPI?.mainWindowShow()
          }
          break
        }
      }
    } catch {
      console.warn('Failed to handle interactive action:', action)
    }
  }

  onMounted(async () => {
    await store.loadData()

    currentMode.value = store.settings.wallpaperMode

    if (window.electronAPI) {
      const isRunning = await window.electronAPI.interactiveWallpaperIsRunning()
      isInteractiveRunning.value = isRunning
    }

    if (currentMode.value === 'interactive') {
      startInteractiveWallpaper()
    } else {
      if (store.settings.autoUpdateWallpaper && window.electronAPI) {
        window.electronAPI.startWallpaperAutoUpdate(store.settings.wallpaperUpdateInterval)
        removeTick = window.electronAPI.onWallpaperTick(() => {
          store.checkExpiredCountdowns()
          generateAndSetWallpaper()
        })
        removeRefresh = window.electronAPI.onWallpaperRefresh(() => {
          generateAndSetWallpaper()
        })
      } else {
        startTickTimer()
      }
    }

    if (window.electronAPI) {
      removeInteractiveAction = window.electronAPI.onInteractiveAction((action) => {
        handleInteractiveAction(action)
      })
      removeRequestData = window.electronAPI.onWallpaperRequestData(() => {
        syncInteractiveData()
      })
    }

    startRotateTimer()

    if (store.activeCountdown) {
      if (currentMode.value === 'static') {
        setTimeout(generateAndSetWallpaper, 500)
      } else {
        setTimeout(syncInteractiveData, 800)
      }
    }
  })

  onUnmounted(() => {
    stopTickTimer()
    stopRotateTimer()
    if (removeTick) removeTick()
    if (removeRefresh) removeRefresh()
    if (removeInteractiveAction) removeInteractiveAction()
    if (removeRequestData) removeRequestData()
    if (window.electronAPI) {
      window.electronAPI.stopWallpaperAutoUpdate()
    }
  })

  watch(
    () => store.settings.wallpaperUpdateInterval,
    () => {
      if (!window.electronAPI && currentMode.value === 'static') {
        startTickTimer()
      }
    }
  )

  watch(
    () => store.settings.autoRotateWallpaper,
    () => startRotateTimer()
  )

  watch(
    () => store.settings.rotateIntervalMinutes,
    () => startRotateTimer()
  )

  watch(
    () => store.settings.activeCountdownId,
    () => {
      if (currentMode.value === 'static') {
        generateAndSetWallpaper()
      } else {
        syncInteractiveData()
      }
    }
  )

  watch(
    () => store.settings.currentWallpaperStyle,
    () => {
      if (currentMode.value === 'interactive') {
        syncInteractiveData()
      }
    }
  )

  watch(
    () => store.settings.interactiveConfig,
    () => {
      if (currentMode.value === 'interactive') {
        syncInteractiveData()
      }
    },
    { deep: true }
  )

  return {
    canvas,
    isGenerating,
    lastWallpaperPath,
    currentMode,
    isInteractiveRunning,
    generateAndSetWallpaper,
    switchToMode,
    toggleInteractiveWallpaper,
    syncInteractiveData
  }
}
