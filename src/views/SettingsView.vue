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
              <div class="setting-label">壁纸模式</div>
              <div class="setting-desc">静态模式生成图片设为壁纸；交互模式创建全屏窗口实时渲染</div>
            </div>
            <n-select
              v-model:value="store.settings.wallpaperMode"
              :options="wallpaperModeOptions"
              style="width: 160px"
              @update:value="handleWallpaperModeChange"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">自动更新壁纸</div>
              <div class="setting-desc">倒计时变化时自动刷新桌面壁纸</div>
            </div>
            <n-switch
              v-model:value="store.settings.autoUpdateWallpaper"
              :disabled="store.settings.wallpaperMode === 'interactive' || store.settings.wallpaperMode === 'animated'"
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

      <section class="setting-card" v-if="store.settings.wallpaperMode === 'interactive'">
        <h3 class="card-title">
          <n-icon><BulbOutlined /></n-icon>
          交互壁纸设置
        </h3>
        <div class="setting-list">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">粒子数量</div>
              <div class="setting-desc">壁纸上浮动的粒子数量，影响视觉效果</div>
            </div>
            <n-input-number
              v-model:value="store.settings.interactiveConfig.particles.count"
              :min="10"
              :max="200"
              style="width: 120px"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">粒子速度</div>
              <div class="setting-desc">粒子移动的速度</div>
            </div>
            <n-input-number
              v-model:value="store.settings.interactiveConfig.particles.speed"
              :min="0.1"
              :max="3"
              :step="0.1"
              style="width: 120px"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">鼠标追随效果</div>
              <div class="setting-desc">粒子和光晕跟随鼠标产生流动效果</div>
            </div>
            <n-switch v-model:value="store.settings.interactiveConfig.mouseFollow.enabled" />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">追随影响范围</div>
              <div class="setting-desc">鼠标对粒子的吸引力范围（像素）</div>
            </div>
            <n-input-number
              v-model:value="store.settings.interactiveConfig.mouseFollow.influence"
              :min="50"
              :max="400"
              :step="10"
              style="width: 120px"
              :disabled="!store.settings.interactiveConfig.mouseFollow.enabled"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">光晕效果</div>
              <div class="setting-desc">鼠标周围显示柔和的光晕</div>
            </div>
            <n-switch v-model:value="store.settings.interactiveConfig.glow.enabled" />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">光晕颜色</div>
              <div class="setting-desc">光晕的显示颜色</div>
            </div>
            <input
              type="color"
              v-model="store.settings.interactiveConfig.glow.color"
              class="color-input"
              :disabled="!store.settings.interactiveConfig.glow.enabled"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">点击穿透</div>
              <div class="setting-desc">开启后交互壁纸窗口不接收鼠标事件，可操作桌面</div>
            </div>
            <n-switch
              v-model:value="store.settings.interactiveConfig.clickThrough"
              @update:value="handleClickThroughChange"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">双击打开主窗口</div>
              <div class="setting-desc">在壁纸区域双击可打开主窗口</div>
            </div>
            <n-switch v-model:value="store.settings.interactiveConfig.doubleClickOpenMain" />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">闲置自动展开</div>
              <div class="setting-desc">5秒未操作时自动展开更多信息</div>
            </div>
            <n-switch v-model:value="store.settings.interactiveConfig.idleDetection.enabled" />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">右下角快捷热区</div>
              <div class="setting-desc">壁纸右下角显示可点击的快捷操作区域</div>
            </div>
            <n-switch :value="store.settings.interactiveConfig.hotZones.length > 0" @update:value="handleHotZoneToggle" />
          </div>
        </div>
      </section>

      <section class="setting-card" v-if="store.settings.wallpaperMode === 'animated'">
        <h3 class="card-title">
          <n-icon><PlayCircleOutlined /></n-icon>
          动态壁纸设置
        </h3>
        <div class="setting-list">
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">动画强度</div>
              <div class="setting-desc">调节动画效果的整体强度，影响粒子数量和速度</div>
            </div>
            <n-select
              v-model:value="store.settings.animatedConfig.intensity"
              :options="intensityOptions"
              style="width: 160px"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">帧率限制</div>
              <div class="setting-desc">动态壁纸的渲染帧率，越高越流畅但越占用资源</div>
            </div>
            <n-select
              v-model:value="store.settings.animatedConfig.fpsLimit"
              :options="fpsOptions"
              style="width: 140px"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">数字翻转动画</div>
              <div class="setting-desc">倒计时数字变化时带有平滑的翻牌/滚动效果</div>
            </div>
            <n-switch v-model:value="store.settings.animatedConfig.numberFlip" />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">呼吸光效</div>
              <div class="setting-desc">根据剩余时间紧迫程度，壁纸边缘呈现不同频率的呼吸光效</div>
            </div>
            <n-switch v-model:value="store.settings.animatedConfig.breathingGlow" />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">粒子流动</div>
              <div class="setting-desc">背景有缓慢流动的粒子效果，粒子密度随倒计时主题变化</div>
            </div>
            <n-switch v-model:value="store.settings.animatedConfig.particleFlow" />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">时间进度条</div>
              <div class="setting-desc">壁纸底部显示一条细微的进度条，从创建日期到目标日期</div>
            </div>
            <n-switch v-model:value="store.settings.animatedConfig.progressBar" />
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
          <n-icon><DatabaseOutlined /></n-icon>
          数据管理
        </h3>
        <div class="setting-list">
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-value">{{ statistics.totalCountdowns }}</div>
              <div class="stat-label">总倒计时</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ statistics.activeCountdowns }}</div>
              <div class="stat-label">进行中</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ statistics.historyItems }}</div>
              <div class="stat-label">历史记录</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ statistics.wallpapersWithImage }}</div>
              <div class="stat-label">自定义背景</div>
            </div>
          </div>

          <n-divider style="margin: 4px 0" />

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">导出 JSON 备份</div>
              <div class="setting-desc">导出所有数据为可读的 JSON 格式文件</div>
            </div>
            <n-space>
              <n-button size="small" @click="handleExportJSON">
                <template #icon>
                  <n-icon><ExportOutlined /></n-icon>
                </template>
                导出 JSON
              </n-button>
            </n-space>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">导出加密备份</div>
              <div class="setting-desc">使用密码加密所有数据，安全性更高</div>
            </div>
            <n-button size="small" type="primary" ghost @click="showEncryptExportModal = true">
              <template #icon>
                <n-icon><LockOutlined /></n-icon>
              </template>
              加密导出
            </n-button>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">导入备份</div>
              <div class="setting-desc">从备份文件恢复数据，可选择合并或覆盖</div>
            </div>
            <n-space>
              <n-button size="small" v-if="hasElectron" @click="handleImportWithDialog">
                <template #icon>
                  <n-icon><FolderOpenOutlined /></n-icon>
                </template>
                选择文件
              </n-button>
              <n-button size="small" @click="triggerImportInput">
                <template #icon>
                  <n-icon><ImportOutlined /></n-icon>
                </template>
                导入
              </n-button>
            </n-space>
            <input
              ref="importFileInput"
              type="file"
              accept=".json,.cwbk"
              style="display: none"
              @change="handleImportFileChange"
            />
          </div>

          <n-divider style="margin: 4px 0" />

          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label danger">重置应用</div>
              <div class="setting-desc danger">清除所有数据，恢复到初始状态（此操作不可撤销）</div>
            </div>
            <n-button size="small" type="error" ghost @click="showResetConfirm = true">
              <template #icon>
                <n-icon><DeleteOutlined /></n-icon>
              </template>
              重置
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

    <n-modal
      v-model:show="showEncryptExportModal"
      preset="card"
      title="加密导出备份"
      style="width: 420px"
      :mask-closable="false"
    >
      <n-form :model="encryptForm" label-placement="top">
        <n-form-item label="设置密码">
          <n-input
            v-model:value="encryptForm.password"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
          />
        </n-form-item>
        <n-form-item label="确认密码">
          <n-input
            v-model:value="encryptForm.confirmPassword"
            type="password"
            show-password-on="click"
            placeholder="请再次输入密码"
          />
        </n-form-item>
        <p class="form-tip">请妥善保管密码，密码丢失将无法恢复备份数据</p>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showEncryptExportModal = false">取消</n-button>
          <n-button type="primary" :disabled="isExporting" @click="handleEncryptExport">
            {{ isExporting ? '导出中...' : '确认导出' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showImportModal"
      preset="card"
      title="导入备份"
      style="width: 460px"
      :mask-closable="false"
    >
      <div class="import-info" v-if="importFileInfo">
        <div class="import-file-name">
          <n-icon size="18"><FileOutlined /></n-icon>
          <span>{{ importFileInfo.name }}</span>
        </div>
        <div class="import-file-type">
          类型：{{ importFileInfo.encrypted ? '加密备份' : 'JSON 备份' }}
          <span v-if="importFileInfo.exportedAt"> · 导出时间：{{ importFileInfo.exportedAt }}</span>
        </div>
      </div>
      <n-form :model="importForm" label-placement="top" style="margin-top: 16px">
        <n-form-item label="导入方式">
          <n-radio-group v-model:value="importForm.mode">
            <n-space vertical>
              <n-radio value="merge">
                <span class="radio-title">合并模式</span>
                <span class="radio-desc">将备份中的数据与现有数据合并，不会删除已有内容</span>
              </n-radio>
              <n-radio value="overwrite">
                <span class="radio-title">覆盖模式</span>
                <span class="radio-desc">删除所有现有数据，完全替换为备份中的内容</span>
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="needImportPassword" label="请输入加密密码">
          <n-input
            v-model:value="importForm.password"
            type="password"
            show-password-on="click"
            placeholder="备份文件的解密密码"
          />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="cancelImport">取消</n-button>
          <n-button type="primary" :disabled="isImporting" @click="handleConfirmImport">
            {{ isImporting ? '导入中...' : '确认导入' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showResetConfirm"
      preset="dialog"
      title="确认重置应用"
      positive-text="确认重置"
      negative-text="取消"
      :positive-button-props="{ type: 'error' }"
      @positive-click="handleResetApp"
    >
      <div class="reset-warning">
        <n-icon size="32" color="#f56c6c"><WarningOutlined /></n-icon>
        <p>此操作将删除所有倒计时、历史记录和设置，恢复到初始状态。</p>
        <p class="strong">此操作不可撤销，建议先导出备份！</p>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NIcon,
  NSwitch,
  NSelect,
  NInputNumber,
  NDivider,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSpace,
  NRadioGroup,
  NRadio,
  type SelectOption,
  type MessageReactive
} from 'naive-ui'
import {
  ArrowLeftOutlined,
  DesktopOutlined,
  BellOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
  ExportOutlined,
  ImportOutlined,
  LockOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  FileOutlined,
  WarningOutlined,
  BulbOutlined,
  PlayCircleOutlined
} from '@vicons/antd'
import { useCountdownStore } from '@/stores/countdown'
import { readFileAsText } from '@/utils'
import { useMessage } from 'naive-ui'

const router = useRouter()
const store = useCountdownStore()
const message = useMessage()

const hasElectron = computed(() => typeof window !== 'undefined' && !!(window as any).electronAPI)

const autoStart = ref(false)

const statistics = reactive({
  totalCountdowns: 0,
  activeCountdowns: 0,
  expiredCountdowns: 0,
  historyItems: 0,
  wallpapersWithImage: 0
})

async function updateStatistics() {
  const stats = await store.getStatistics()
  Object.assign(statistics, stats)
}

const styleOptions: SelectOption[] = [
  { label: '渐变风格', value: 'gradient' },
  { label: '弥散风格', value: 'blur' },
  { label: '极简风格', value: 'minimal' },
  { label: '玻璃风格', value: 'glass' },
  { label: '雅致风格', value: 'elegant' }
]

const wallpaperModeOptions: SelectOption[] = [
  { label: '静态壁纸', value: 'static' },
  { label: '动态壁纸', value: 'animated' },
  { label: '交互壁纸', value: 'interactive' }
]

const intervalOptions: SelectOption[] = [
  { label: '每秒', value: 1000 },
  { label: '每 10 秒', value: 10000 },
  { label: '每 30 秒', value: 30000 },
  { label: '每分钟', value: 60000 },
  { label: '每 5 分钟', value: 300000 }
]

const showEncryptExportModal = ref(false)
const encryptForm = reactive({
  password: '',
  confirmPassword: ''
})
const isExporting = ref(false)

const showImportModal = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)
const pendingImportContent = ref<string | null>(null)
const importFileInfo = ref<{ name: string; encrypted: boolean; exportedAt?: string } | null>(null)
const needImportPassword = ref(false)
const importForm = reactive({
  mode: 'merge' as 'merge' | 'overwrite',
  password: ''
})
const isImporting = ref(false)

const showResetConfirm = ref(false)

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

const intensityOptions: SelectOption[] = [
  { label: '低（节能）', value: 'low' },
  { label: '中（推荐）', value: 'medium' },
  { label: '高（华丽）', value: 'high' }
]

const fpsOptions: SelectOption[] = [
  { label: '15 FPS', value: 15 },
  { label: '18 FPS', value: 18 },
  { label: '20 FPS', value: 20 },
  { label: '24 FPS', value: 24 },
  { label: '30 FPS', value: 30 }
]

function handleWallpaperModeChange(mode: 'static' | 'interactive' | 'animated') {
  store.updateSettings({ wallpaperMode: mode })
  if (mode === 'interactive') {
    window.electronAPI?.animatedWallpaperClose()
    window.electronAPI?.interactiveWallpaperShow()
  } else if (mode === 'animated') {
    window.electronAPI?.interactiveWallpaperClose()
    window.electronAPI?.animatedWallpaperShow()
  } else {
    window.electronAPI?.interactiveWallpaperClose()
    window.electronAPI?.animatedWallpaperClose()
  }
}

async function handleClickThroughChange(clickThrough: boolean) {
  if (window.electronAPI) {
    await window.electronAPI.interactiveWallpaperSetClickThrough(clickThrough)
  }
}

function handleHotZoneToggle(enabled: boolean) {
  if (enabled) {
    store.settings.interactiveConfig.hotZones = [
      {
        id: 'hz-new',
        position: 'bottom-right',
        size: 80,
        action: 'new-countdown',
        label: '新建倒计时',
        icon: '➕'
      }
    ]
  } else {
    store.settings.interactiveConfig.hotZones = []
  }
  store.saveData()
}

function goBack() {
  router.push('/')
}

async function handleExportJSON() {
  const useDialog = !!window.electronAPI
  const success = await store.exportDataJSON(useDialog)
  if (success) {
    message.success('JSON 备份导出成功')
  } else {
    message.error('导出失败，请重试')
  }
}

async function handleEncryptExport() {
  if (!encryptForm.password) {
    message.warning('请输入密码')
    return
  }
  if (encryptForm.password.length < 4) {
    message.warning('密码至少 4 位')
    return
  }
  if (encryptForm.password !== encryptForm.confirmPassword) {
    message.warning('两次输入的密码不一致')
    return
  }

  isExporting.value = true
  try {
    const useDialog = !!window.electronAPI
    const success = await store.exportDataEncrypted(encryptForm.password, useDialog)
    if (success) {
      message.success('加密备份导出成功')
      showEncryptExportModal.value = false
      encryptForm.password = ''
      encryptForm.confirmPassword = ''
    } else {
      message.error('导出失败，请重试')
    }
  } catch (e) {
    message.error('加密过程出错')
  } finally {
    isExporting.value = false
  }
}

function triggerImportInput() {
  importFileInput.value?.click()
}

async function handleImportFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    await processImportFile(file.name, await readFileAsText(file))
  }
  input.value = ''
}

