import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useCountdownStore } from '@/stores/countdown'
import { renderWallpaperAsync } from '@/utils/wallpaperRenderer'
import dayjs from 'dayjs'

export function useWallpaper() {
  const store = useCountdownStore()
  const canvas = ref<HTMLCanvasElement | null>(null)
  const isGenerating = ref(false)
  const lastWallpaperPath = ref<string>('')
  let tickTimer: number | null = null
  let removeTick: (() => void) | null = null
  let removeRefresh: (() => void) | null = null
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

  onMounted(async () => {
    await store.loadData()

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

    startRotateTimer()

    if (store.activeCountdown) {
      setTimeout(generateAndSetWallpaper, 500)
    }
  })

  onUnmounted(() => {
    stopTickTimer()
    stopRotateTimer()
    if (removeTick) removeTick()
    if (removeRefresh) removeRefresh()
    if (window.electronAPI) {
      window.electronAPI.stopWallpaperAutoUpdate()
    }
  })

  watch(
    () => store.settings.wallpaperUpdateInterval,
    () => {
      if (!window.electronAPI) {
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
      generateAndSetWallpaper()
    }
  )

  return {
    canvas,
    isGenerating,
    lastWallpaperPath,
    generateAndSetWallpaper
  }
}
