<template>
  <div class="interactive-wallpaper" id="interactive-wallpaper-root">
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

  const screenWidth = window.innerWidth || window.screen.width
  const screenHeight = window.innerHeight || window.screen.height
  canvas.width = screenWidth
  canvas.height = screenHeight

  const root = document.getElementById('interactive-wallpaper-root')
  if (root) {
    root.style.width = screenWidth + 'px'
    root.style.height = screenHeight + 'px'
  }

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

  renderer.start()

  requestData()
}

function requestData() {
  if (window.electronAPI) {
    window.electronAPI.interactiveWallpaperRequestData()
      .catch(() => {
        setTimeout(requestData, 1000)
      })
  }
}

function handleUpdateData(data: any) {
  if (data.countdown) currentCountdown = data.countdown
  if (data.style) currentStyle = data.style
  if (data.interactiveConfig) currentConfig = data.interactiveConfig

  if (renderer && currentCountdown && currentConfig) {
    renderer.updateOptions({
      width: wallpaperCanvas.value?.width || window.innerWidth,
      height: wallpaperCanvas.value?.height || window.innerHeight,
      countdown: currentCountdown,
      style: currentStyle,
      interactiveConfig: currentConfig,
      interactiveState: currentState
    })
    renderer.setHasData(true)
  }
}

function handleResize() {
  const canvas = wallpaperCanvas.value
  if (!canvas || !renderer) return

  const screenWidth = window.innerWidth || window.screen.width
  const screenHeight = window.innerHeight || window.screen.height

  canvas.width = screenWidth
  canvas.height = screenHeight

  const root = document.getElementById('interactive-wallpaper-root')
  if (root) {
    root.style.width = screenWidth + 'px'
    root.style.height = screenHeight + 'px'
  }

  renderer.resize(screenWidth, screenHeight)

  if (currentCountdown && currentConfig) {
    renderer.updateOptions({
      width: screenWidth,
      height: screenHeight,
      countdown: currentCountdown,
      style: currentStyle,
      interactiveConfig: currentConfig,
      interactiveState: currentState
    })
  }
}

onMounted(() => {
  initCanvas()

  if (window.electronAPI) {
    removeDataHandler = window.electronAPI.onWallpaperUpdateData((data) => {
      handleUpdateData(data)
    })
  }

  window.addEventListener('resize', handleResize)

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault()
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
  window.removeEventListener('resize', handleResize)
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
  margin: 0;
  padding: 0;
  pointer-events: auto;
}

.wallpaper-canvas {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: auto;
  cursor: default;
}
</style>
