import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useCountdownStore } from '@/stores/countdown'
import { renderWallpaperAsync } from '@/utils/wallpaperRenderer'
import type { WallpaperMode } from '@/types'
import dayjs from 'dayjs'

export function useWallpaper() {
  const store = useCountdownStore()
  const canvas = ref<HTMLCanvasElement | null>(null)
  const isGenerating = ref(false)
  const lastWallpaperPath = ref<string>('')
  const currentMode = ref<WallpaperMode>('static')
  let tickTimer: number | null = null
  let removeTick: (() => void) | null = null
  let removeRefresh: (() => void) | null = null
  let removeCycleCountdown: (() => void) | null = null
  let removeNewCountdown: (() => void) | null = null
  let rotateTimer: number | null = null
  let dataBroadcastTimer: number | null = null
  let showNewCountdownForm: (() => void) | null = null

  function registerNewCountdownFormHandler(handler: () => void) {
    showNewCountdownForm = handler
  }

  function broadcastWallpaperData() {
    if (!window.electronAPI) return
    const countdown = store.activeCountdown
    if (!countdown) return

    window.electronAPI.broadcastWallpaperData({
      countdown,
      style: store.settings.currentWallpaperStyle,
      allCountdowns: store.wallpaperCountdowns,
      animatedConfig: store.settings.animatedConfig,
      interactiveConfig: store.settings.interactiveConfig
    })
  }

  async function switchWallpaperMode(mode: WallpaperMode): Promise<boolean> {
    if (!window.electronAPI) return false
    try {
      const success = await window.electronAPI.setWallpaperMode(mode)
      if (success) {
        currentMode.value = mode
        store.updateSettings({ wallpaperMode: mode })

        if (mode === 'interactive') {
          broadcastWallpaperData()
          startDataBroadcastTimer()
          await window.electronAPI.setWallpaperClickThrough(
            store.settings.interactiveConfig.clickThrough
          )
        } else {
          stopDataBroadcastTimer()
          if (!store.settings.autoUpdateWallpaper) {
            await generateAndSetWallpaper()
          }
        }
      }
      return success
    } catch (e) {
      console.error('Failed to switch wallpaper mode:', e)
      return false
    }
  }

  function cycleActiveCountdown() {
    const list = store.wallpaperCountdowns
    if (list.length <= 1) return

    const currentIndex = list.findIndex(c => c.id === store.settings.activeCountdownId)
    const nextIndex = (currentIndex + 1) % list.length
    store.setActiveCountdown(list[nextIndex].id)

    if (currentMode.value === 'interactive') {
      broadcastWallpaperData()
    }
  }

  function startDataBroadcastTimer() {
    stopDataBroadcastTimer()
    if (!window.electronAPI) return
    dataBroadcastTimer = window.setInterval(() => {
      broadcastWallpaperData()
    }, 1000)
  }

  function stopDataBroadcastTimer() {
    if (dataBroadcastTimer !== null) {
      clearInterval(dataBroadcastTimer)
      dataBroadcastTimer = null
    }
  }

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
      if (store.settings.autoUpdateWallpaper && currentMode.value === 'static') {
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
        if (currentMode.value === 'interactive') {
          broadcastWallpaperData()
        } else if (store.settings.autoUpdateWallpaper) {
          generateAndSetWallpaper()
        }
      }, store.settings.rotateIntervalMinutes * 60 * 1000)
    }
  }

  function stopRotateTimer() {
    if (rotateTimer !== null) {
      clearInterval(rotateTimer)
      rotateTimer = null
    }
  }

  async function syncInteractiveModeState() {
    if (!window.electronAPI) return
    try {
      const exists = await window.electronAPI.wallpaperWindowExists()
      currentMode.value = exists ? 'interactive' : store.settings.wallpaperMode || 'static'
      if (exists) {
        startDataBroadcastTimer()
        broadcastWallpaperData()
        await window.electronAPI.setWallpaperClickThrough(
          store.settings.interactiveConfig.clickThrough
        )
      }
    } catch (e) {
      console.error('Failed to sync interactive mode state:', e)
    }
  }

  onMounted(async () => {
    await store.loadData()
    await syncInteractiveModeState()

    if (store.settings.wallpaperMode === 'interactive' && currentMode.value !== 'interactive') {
      await switchWallpaperMode('interactive')
    }

    if (store.settings.autoUpdateWallpaper && window.electronAPI) {
      window.electronAPI.startWallpaperAutoUpdate(store.settings.wallpaperUpdateInterval)
      removeTick = window.electronAPI.onWallpaperTick(() => {
        store.checkExpiredCountdowns()
        if (currentMode.value === 'static') {
          generateAndSetWallpaper()
        } else {
          broadcastWallpaperData()
        }
      })
      removeRefresh = window.electronAPI.onWallpaperRefresh(() => {
        if (currentMode.value === 'static') {
          generateAndSetWallpaper()
        } else {
          broadcastWallpaperData()
        }
      })
    } else {
      startTickTimer()
    }

    if (window.electronAPI) {
      removeCycleCountdown = window.electronAPI.onCycleCountdown(() => {
        cycleActiveCountdown()
      })
      removeNewCountdown = window.electronAPI.onNewCountdown(() => {
        if (showNewCountdownForm) {
          showNewCountdownForm()
        }
      })
    }

    startRotateTimer()

    if (store.activeCountdown && currentMode.value === 'static') {
      setTimeout(generateAndSetWallpaper, 500)
    }
  })

  onUnmounted(() => {
    stopTickTimer()
    stopRotateTimer()
    stopDataBroadcastTimer()
    if (removeTick) removeTick()
    if (removeRefresh) removeRefresh()
    if (removeCycleCountdown) removeCycleCountdown()
    if (removeNewCountdown) removeNewCountdown()
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
      if (currentMode.value === 'interactive') {
        broadcastWallpaperData()
      } else if (store.settings.autoUpdateWallpaper) {
        generateAndSetWallpaper()
      }
    }
  )

  watch(
    () => store.settings.interactiveConfig.clickThrough,
    async (val) => {
      if (window.electronAPI && currentMode.value === 'interactive') {
        await window.electronAPI.setWallpaperClickThrough(val)
      }
    }
  )

  watch(
    () => [store.settings.currentWallpaperStyle, store.settings.animatedConfig, store.settings.interactiveConfig],
    () => {
      if (currentMode.value === 'interactive') {
        broadcastWallpaperData()
      }
    },
    { deep: true }
  )

  watch(
    () => store.wallpaperCountdowns,
    () => {
      if (currentMode.value === 'interactive') {
        broadcastWallpaperData()
      }
    },
    { deep: true }
  )

  return {
    canvas,
    isGenerating,
    lastWallpaperPath,
    currentMode,
    generateAndSetWallpaper,
    switchWallpaperMode,
    cycleActiveCountdown,
    broadcastWallpaperData,
    registerNewCountdownFormHandler
  }
}