async function handleImportWithDialog() {
  if (!window.electronAPI) return
  const content = await window.electronAPI.openBackupFile()
  if (content) {
    await processImportFile('备份文件', content)
  }
}

async function processImportFile(fileName: string, content: string) {
  pendingImportContent.value = content

  let parsed: any = null
  let encrypted = false
  let exportedAt: string | undefined

  try {
    parsed = JSON.parse(content)
    encrypted = parsed?.encrypted === true
    if (parsed?.exportedAt) {
      exportedAt = new Date(parsed.exportedAt).toLocaleString('zh-CN')
    }
  } catch {
    message.error('文件格式无效，无法解析')
    return
  }

  importFileInfo.value = {
    name: fileName,
    encrypted,
    exportedAt
  }
  needImportPassword.value = encrypted
  importForm.mode = 'merge'
  importForm.password = ''
  showImportModal.value = true
}

function cancelImport() {
  showImportModal.value = false
  pendingImportContent.value = null
  importFileInfo.value = null
  needImportPassword.value = false
}

async function handleConfirmImport() {
  if (!pendingImportContent.value) return

  isImporting.value = true
  try {
    const result = await store.importData(
      pendingImportContent.value,
      importForm.mode,
      needImportPassword.value ? importForm.password : undefined
    )

    if (result.success) {
      message.success(`导入成功${result.encrypted ? '（已解密）' : ''}`)
      await updateStatistics()
      cancelImport()
    } else if (result.needPassword) {
      message.warning('请输入密码')
    } else if (result.error) {
      message.error(result.error)
    } else {
      message.error('导入失败')
    }
  } catch (e: any) {
    message.error(e.message || '导入失败')
  } finally {
    isImporting.value = false
  }
}

