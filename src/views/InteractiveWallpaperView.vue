<template>
  <div class="interactive-wallpaper">
    <canvas ref="wallpaperCanvas" class="wallpaper-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { InteractiveRenderer } from '@/utils/interactiveRenderer'
import type { CountdownItem, WallpaperStyle, InteractiveWallpaperConfig, InteractiveState, InteractiveAction } from '@/types'
import { InteractiveWallpaperEngine } from '@/utils/interactiveWallpaper'

const wallpaperCanvas = ref<HTMLCanvasElement | null>(null)
let renderer: InteractiveRenderer | null = null
let engine: InteractiveWallpaperEngine | null = null
let removeDataHandler: (() => void) | null = null

let currentCountdown: CountdownItem | null = null
let currentStyle: WallpaperStyle = 'gradient'
let currentConfig: InteractiveWallpaperConfig | null = null
let currentState: InteractiveState = 'idle'

function initCanvas() {
  if (!wallpaperCanvas.value) return
  const canvas = wallpaperCanvas.value
  canvas.width = window.screen.width
  canvas.height = window.screen.height

  renderer = new InteractiveRenderer()
  renderer.mount(canvas)
  engine = renderer.getEngine()

  engine.setActionHandler((action: InteractiveAction) => {
    if (window.electronAPI) {
      window.electronAPI.interactiveWallpaperSendAction(JSON.stringify(action))
    }
  })

  engine.setStateChangeHandler((state: InteractiveState) => {
    currentState = state
  })

  if (currentCountdown && currentConfig) {
    renderer.updateOptions({
      width: canvas.width,
      height: canvas.height,
      countdown: currentCountdown,
      style: currentStyle,
      interactiveConfig: currentConfig,
      interactiveState: currentState
    })
    renderer.start()
  }
}

function handleUpdateData(data: any) {
  if (data.countdown) currentCountdown = data.countdown
  if (data.style) currentStyle = data.style
  if (data.interactiveConfig) currentConfig = data.interactiveConfig
  if (data.allCountdowns) {
    // available for future use
  }

  if (renderer && currentCountdown && currentConfig) {
    renderer.updateOptions({
      width: wallpaperCanvas.value?.width || window.screen.width,
      height: wallpaperCanvas.value?.height || window.screen.height,
      countdown: currentCountdown,
      style: currentStyle,
      interactiveConfig: currentConfig,
      interactiveState: currentState
    })
    renderer.start()
  }
}

onMounted(() => {
  initCanvas()

  if (window.electronAPI) {
    removeDataHandler = window.electronAPI.onWallpaperUpdateData((data) => {
      handleUpdateData(data)
    })
  }

  window.addEventListener('resize', () => {
    if (wallpaperCanvas.value && renderer) {
      wallpaperCanvas.value.width = window.screen.width
      wallpaperCanvas.value.height = window.screen.height
      renderer.resize(window.screen.width, window.screen.height)
    }
  })
})

onUnmounted(() => {
  if (renderer) {
    renderer.unmount()
    renderer = null
  }
  engine = null
  if (removeDataHandler) {
    removeDataHandler()
    removeDataHandler = null
  }
})
</script>

<style lang="scss" scoped>
.interactive-wallpaper {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: transparent;
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
}

.wallpaper-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
