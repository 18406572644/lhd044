<template>
  <div class="home-container">
    <canvas ref="wallpaperCanvas" style="display: none" />

    <header class="app-header">
      <div class="header-left">
        <div class="logo">⏰</div>
        <div>
          <h1 class="app-title">倒计时壁纸</h1>
          <p class="app-subtitle">让每一个重要的日子都充满期待</p>
        </div>
      </div>
      <div class="header-right">
        <n-space>
          <n-button ghost @click="toggleMini">
            <template #icon>
              <n-icon><AppstoreOutlined /></n-icon>
            </template>
            迷你窗口
          </n-button>
          <n-button ghost @click="goHistory">
            <template #icon>
              <n-icon><HistoryOutlined /></n-icon>
            </template>
            历史记录
          </n-button>
          <n-button ghost @click="goSettings">
            <template #icon>
              <n-icon><SettingOutlined /></n-icon>
            </template>
            设置
          </n-button>
          <n-button type="primary" @click="showForm = true">
            <template #icon>
              <n-icon><PlusOutlined /></n-icon>
            </template>
            新建倒计时
          </n-button>
        </n-space>
      </div>
    </header>

    <div class="main-content">
      <section class="preview-section" v-if="store.activeCountdown">
        <div class="section-header">
          <h2>壁纸预览</h2>
          <n-space>
            <n-select
              v-model:value="store.settings.currentWallpaperStyle"
              :options="styleOptions"
              size="small"
              style="width: 140px"
              @update:value="generateAndSetWallpaper"
            />
            <n-button
              size="small"
              :loading="isGenerating"
              @click="generateAndSetWallpaper"
            >
              <template #icon>
                <n-icon><SyncOutlined /></n-icon>
              </template>
              刷新壁纸
            </n-button>
          </n-space>
        </div>
        <div class="preview-wrap">
          <canvas ref="previewCanvas" class="preview-canvas" />
        </div>
      </section>

      <section class="countdown-section">
        <div class="section-header">
          <h2>我的倒计时</h2>
          <span class="count-badge">{{ store.activeCountdowns.length }} 个进行中</span>
        </div>

        <div v-if="store.activeCountdowns.length === 0" class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>还没有倒计时事件</h3>
          <p>点击上方「新建倒计时」按钮开始创建吧</p>
        </div>

        <div v-else class="countdown-grid">
          <CountdownCard
            v-for="cd in store.activeCountdowns"
            :key="cd.id"
            :countdown="cd"
            :is-active="cd.id === store.settings.activeCountdownId"
            @select="handleSelect(cd.id)"
            @edit="handleEdit(cd)"
            @delete="handleDelete(cd.id, cd.title)"
            @wallpaper="handleWallpaper(cd)"
          />
        </div>
      </section>
    </div>

    <CountdownForm
      v-model:show="showForm"
      :editing-item="editingItem"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import {
  NButton,
  NSpace,
  NIcon,
  NSelect,
  type SelectOption
} from 'naive-ui'
import {
  PlusOutlined,
  SettingOutlined,
  HistoryOutlined,
  AppstoreOutlined,
  SyncOutlined
} from '@vicons/antd'
import CountdownCard from '@/components/CountdownCard.vue'
import CountdownForm from '@/components/CountdownForm.vue'
import { useCountdownStore } from '@/stores/countdown'
import { useWallpaper } from '@/composables/useWallpaper'
import { renderWallpaper } from '@/utils/wallpaperRenderer'
import type { CountdownItem, WallpaperStyle } from '@/types'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const store = useCountdownStore()

const { canvas: wallpaperCanvas, isGenerating, generateAndSetWallpaper } = useWallpaper()

const previewCanvas = ref<HTMLCanvasElement | null>(null)
const showForm = ref(false)
const editingItem = ref<CountdownItem | null>(null)

const styleOptions: SelectOption[] = [
  { label: '渐变', value: 'gradient' },
  { label: '弥散', value: 'blur' },
  { label: '极简', value: 'minimal' },
  { label: '玻璃', value: 'glass' },
  { label: '雅致', value: 'elegant' }
]

function updatePreview() {
  if (!previewCanvas.value || !store.activeCountdown) return
  renderWallpaper(previewCanvas.value, {
    width: 960,
    height: 540,
    countdown: store.activeCountdown,
    style: store.settings.currentWallpaperStyle as WallpaperStyle,
    allCountdowns: store.wallpaperCountdowns
  })
}

function handleSelect(id: string) {
  store.setActiveCountdown(id)
  updatePreview()
}

function handleEdit(item: CountdownItem) {
  editingItem.value = item
  showForm.value = true
}

function handleDelete(id: string, title: string) {
  dialog.warning({
    title: '删除倒计时',
    content: `确定要删除「${title}」吗？此操作可在历史记录中恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      store.deleteCountdown(id)
      message.success('已删除')
      setTimeout(updatePreview, 100)
    }
  })
}

function handleWallpaper(item: CountdownItem) {
  store.setActiveCountdown(item.id)
  updatePreview()
  generateAndSetWallpaper()
  message.success(`已将「${item.title}」设为壁纸`)
}

function handleSubmit(item: CountdownItem) {
  if (editingItem.value) {
    store.updateCountdown(item.id, item)
    message.success('已更新')
  } else {
    store.addCountdown(item)
    message.success('已创建')
  }
  editingItem.value = null
  setTimeout(updatePreview, 100)
}

function toggleMini() {
  if (window.electronAPI) {
    window.electronAPI.miniWindowToggle()
  }
}

function goSettings() {
  router.push('/settings')
}

function goHistory() {
  router.push('/history')
}

watch(showForm, (v) => {
  if (!v) editingItem.value = null
})

watch(
  () => [store.settings.activeCountdownId, store.settings.currentWallpaperStyle],
  () => updatePreview()
)

watch(
  () => store.wallpaperCountdowns.length,
  () => updatePreview()
)

onMounted(() => {
  setTimeout(updatePreview, 300)

  setInterval(() => {
    if (document.visibilityState === 'visible') {
      updatePreview()
    }
  }, 1000)
})
</script>

<style lang="scss" scoped>
.home-container {
  min-height: 100vh;
  background: $color-bg;
  padding: 24px 32px 40px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid $color-border;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  font-size: 48px;
  line-height: 1;
}

.app-title {
  font-size: 26px;
  font-weight: 600;
  color: $color-text;
  margin-bottom: 2px;
}

.app-subtitle {
  font-size: 13px;
  color: $color-text-muted;
}

.main-content {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 28px;
  align-items: start;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: $color-text;
  }
}

.count-badge {
  font-size: 12px;
  padding: 4px 12px;
  background: rgba(126, 200, 227, 0.15);
  color: $color-primary-dark;
  border-radius: 999px;
  font-weight: 500;
}

.preview-section,
.countdown-section {
  background: $color-bg-card;
  border-radius: $radius-xl;
  padding: 24px;
  box-shadow: $shadow-sm;
}

.preview-wrap {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: $radius-md;
  overflow: hidden;
  box-shadow: $shadow-md;
}

.preview-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.countdown-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: $color-text-muted;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 500;
  color: $color-text-light;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
}

@media (max-width: 1100px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}
</style>
