<template>
  <n-config-provider :theme-overrides="themeOverrides" :theme="theme">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <router-view />
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
  lightTheme
} from 'naive-ui'

const theme = lightTheme

const themeOverrides = computed(() => ({
  common: {
    primaryColor: '#7ec8e3',
    primaryColorHover: '#5ab0d3',
    primaryColorPressed: '#4a9cc0',
    primaryColorSuppl: '#7ec8e3',
    infoColor: '#7ec8e3',
    successColor: '#7dd3a7',
    warningColor: '#ffd28a',
    errorColor: '#ff8fa3',
    borderRadius: '12px',
    fontSize: '14px'
  },
  Button: {
    colorPrimary: '#7ec8e3',
    colorPrimaryHover: '#5ab0d3',
    colorPrimaryPressed: '#4a9cc0',
    borderRadiusMedium: '10px',
    borderRadiusSmall: '8px'
  },
  Card: {
    color: '#ffffff',
    colorEmbedded: '#f5fbff',
    borderRadius: '16px',
    boxShadow: '0 4px 16px rgba(126, 200, 227, 0.12)'
  },
  Input: {
    borderRadiusMedium: '10px',
    borderColor: '#d4e6f1',
    borderColorHover: '#7ec8e3',
    borderColorFocus: '#7ec8e3',
    color: '#ffffff',
    colorFocus: '#ffffff',
    colorActive: '#ffffff'
  },
  Modal: {
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(126, 200, 227, 0.22)'
  },
  Tabs: {
    tabColor: 'transparent'
  }
}))
</script>
