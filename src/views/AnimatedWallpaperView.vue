<template>
  <div class="animated-wallpaper" id="animated-wallpaper-root">
    <canvas ref="wallpaperCanvas" class="wallpaper-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { AnimatedWallpaperRenderer } from '@/utils/wallpaperRenderer'
import type { CountdownItem, WallpaperStyle, AnimatedWallpaperConfig } from '@/types'

const wallpaperCanvas = ref<HTMLCanvasElement | null>(null)
let renderer: AnimatedWallpaperRenderer | null = null
let removeDataHandler: (() => void) | null = null

let currentCountdown: CountdownItem | null = null
let currentStyle: WallpaperStyle = 'gradient'
let currentConfig: AnimatedWallpaperConfig | null = null

function initCanvas() {
  if (!wallpaperCanvas.value) return
  const canvas = wallpaperCanvas.value

  const screenWidth = window.innerWidth || window.screen.width
  const screenHeight = window.innerHeight || window.screen.height
  canvas.width = screenWidth
  canvas.height = screenHeight

  const root = document.getElementById('animated-wallpaper-root')
  if (root) {
    root.style.width = screenWidth + 'px'
    root.style.height = screenHeight + 'px'
  }

  renderer = new AnimatedWallpaperRenderer()
  renderer.mount(canvas)
  renderer.start()

  requestData()
}

function requestData() {
  if (window.electronAPI) {
    window.electronAPI.animatedWallpaperRequestData()
      .catch(() => {
        setTimeout(requestData, 1000)
      })
  }
}

function handleUpdateData(data: any) {
  if (data.countdown) currentCountdown = data.countdown
  if (data.style) currentStyle = data.style
  if (data.animatedConfig) currentConfig = data.animatedConfig

  if (renderer && currentCountdown && currentConfig) {
    renderer.updateOptions({
      width: wallpaperCanvas.value?.width || window.innerWidth,
      height: wallpaperCanvas.value?.height || window.innerHeight,
      countdown: currentCountdown,
      style: currentStyle,
      allCountdowns: data.allCountdowns,
      animatedConfig: currentConfig
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

  const root = document.getElementById('animated-wallpaper-root')
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
      allCountdowns: [],
      animatedConfig: currentConfig
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
  if (removeDataHandler) {
    removeDataHandler()
    removeDataHandler = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.animated-wallpaper {
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
  pointer-events: none;
}

.wallpaper-canvas {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}
</style>
