<template>
  <div
    class="countdown-card"
    :class="{ active: isActive, expired: countdown.expired }"
    :style="cardStyle"
    @click="$emit('select')"
  >
    <div class="card-header">
      <div class="card-emoji">{{ countdown.emoji || '📅' }}</div>
      <div class="card-title-wrap">
        <div class="card-title">{{ countdown.title }}</div>
        <div class="card-date">{{ formatDate(countdown.targetDate) }}</div>
      </div>
    </div>
    <div class="card-countdown">
      <div class="days">{{ diff.isPast ? `+${diff.days}` : diff.days }}</div>
      <div class="days-label">天</div>
    </div>
    <div class="card-time">
      {{ padZero(diff.hours) }} : {{ padZero(diff.minutes) }} : {{ padZero(diff.seconds) }}
    </div>
    <div v-if="countdown.description" class="card-desc">{{ countdown.description }}</div>
    <div class="card-actions" @click.stop>
      <n-button
        size="tiny"
        quaternary
        @click="$emit('edit')"
      >
        <template #icon>
          <n-icon><EditOutlined /></n-icon>
        </template>
      </n-button>
      <n-button
        size="tiny"
        quaternary
        @click="$emit('wallpaper')"
      >
        <template #icon>
          <n-icon><PictureOutlined /></n-icon>
        </template>
      </n-button>
      <n-button
        size="tiny"
        quaternary
        @click="$emit('delete')"
      >
        <template #icon>
          <n-icon><DeleteOutlined /></n-icon>
        </template>
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { NButton, NIcon } from 'naive-ui'
import { EditOutlined, PictureOutlined, DeleteOutlined } from '@vicons/antd'
import type { CountdownItem, CountdownDiff } from '@/types'
import { calculateDiff, formatDate, padZero } from '@/utils'

const props = defineProps<{
  countdown: CountdownItem
  isActive?: boolean
}>()

defineEmits<{
  select: []
  edit: []
  delete: []
  wallpaper: []
}>()

const diff = ref<CountdownDiff>(calculateDiff(props.countdown.targetDate))
let timer: number | null = null

const cardStyle = computed(() => ({
  background: `linear-gradient(135deg, ${props.countdown.bgGradientFrom} 0%, ${props.countdown.bgGradientTo} 100%)`,
  '--accent-color': props.countdown.color
}))

onMounted(() => {
  timer = window.setInterval(() => {
    diff.value = calculateDiff(props.countdown.targetDate)
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.countdown-card {
  position: relative;
  border-radius: $radius-lg;
  padding: 24px;
  cursor: pointer;
  transition: all $transition-normal;
  box-shadow: $shadow-sm;
  overflow: hidden;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  color: v-bind('props.countdown.textColor');
  border: 2px solid transparent;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-md;
  }

  &.active {
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: $shadow-lg;
  }

  &.expired {
    opacity: 0.7;
    filter: grayscale(0.3);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.card-emoji {
  font-size: 36px;
  line-height: 1;
}

.card-title-wrap {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-date {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 2px;
}

.card-countdown {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
  position: relative;
  z-index: 1;
}

.days {
  font-size: 56px;
  font-weight: 200;
  line-height: 1;
  letter-spacing: -2px;
}

.days-label {
  font-size: 16px;
  opacity: 0.85;
}

.card-time {
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 2px;
  margin-bottom: 8px;
  font-family: 'SF Mono', 'Monaco', monospace;
  position: relative;
  z-index: 1;
  opacity: 0.9;
}

.card-desc {
  font-size: 13px;
  opacity: 0.75;
  line-height: 1.5;
  flex: 1;
  position: relative;
  z-index: 1;
}

.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity $transition-fast;
  z-index: 2;

  :deep(.n-button) {
    color: inherit;
  }
}

.countdown-card:hover .card-actions {
  opacity: 1;
}
</style>