function handleResetApp() {
  store.resetApp()
  updateStatistics()
  message.success('应用已重置')
}

onMounted(async () => {
  await store.loadData()
  await updateStatistics()
  if (window.electronAPI) {
    const settings = await window.electronAPI.getLoginSettings()
    autoStart.value = settings?.openAtLogin || false
  }
})

watch(
  () => [store.countdowns.length, store.history.length],
  () => {
    updateStatistics()
  }
)

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

  .setting-label.danger {
    color: #f56c6c;
  }
  .setting-desc.danger {
    color: #f56c6c;
    opacity: 0.85;
  }
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

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 12px 0 4px;
}

.stat-item {
  text-align: center;
  padding: 12px 8px;
  background: $color-bg;
  border-radius: $radius-md;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: $color-primary;
  font-family: 'SF Mono', 'Monaco', monospace;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  color: $color-text-muted;
}

.form-tip {
  font-size: 12px;
  color: $color-text-muted;
  margin: 0;
  padding: 4px 0;
}

.import-info {
  padding: 12px;
  background: $color-bg;
  border-radius: $radius-md;
  margin-bottom: 8px;
}

.import-file-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: $color-text;
  margin-bottom: 4px;

  :deep(.n-icon) {
    color: $color-primary;
  }
}

.import-file-type {
  font-size: 12px;
  color: $color-text-muted;
  padding-left: 26px;
}

.radio-title {
  display: inline-block;
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 2px;
}

.radio-desc {
  display: block;
  font-size: 12px;
  color: $color-text-muted;
  padding-left: 24px;
  margin-top: -2px;
}

.reset-warning {
  text-align: center;
  padding: 12px;

  :deep(.n-icon) {
    margin-bottom: 12px;
  }

  p {
    margin: 8px 0;
    color: $color-text;
    font-size: 14px;
  }

  p.strong {
    font-weight: 600;
    color: #f56c6c;
  }
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

.color-input {
  width: 40px;
  height: 32px;
  border: 2px solid $color-border;
  border-radius: $radius-sm;
  padding: 2px;
  cursor: pointer;
  background: transparent;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@media (max-width: 900px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
