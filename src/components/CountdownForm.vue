<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    :title="editing ? '编辑倒计时' : '新建倒计时'"
    style="width: 560px"
    :mask-closable="false"
    @update:show="(v) => !v && $emit('update:show', v)"
  >
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
  type FormInst,
  type FormRules,
  type SelectOption
} from 'naive-ui'
import type { CountdownItem } from '@/types'
import { DEFAULT_COLOR_PRESETS, generateId, createDefaultCountdown } from '@/utils'
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

const editing = computed(() => !!props.editingItem)
const formRef = ref<FormInst | null>(null)
const presetIndex = ref(0)

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

const defaultData = (): any => ({
  ...createDefaultCountdown(),
  targetDate: dayjs().add(7, 'day').valueOf()
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

watch(
  () => props.show,
  (v) => {
    if (v) {
      if (props.editingItem) {
        formData.value = {
          ...props.editingItem,
          targetDate: dayjs(props.editingItem.targetDate).valueOf()
        }
        const idx = presets.findIndex(
          (p) => p.from === formData.value.bgGradientFrom && p.to === formData.value.bgGradientTo
        )
        presetIndex.value = idx >= 0 ? idx : 0
      } else {
        formData.value = defaultData()
        presetIndex.value = 0
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
</style>
