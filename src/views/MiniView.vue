<template>
  <div
    class="mini-container"
    :style="containerStyle"
    @mousedown="startDrag"
  >
    <div class="mini-header">
      <div class="mini-title" @click.stop>
        <span v-if="current?.emoji">{{ current.emoji }}</span>
        <span class="title-text">{{ current?.title || '暂无倒计时' }}</span>
      </div>
      <div class="mini-actions" @mousedown.stop>
        <n-button
          quaternary
          size="tiny"
          @click="prevCountdown"
          :disabled="list.length <= 1"
        >
          <template #icon>
            <n-icon><LeftOutlined /></n-icon>
          </template>
        </n-button>
        <n-button
          quaternary
          size="tiny"
          @click="nextCountdown"
          :disabled="list.length <= 1"
        >
          <template #icon>
            <n-icon><RightOutlined /></n-icon>
          </template>
        </n-button>
        <n-button
          quaternary
          size="tiny"
          @click="openMain"
        >
          <template #icon>
            <n-icon><ExpandOutlined /></n-icon>
          </template>
        </n-button>
        <n-button
          quaternary
          size="tiny"
          @click="closeMini"
        >
          <template #icon>
            <n-icon><CloseOutlined /></n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <div v-if="current" class="mini-body">
      <div class="mini-countdown">
        <div class="mini-days">{{ diff.isPast ? `+${diff.days}` : diff.days }}</div>
        <div class="mini-unit">天</div>
      </div>
      <div class="mini-time">
        {{ padZero(diff.hours) }} : {{ padZero(diff.minutes) }} : {{ padZero(diff.seconds) }}
      </div>
      <div class="mini-date">{{ formatDate(current.targetDate) }}</div>
      <div v-if="current.description" class="mini-desc">{{ current.description }}</div>
    </div>

    <div v-else class="mini-empty">
      <div class="empty-icon">📅</div>
      <div>暂无进行中的倒计时</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { NButton, NIcon } from 'naive-ui'
import { LeftOutlined, RightOutlined, ExpandOutlined, CloseOutlined } from '@vicons/antd'
import { useCountdownStore } from '@/stores/countdown'
import { calculateDiff, formatDate, padZero } from '@/utils'
import type { CountdownDiff } from '@/types'

const store = useCountdownStore()
const currentIndex = ref(0)

const list = computed(() => store.miniCountdowns)

const current = computed(() => list.value[currentIndex.value] || null)

const diff = ref<CountdownDiff>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isPast: false })
let timer: number | null = null
let removeDataUpdated: (() => void) | null = null

const containerStyle = computed(() => {
  if (current.value) {
    return {
      background: `linear-gradient(135deg, ${current.value.bgGradientFrom} 0%, ${current.value.bgGradientTo} 100%)`,
      color: current.value.textColor
    }
  }
  return {
    background: 'linear-gradient(135deg, #a8dcf0 0%, #ffd1da 100%)',
    color: '#fff'
  }
})

function updateDiff() {
  if (current.value) {
    diff.value = calculateDiff(current.value.targetDate)
  }
}

function prevCountdown() {
  if (list.value.length > 1) {
    currentIndex.value = (currentIndex.value - 1 + list.value.length) % list.value.length
  }
}

function nextCountdown() {
  if (list.value.length > 1) {
    currentIndex.value = (currentIndex.value + 1) % list.value.length
  }
}

function openMain() {
  if (window.electronAPI) {
    window.electronAPI.mainWindowShow()
  }
}

function closeMini() {
  if (window.electronAPI) {
    window.electronAPI.miniWindowClose()
  }
}

function startDrag(_e: MouseEvent) {
}

async function reloadData() {
  await store.loadData()
  const idx = list.value.findIndex((c) => c.id === store.settings.activeCountdownId)
  if (idx >= 0) {
    currentIndex.value = idx
  } else if (currentIndex.value >= list.value.length) {
    currentIndex.value = Math.max(0, list.value.length - 1)
  }
  updateDiff()
}

watch(
  () => list.value.length,
  (len) => {
    if (currentIndex.value >= len) {
      currentIndex.value = Math.max(0, len - 1)
    }
  }
)

watch(
  () => store.settings.activeCountdownId,
  (id) => {
    const idx = list.value.findIndex((c) => c.id === id)
    if (idx >= 0) currentIndex.value = idx
  }
)

watch(current, () => {
  updateDiff()
})

onMounted(async () => {
  document.documentElement.classList.add('mini-mode')

  await store.loadData()
  const idx = list.value.findIndex((c) => c.id === store.settings.activeCountdownId)
  if (idx >= 0) currentIndex.value = idx
  updateDiff()

  if (window.electronAPI) {
    removeDataUpdated = window.electronAPI.onWallpaperUpdateData(() => {
      reloadData()
    })
  }

  timer = window.setInterval(updateDiff, 1000)
})

onUnmounted(() => {
  document.documentElement.classList.remove('mini-mode')
  if (timer) clearInterval(timer)
  if (removeDataUpdated) removeDataUpdated()
})
</script>

<style lang="scss" scoped>
.mini-container {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  user-select: none;
  backdrop-filter: blur(10px);
  -webkit-app-region: drag;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -30%;
    right: -30%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
    pointer-events: none;
  }
}

.mini-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  position: relative;
  z-index: 1;
}

.mini-title {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.95;
  -webkit-app-region: drag;
}

.title-text {
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-actions {
  display: flex;
  gap: 2px;
  -webkit-app-region: no-drag;

  :deep(.n-button) {
    color: inherit;
    padding: 0 4px;
    min-width: 28px;
    height: 28px;
  }
}

.mini-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  position: relative;
  z-index: 1;
}

.mini-countdown {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.mini-days {
  font-size: 52px;
  font-weight: 200;
  line-height: 1;
  letter-spacing: -2px;
}

.mini-unit {
  font-size: 16px;
  opacity: 0.85;
}

.mini-time {
  font-size: 16px;
  font-family: 'SF Mono', 'Monaco', monospace;
  letter-spacing: 2px;
  opacity: 0.9;
}

.mini-date {
  font-size: 12px;
  opacity: 0.75;
  margin-top: 4px;
}

.mini-desc {
  font-size: 11px;
  opacity: 0.65;
  margin-top: 2px;
  max-width: 250px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mini-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  opacity: 0.8;
  position: relative;
  z-index: 1;
}

.empty-icon {
  font-size: 32px;
}
</style>
