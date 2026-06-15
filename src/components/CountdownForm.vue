<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    :title="editing ? '编辑倒计时' : '新建倒计时'"
    style="width: 620px; max-width: 90vw"
    :mask-closable="false"
    @update:show="(v) => !v && $emit('update:show', v)"
  >
    <n-tabs type="line" animated>
      <n-tab-pane name="basic" tab="基础信息">
        <n-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          label-placement="left"
          label-width="100px"
          require-mark-placement="right-hanging"
        >
          <n-form-item label="标题" path="title">
            <n-input v-model:value="formData.title" placeholder="给倒计时起个名字" maxlength="30" />
          </n-form-item>

          <n-form-item label="日期" path="targetDate">
            <n-date-picker v-model:value="formData.targetDate" type="date" style="width: 100%" />
          </n-form-item>

          <n-form-item label="图标">
            <n-select
              v-model:value="formData.emoji"
              :options="emojiOptions"
              filterable
              style="width: 100%"
            />
          </n-form-item>

          <n-form-item label="描述">
            <n-input
              v-model:value="formData.description"
              type="textarea"
              placeholder="添加一些描述...（可选）"
              :autosize="{ minRows: 2, maxRows: 4 }"
              maxlength="100"
            />
          </n-form-item>

          <n-form-item label="字号大小">
            <n-slider
              v-model:value="formData.fontSize"
              :min="60"
              :max="200"
              :step="10"
              :marks="{ 60: '小', 120: '中', 200: '大' }"
            />
          </n-form-item>

          <n-form-item label="显示选项">
            <n-space vertical>
              <n-checkbox v-model:checked="formData.showOnWallpaper">显示在壁纸上</n-checkbox>
              <n-checkbox v-model:checked="formData.showOnMini">显示在迷你窗口</n-checkbox>
              <n-checkbox v-model:checked="formData.notifyOnExpire">到期弹窗提醒</n-checkbox>
              <n-checkbox v-model:checked="formData.soundOnExpire">到期声音提醒</n-checkbox>
            </n-space>
          </n-form-item>
        </n-form>
      </n-tab-pane>

      <n-tab-pane name="appearance" tab="外观设置">
        <n-form
          :model="formData"
          label-placement="left"
          label-width="100px"
        >
          <n-form-item label="配色方案">
            <n-radio-group v-model:value="presetIndex">
              <div class="preset-grid">
                <div
                  v-for="(preset, idx) in presets"
                  :key="idx"
                  class="preset-item"
                  :class="{ active: presetIndex === idx }"
                  :style="{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }"
                  @click="selectPreset(idx)"
                >
                  <span>{{ preset.name }}</span>
                </div>
              </div>
            </n-radio-group>
          </n-form-item>

          <n-form-item label="文字颜色">
            <n-color-picker
              v-model:value="formData.textColor"
              :modes="['hex']"
              :show-alpha="false"
            />
          </n-form-item>

          <n-divider>自定义背景图</n-divider>

          <n-form-item label="背景图片">
            <div class="bg-image-section">
              <div
                v-if="formData.backgroundImage"
                class="bg-image-preview"
                :style="{ backgroundImage: `url(${formData.backgroundImage})` }"
              >
                <n-button size="small" type="error" ghost @click="clearBackgroundImage">
                  移除图片
                </n-button>
              </div>
              <n-space>
                <n-button size="small" @click="triggerFileInput">
                  <template #icon>
                    <n-icon><CloudUploadOutlined /></n-icon>
                  </template>
                  上传图片
                </n-button>
                <n-button
                  size="small"
                  v-if="hasElectron"
                  @click="selectImageWithDialog"
                >
                  <template #icon>
                    <n-icon><FolderOpenOutlined /></n-icon>
                  </template>
                  从文件选择
                </n-button>
              </n-space>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                style="display: none"
                @change="handleFileSelect"
              />
            </div>
          </n-form-item>

          <n-form-item v-if="formData.backgroundImage" label="滤镜效果">
            <n-select
              v-model:value="filterType"
              :options="filterOptions"
              style="width: 100%"
              @update:value="handleFilterChange"
            />
          </n-form-item>

          <n-form-item
            v-if="formData.backgroundImage && formData.backgroundFilter && formData.backgroundFilter.type !== 'none'"
            label="滤镜参数"
          >
            <n-space vertical style="width: 100%">
              <div v-if="formData.backgroundFilter.blur !== undefined" class="filter-param">
                <span class="param-label">模糊</span>
                <n-slider
                  v-model:value="formData.backgroundFilter.blur"
                  :min="0"
                  :max="30"
                  :step="1"
                  style="flex: 1"
                />
                <span class="param-value">{{ formData.backgroundFilter.blur }}px</span>
              </div>
              <div v-if="formData.backgroundFilter.brightness !== undefined" class="filter-param">
                <span class="param-label">亮度</span>
                <n-slider
                  v-model:value="formData.backgroundFilter.brightness"
                  :min="0.1"
                  :max="2"
                  :step="0.05"
                  style="flex: 1"
                />
                <span class="param-value">{{ Math.round(formData.backgroundFilter.brightness * 100) }}%</span>
              </div>
              <div v-if="formData.backgroundFilter.contrast !== undefined" class="filter-param">
                <span class="param-label">对比度</span>
                <n-slider
                  v-model:value="formData.backgroundFilter.contrast"
                  :min="0.1"
                  :max="2"
                  :step="0.05"
                  style="flex: 1"
                />
                <span class="param-value">{{ Math.round(formData.backgroundFilter.contrast * 100) }}%</span>
              </div>
              <div v-if="formData.backgroundFilter.grayscale !== undefined" class="filter-param">
                <span class="param-label">黑白</span>
                <n-slider
                  v-model:value="formData.backgroundFilter.grayscale"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  style="flex: 1"
                />
                <span class="param-value">{{ Math.round(formData.backgroundFilter.grayscale * 100) }}%</span>
              </div>
              <div v-if="formData.backgroundFilter.sepia !== undefined" class="filter-param">
                <span class="param-label">复古</span>
                <n-slider
                  v-model:value="formData.backgroundFilter.sepia"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  style="flex: 1"
                />
                <span class="param-value">{{ Math.round(formData.backgroundFilter.sepia * 100) }}%</span>
              </div>
              <div v-if="formData.backgroundFilter.saturate !== undefined" class="filter-param">
                <span class="param-label">饱和度</span>
                <n-slider
                  v-model:value="formData.backgroundFilter.saturate"
                  :min="0"
                  :max="3"
                  :step="0.1"
                  style="flex: 1"
                />
                <span class="param-value">{{ Math.round(formData.backgroundFilter.saturate * 100) }}%</span>
              </div>
            </n-space>
          </n-form-item>

          <n-form-item v-if="formData.backgroundImage" label="遮罩设置">
            <n-space vertical style="width: 100%">
              <div class="overlay-row">
                <span class="param-label">遮罩颜色</span>
                <n-color-picker
                  v-model:value="formData.overlayColor"
                  :modes="['hex']"
                  :show-alpha="false"
                />
              </div>
              <div class="filter-param">
                <span class="param-label">遮罩透明度</span>
                <n-slider
                  v-model:value="formData.overlayOpacity"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  style="flex: 1"
                />
                <span class="param-value">{{ Math.round((formData.overlayOpacity || 0) * 100) }}%</span>
              </div>
              <div class="overlay-tip">
                提示：设置合适的遮罩透明度可以确保文字在图片上清晰可读
              </div>
            </n-space>
          </n-form-item>
        </n-form>
      </n-tab-pane>
    </n-tabs>

    <template #footer>
      <n-space justify="end">
        <n-button @click="$emit('update:show', false)">取消</n-button>
        <n-button type="primary" @click="handleSubmit">确定</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NDatePicker,
  NSelect,
  NRadioGroup,
  NSlider,
  NCheckbox,
  NSpace,
  NButton,
  NTabs,
  NTabPane,
  NDivider,
  NIcon,
  NColorPicker,
  type FormInst,
  type FormRules,
  type SelectOption
} from 'naive-ui'
import { CloudUploadOutlined, FolderOpenOutlined } from '@vicons/antd'
import type { CountdownItem, WallpaperFilterType } from '@/types'
import { DEFAULT_COLOR_PRESETS, generateId, createDefaultCountdown } from '@/utils'
import { getDefaultFilter } from '@/utils/wallpaperRenderer'
import dayjs from 'dayjs'

