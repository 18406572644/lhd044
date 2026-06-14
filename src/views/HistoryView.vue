<template>
  <div class="history-container">
    <header class="page-header">
      <div>
        <h1 class="page-title">历史记录</h1>
        <p class="page-desc">已完成或已删除的倒计时事件</p>
      </div>
      <n-space>
        <n-button @click="goBack">
          <template #icon>
            <n-icon><ArrowLeftOutlined /></n-icon>
          </template>
          返回
        </n-button>
        <n-button
          type="primary"
          :disabled="store.history.length === 0"
          @click="handleClearAll"
        >
          <template #icon>
            <n-icon><DeleteOutlined /></n-icon>
          </template>
          清空全部
        </n-button>
      </n-space>
    </header>

    <div class="history-content">
      <div v-if="store.history.length === 0" class="empty-state">
        <div class="empty-icon">📜</div>
        <h3>暂无历史记录</h3>
        <p>删除或已到期的倒计时会保存在这里</p>
      </div>

      <n-data-table
        v-else
        :columns="columns"
        :data="tableData"
        :pagination="pagination"
        :bordered="false"
        size="large"
        striped
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import {
  NButton,
  NSpace,
  NIcon,
  NDataTable,
  NTag,
  type DataTableColumns
} from 'naive-ui'
import { ArrowLeftOutlined, DeleteOutlined, RollbackOutlined } from '@vicons/antd'
import { useCountdownStore } from '@/stores/countdown'
import { formatDate, formatDateTime } from '@/utils'
import type { HistoryItem } from '@/types'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const store = useCountdownStore()

const tableData = computed(() =>
  store.history.map((item) => ({ ...item, key: item.id }))
)

const columns: DataTableColumns<HistoryItem & { key: string }> = [
  {
    title: '标题',
    key: 'title',
    width: 200,
    render: (row) =>
      h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
        h('span', { style: 'font-size: 20px;' }, row.emoji || '📅'),
        h(
          'span',
          { style: 'font-weight: 500; color: #2c3e50;' },
          row.title
        )
      ])
  },
  {
    title: '目标日期',
    key: 'targetDate',
    width: 140,
    render: (row) => formatDate(row.targetDate)
  },
  {
    title: '状态',
    key: 'completed',
    width: 100,
    render: (row) =>
      h(
        NTag,
        { type: row.completed ? 'success' : 'default', size: 'small', round: true },
        { default: () => (row.completed ? '已完成' : '已删除') }
      )
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 180,
    render: (row) => formatDateTime(row.createdAt)
  },
  {
    title: '描述',
    key: 'description',
    render: (row) => row.description || '—'
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render: (row) =>
      h(NSpace, null, {
        default: () => [
          h(
            NButton,
            {
              size: 'small',
              onClick: () => handleRestore(row.id)
            },
            {
              icon: () => h(NIcon, null, { default: () => h(RollbackOutlined) }),
              default: () => '恢复'
            }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              quaternary: true,
              onClick: () => handleRemove(row.id, row.title)
            },
            {
              icon: () => h(NIcon, null, { default: () => h(DeleteOutlined) }),
              default: () => '删除'
            }
          )
        ]
      })
  }
]

const pagination = {
  pageSize: 10
}

function handleRestore(id: string) {
  store.restoreFromHistory(id)
  message.success('已恢复到倒计时列表')
}

function handleRemove(id: string, title: string) {
  dialog.warning({
    title: '删除历史记录',
    content: `确定要永久删除「${title}」吗？此操作无法撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    positiveButtonProps: { type: 'error' },
    onPositiveClick: () => {
      store.removeHistoryItem(id)
      message.success('已删除')
    }
  })
}

function handleClearAll() {
  dialog.warning({
    title: '清空历史记录',
    content: '确定要清空所有历史记录吗？此操作无法撤销。',
    positiveText: '清空',
    negativeText: '取消',
    positiveButtonProps: { type: 'error' },
    onPositiveClick: () => {
      store.clearHistory()
      message.success('已清空')
    }
  })
}

function goBack() {
  router.push('/')
}

onMounted(async () => {
  await store.loadData()
})
</script>

<style lang="scss" scoped>
.history-container {
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

.history-content {
  background: $color-bg-card;
  border-radius: $radius-xl;
  padding: 24px;
  box-shadow: $shadow-sm;
  min-height: 400px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
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

:deep(.n-data-table) {
  background: transparent;
}
</style>
