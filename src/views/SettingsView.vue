<template>
  <div class="settings-container">
    <header class="page-header">
      <div>
        <h1 class="page-title">设置</h1>
        <p class="page-desc">自定义倒计时壁纸的各项参数</p>
      </div>
      <n-button @click="goBack">
        <template #icon>
          <n-icon><ArrowLeftOutlined /></n-icon>
        </template>
        返回
      </n-button>
    </header>

    <div class="settings-grid">
      <section class="setting-card">
        <h3 class="card-title">
          <n-icon><DesktopOutlined /></n-icon>
          壁纸设置
        </h3>
        <div class="setting-list">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">自动更新壁纸</div>
              <div class="setting-desc">倒计时变化时自动刷新桌面壁纸</div>
            </div>
            <n-switch
              v-model:value="store.settings.autoUpdateWallpaper"
              @update:value="handleAutoUpdateChange"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">壁纸更新间隔</div>
              <div class="setting-desc">壁纸自动刷新的时间间隔</div>
            </div>
            <n-select
              v-model:value="store.settings.wallpaperUpdateInterval"
              :options="intervalOptions"
              style="width: 160px"
              :disabled="!store.settings.autoUpdateWallpaper"
              @update:value="handleUpdateIntervalChange"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">壁纸默认风格</div>
              <div class="setting-desc">新创建倒计时使用的壁纸渲染风格</div>
            </div>
            <n-select
              v-model:value="store.settings.currentWallpaperStyle"
              :options="styleOptions"
              style="width: 160px"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">壁纸自动轮换</div>
              <div class="setting-desc">在多个倒计时之间自动切换壁纸</div>
            </div>
            <n-switch v-model:value="store.settings.autoRotateWallpaper" />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">轮换间隔</div>
              <div class="setting-desc">壁纸轮换的时间间隔</div>
            </div>
            <n-input-number
              v-model:value="store.settings.rotateIntervalMinutes"
              :min="5"
              :max="1440"
              style="width: 140px"
              :disabled="!store.settings.autoRotateWallpaper"
            >
              <template #suffix>分钟</template>
            </n-input-number>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">屏幕分辨率</div>
              <div class="setting-desc">当前检测到的主屏分辨率</div>
            </div>
            <div class="setting-value">
              {{ store.settings.displayWidth }} × {{ store.settings.displayHeight }}
            </div>
          </div>
        </div>
      </section>

      <section class="setting-card">
        <h3 class="card-title">
          <n-icon><BellOutlined /></n-icon>
          提醒设置
        </h3>
        <div class="setting-list">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">弹窗通知</div>
              <div class="setting-desc">倒计时到期时发送系统通知</div>
            </div>
            <n-switch v-model:value="store.settings.notificationEnabled" />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">声音提醒</div>
              <div class="setting-desc">倒计时到期时播放提示音</div>
            </div>
            <n-switch v-model:value="store.settings.soundEnabled" />
          </div>
        </div>
      </section>

      <section class="setting-card">
        <h3 class="card-title">
          <n-icon><SettingOutlined /></n-icon>
          系统设置
        </h3>
        <div class="setting-list">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">开机自启动</div>
              <div class="setting-desc">系统启动时自动运行倒计时壁纸</div>
            </div>
            <n-switch
              v-model:value="autoStart"
              @update:value="handleAutoStartChange"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">启动时显示迷你窗口</div>
              <div class="setting-desc">程序启动后自动打开迷你倒计时窗口</div>
            </div>
            <n-switch v-model:value="store.settings.showMiniOnStartup" />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">迷你窗口</div>
              <div class="setting-desc">打开桌面迷你悬浮窗</div>
            </div>
            <n-button size="small" @click="toggleMini">
              打开迷你窗口
            </n-button>
          </div>
        </div>
      </section>

      <section class="setting-card">
        <h3 class="card-title">
          <n-icon><InfoCircleOutlined /></n-icon>
          关于
        </h3>
        <div class="about-content">
          <div class="about-item">
            <span class="about-label">应用名称</span>
            <span class="about-value">倒计时壁纸</span>
          </div>
          <div class="about-item">
            <span class="about-label">版本</span>
            <span class="about-value">1.0.0</span>
          </div>
          <div class="about-item">
            <span class="about-label">技术栈</span>
            <span class="about-value">Electron + Vue3 + Naive UI</span>
          </div>
          <p class="about-desc">
            简约清新风格的桌面动态倒计时壁纸工具，让每一个重要的日子都充满期待。
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NIcon,
  NSwitch,
  NSelect,
  NInputNumber,
  type SelectOption
} from 'naive-ui'
import {
  ArrowLeftOutlined,
  DesktopOutlined,
  BellOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@vicons/antd'
import { useCountdownStore } from '@/stores/countdown'

const router = useRouter()
const store = useCountdownStore()

const autoStart = ref(false)

const styleOptions: SelectOption[] = [
  { label: '渐变风格', value: 'gradient' },
  { label: '弥散风格', value: 'blur' },
  { label: '极简风格', value: 'minimal' },
  { label: '玻璃风格', value: 'glass' },
  { label: '雅致风格', value: 'elegant' }
]

const intervalOptions: SelectOption[] = [
  { label: '每秒', value: 1000 },
  { label: '每 10 秒', value: 10000 },
  { label: '每 30 秒', value: 30000 },
  { label: '每分钟', value: 60000 },
  { label: '每 5 分钟', value: 300000 }
]

async function handleAutoStartChange(value: boolean) {
  if (window.electronAPI) {
    await window.electronAPI.setLoginSettings(value)
  }
  store.updateSettings({ autoStartOnBoot: value })
}

function handleAutoUpdateChange(value: boolean) {
  if (window.electronAPI) {
    if (value) {
      window.electronAPI.startWallpaperAutoUpdate(store.settings.wallpaperUpdateInterval)
    } else {
      window.electronAPI.stopWallpaperAutoUpdate()
    }
  }
}

function handleUpdateIntervalChange() {
  if (window.electronAPI && store.settings.autoUpdateWallpaper) {
    window.electronAPI.startWallpaperAutoUpdate(store.settings.wallpaperUpdateInterval)
  }
}

function toggleMini() {
  if (window.electronAPI) {
    window.electronAPI.miniWindowShow()
  }
}

function goBack() {
  router.push('/')
}

onMounted(async () => {
  await store.loadData()
  if (window.electronAPI) {
    const settings = await window.electronAPI.getLoginSettings()
    autoStart.value = settings?.openAtLogin || false
  }
})

watch(
  () => [store.settings],
  () => {
    store.saveData()
  },
  { deep: true }
)
</script>

<style lang="scss" scoped>
.settings-container {
  min-height: 100vh;
  background: $color-bg;
  padding: 24px 32px 40px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: $color-text;
  margin-bottom: 4px;
}

.page-desc {
  font-size: 13px;
  color: $color-text-muted;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.setting-card {
  background: $color-bg-card;
  border-radius: $radius-xl;
  padding: 24px;
  box-shadow: $shadow-sm;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: $color-text;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid $color-border;

  :deep(.n-icon) {
    color: $color-primary;
    font-size: 20px;
  }
}

.setting-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.setting-info {
  flex: 1;
  margin-right: 16px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: $color-text;
  margin-bottom: 2px;
}

.setting-desc {
  font-size: 12px;
  color: $color-text-muted;
}

.setting-value {
  font-size: 14px;
  font-weight: 500;
  color: $color-primary-dark;
  font-family: 'SF Mono', 'Monaco', monospace;
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.about-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid $color-border;
}

.about-label {
  font-size: 13px;
  color: $color-text-muted;
}

.about-value {
  font-size: 13px;
  font-weight: 500;
  color: $color-text;
}

.about-desc {
  font-size: 12px;
  color: $color-text-muted;
  line-height: 1.6;
  margin-top: 8px;
}

@media (max-width: 900px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