const props = defineProps<{
  show: boolean
  editingItem?: CountdownItem | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  submit: [item: CountdownItem]
}>()

const visible = computed({
  get: () => props.show,
  set: (v) => emit('update:show', v)
})

const hasElectron = computed(() => typeof window !== 'undefined' && !!(window as any).electronAPI)

const editing = computed(() => !!props.editingItem)
const formRef = ref<FormInst | null>(null)
const presetIndex = ref(0)
const fileInputRef = ref<HTMLInputElement | null>(null)

const filterType = ref<WallpaperFilterType>('none')

const presets = DEFAULT_COLOR_PRESETS

const emojiOptions: SelectOption[] = [
  { label: '🎉 庆祝', value: '🎉' },
  { label: '🎂 生日', value: '🎂' },
  { label: '💝 纪念日', value: '💝' },
  { label: '🎓 毕业', value: '🎓' },
  { label: '💼 工作', value: '💼' },
  { label: '✈️ 旅行', value: '✈️' },
  { label: '🏠 搬家', value: '🏠' },
  { label: '🎄 节日', value: '🎄' },
  { label: '🎯 目标', value: '🎯' },
  { label: '📚 学习', value: '📚' },
  { label: '💪 健身', value: '💪' },
  { label: '🌸 春天', value: '🌸' },
  { label: '☀️ 夏天', value: '☀️' },
  { label: '🍂 秋天', value: '🍂' },
  { label: '❄️ 冬天', value: '❄️' },
  { label: '📅 日期', value: '📅' }
]

