<template>
  <div
    id="interactive-wallpaper-root"
    class="interactive-wallpaper"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
    @dblclick="handleDoubleClick"
  >
    <canvas ref="wallpaperCanvas" class="wallpaper-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { InteractiveWallpaperRenderer } from '@/utils/interactiveWallpaperRenderer'
import type {
  CountdownItem,
  WallpaperStyle,
  AnimatedWallpaperConfig,
  InteractiveWallpaperConfig,
  HotCornerArea
} from '@/types'

const wallpaperCanvas = ref<HTMLCanvasElement | null>(null)
let renderer: InteractiveWallpaperRenderer | null = null
let removeDataHandler: (() => void) | null = null
let removeVisibilityHandler: (() => void) | null = null

let currentCountdown: CountdownItem | null = null
let currentStyle: WallpaperStyle = 'gradient'
let currentAnimatedConfig: AnimatedWallpaperConfig | null = null
let currentInteractiveConfig: InteractiveWallpaperConfig | null = null
let allCountdowns: CountdownItem[] = []

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

  renderer = new InteractiveWallpaperRenderer()
  renderer.mount(canvas)

  renderer.setHooks({
    onCountdownClick: handleCountdownClick,
    onDoubleClick: handleRendererDoubleClick,
    onHotCorner: handleHotCorner,
    onIdleEnter: () => {},
    onIdleLeave: () => {}
  })

  renderer.start()
  requestData()
}

function requestData() {
  if (window.electronAPI) {
    window.electronAPI.animatedWallpaperRequestData()
      .then((data) => {
        if (data) {
          handleUpdateData(data)
        } else {
          setTimeout(requestData, 1000)
        }
      })
      .catch(() => {
        setTimeout(requestData, 1000)
      })
  }
}

function handleUpdateData(data: any) {
  if (data.countdown) currentCountdown = data.countdown
  if (data.style) currentStyle = data.style
  if (data.animatedConfig) currentAnimatedConfig = data.animatedConfig
  if (data.interactiveConfig) currentInteractiveConfig = data.interactiveConfig
  if (data.allCountdowns) allCountdowns = data.allCountdowns

  if (renderer && currentCountdown && currentAnimatedConfig && currentInteractiveConfig) {
    renderer.updateOptions({
      width: wallpaperCanvas.value?.width || window.innerWidth,
      height: wallpaperCanvas.value?.height || window.innerHeight,
      countdown: currentCountdown,
      style: currentStyle,
      allCountdowns,
      animatedConfig: currentAnimatedConfig,
      interactiveConfig: currentInteractiveConfig
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

  if (currentCountdown && currentAnimatedConfig && currentInteractiveConfig) {
    renderer.updateOptions({
      width: screenWidth,
      height: screenHeight,
      countdown: currentCountdown,
      style: currentStyle,
      allCountdowns,
      animatedConfig: currentAnimatedConfig,
      interactiveConfig: currentInteractiveConfig
    })
  }
}

function handleMouseMove(e: MouseEvent) {
  if (renderer) {
    renderer.setMousePosition(e.clientX, e.clientY)
  }
}

function handleMouseLeave() {
  if (renderer) {
    renderer.setMousePosition(-1000, -1000)
  }
}

function handleClick(e: MouseEvent) {
  if (renderer) {
    renderer.handleClick(e.clientX, e.clientY)
  }
}

function handleDoubleClick() {
  if (window.electronAPI) {
    window.electronAPI.showMainWindow()
  }
}

function handleRendererDoubleClick() {
  if (window.electronAPI) {
    window.electronAPI.showMainWindow()
  }
}

function handleCountdownClick() {
  if (window.electronAPI) {
    window.electronAPI.cycleCountdown()
  }
}

function handleHotCorner(area: HotCornerArea) {
  switch (area) {
    case 'top-left':
      if (window.electronAPI) {
        window.electronAPI.showMainWindow()
      }
      break
    case 'top-right':
      if (window.electronAPI) {
        window.electronAPI.setWallpaperClickThrough(true)
        setTimeout(() => {
          window.electronAPI.setWallpaperMode('static')
        }, 300)
      }
      break
    case 'bottom-left':
      if (window.electronAPI) {
        window.electronAPI.miniWindowToggle()
      }
      break
    case 'bottom-right':
      if (window.electronAPI) {
        window.electronAPI.newCountdown()
      }
      break
  }
}

function handleVisibilityChange() {
  if (renderer) {
    renderer.setVisible(!document.hidden)
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
  document.addEventListener('visibilitychange', handleVisibilityChange)

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
  document.removeEventListener('visibilitychange', handleVisibilityChange)
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
  z-index: 0;
  margin: 0;
  padding: 0;
  user-select: none;
  -webkit-user-select: none;
}

.wallpaper-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: default;
}
</style>