const filterOptions: SelectOption[] = [
  { label: '无滤镜', value: 'none' },
  { label: '模糊', value: 'blur' },
  { label: '提亮', value: 'brightness' },
  { label: '高对比', value: 'contrast' },
  { label: '黑白', value: 'grayscale' },
  { label: '怀旧', value: 'sepia' },
  { label: '复古', value: 'vintage' },
  { label: '冷色调', value: 'cool' },
  { label: '暖色调', value: 'warm' }
]

const defaultData = (): any => ({
  ...createDefaultCountdown(),
  targetDate: dayjs().add(7, 'day').valueOf(),
  backgroundFilter: { type: 'none' as WallpaperFilterType },
  overlayColor: '#000000',
  overlayOpacity: 0.3
})

const formData = ref<any>(defaultData())

const rules: FormRules = {
  title: {
    required: true,
    message: '请输入标题',
    trigger: 'blur'
  },
  targetDate: {
    required: true,
    message: '请选择日期',
    trigger: 'change',
    type: 'number'
  }
}

function selectPreset(idx: number) {
  presetIndex.value = idx
  formData.value.bgGradientFrom = presets[idx].from
  formData.value.bgGradientTo = presets[idx].to
  formData.value.color = presets[idx].color
  formData.value.textColor = presets[idx].text
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    loadImageFile(file)
  }
}

function loadImageFile(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    if (result) {
      formData.value.backgroundImage = result
      if (!formData.value.backgroundFilter || formData.value.backgroundFilter.type === 'none') {
        filterType.value = 'blur'
        formData.value.backgroundFilter = getDefaultFilter('blur')
      }
    }
  }
  reader.readAsDataURL(file)
}

async function selectImageWithDialog() {
  if (!window.electronAPI) return
  try {
    const result = await window.electronAPI.selectImageFile()
    if (result) {
      formData.value.backgroundImage = result
      if (!formData.value.backgroundFilter || formData.value.backgroundFilter.type === 'none') {
        filterType.value = 'blur'
        formData.value.backgroundFilter = getDefaultFilter('blur')
      }
    }
  } catch (e) {
    console.error('Failed to select image:', e)
  }
}

function clearBackgroundImage() {
  formData.value.backgroundImage = undefined
  filterType.value = 'none'
  formData.value.backgroundFilter = { type: 'none' as WallpaperFilterType }
}

function handleFilterChange(type: WallpaperFilterType) {
  filterType.value = type
  formData.value.backgroundFilter = getDefaultFilter(type)
}

watch(
  () => props.show,
  (v) => {
    if (v) {
      if (props.editingItem) {
        formData.value = {
          ...props.editingItem,
          targetDate: dayjs(props.editingItem.targetDate).valueOf(),
          overlayColor: props.editingItem.overlayColor || '#000000',
          overlayOpacity: props.editingItem.overlayOpacity !== undefined ? props.editingItem.overlayOpacity : 0.3,
          backgroundFilter: props.editingItem.backgroundFilter || { type: 'none' as WallpaperFilterType }
        }
        filterType.value = formData.value.backgroundFilter?.type || 'none'
        const idx = presets.findIndex(
          (p) => p.from === formData.value.bgGradientFrom && p.to === formData.value.bgGradientTo
        )
        presetIndex.value = idx >= 0 ? idx : 0
      } else {
        formData.value = defaultData()
        presetIndex.value = 0
        filterType.value = 'none'
        selectPreset(0)
      }
    }
  }
)

function handleSubmit() {
  formRef.value?.validate((errors) => {
    if (!errors) {
      const item: CountdownItem = {
        ...formData.value,
        targetDate: dayjs(formData.value.targetDate).format('YYYY-MM-DD'),
        id: formData.value.id || generateId(),
        createdAt: formData.value.createdAt || dayjs().toISOString()
      }
      emit('submit', item)
      emit('update:show', false)
    }
  })
}
</script>

<style lang="scss" scoped>
.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  width: 100%;
}

.preset-item {
  height: 50px;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  border: 2px solid transparent;
  transition: all $transition-fast;

  &:hover {
    transform: scale(1.02);
  }

  &.active {
    border-color: #fff;
    box-shadow: 0 0 0 2px rgba(126, 200, 227, 0.5);
  }
}

.bg-image-section {
  width: 100%;
}

.bg-image-preview {
  width: 100%;
  height: 140px;
  background-size: cover;
  background-position: center;
  border-radius: $radius-sm;
  margin-bottom: 12px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 10px;
  border: 1px solid $color-border;
}

.filter-param {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.param-label {
  font-size: 13px;
  color: $color-text-muted;
  min-width: 60px;
  flex-shrink: 0;
}

.param-value {
  font-size: 12px;
  color: $color-text;
  min-width: 50px;
  text-align: right;
  font-family: 'SF Mono', 'Monaco', monospace;
  flex-shrink: 0;
}

.overlay-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.overlay-tip {
  font-size: 12px;
  color: $color-text-muted;
  padding: 8px 12px;
  background: $color-bg;
  border-radius: $radius-sm;
  line-height: 1.5;
}
</style>
