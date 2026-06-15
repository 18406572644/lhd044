import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import dayjs from 'dayjs'
import type { CountdownItem, AppSettings, HistoryItem } from '@/types'
import {
  generateId,
  createDefaultCountdown,
  playNotificationSound,
  createBackup,
  encryptData,
  decryptData,
  downloadFile,
  readFileAsText,
  type BackupData,
  type EncryptedBackup
} from '@/utils'

export const useCountdownStore = defineStore('countdown', () => {
  const countdowns = ref<CountdownItem[]>([])
  const history = ref<HistoryItem[]>([])
  const settings = ref<AppSettings>({
    activeCountdownId: null,
    autoUpdateWallpaper: true,
    wallpaperUpdateInterval: 60000,
    autoRotateWallpaper: false,
    rotateIntervalMinutes: 30,
    currentWallpaperStyle: 'gradient',
    autoStartOnBoot: false,
    showMiniOnStartup: false,
    soundEnabled: true,
    notificationEnabled: true,
    displayWidth: 1920,
    displayHeight: 1080
  })
  const loaded = ref(false)
  const expiredNotified = ref<Set<string>>(new Set())

  const activeCountdown = computed(() => {
    if (settings.value.activeCountdownId) {
      return (
        countdowns.value.find((c) => c.id === settings.value.activeCountdownId) ||
        countdowns.value[0] ||
        null
      )
    }
    return countdowns.value[0] || null
  })

  const wallpaperCountdowns = computed(() =>
    countdowns.value.filter((c) => c.showOnWallpaper && !c.expired)
  )

  const miniCountdowns = computed(() =>
    countdowns.value.filter((c) => c.showOnMini && !c.expired)
  )

  const activeCountdowns = computed(() => countdowns.value.filter((c) => !c.expired))

  function addCountdown(data: Partial<CountdownItem>) {
    const now = dayjs().toISOString()
    const item: CountdownItem = {
      ...(createDefaultCountdown() as CountdownItem),
      ...data,
      id: generateId(),
      createdAt: now
    }
    countdowns.value.push(item)
    if (!settings.value.activeCountdownId) {
      settings.value.activeCountdownId = item.id
    }
    saveData()
    return item
  }

  function updateCountdown(id: string, data: Partial<CountdownItem>) {
    const index = countdowns.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      countdowns.value[index] = { ...countdowns.value[index], ...data }
      saveData()
    }
  }

  function deleteCountdown(id: string) {
    const index = countdowns.value.findIndex((c) => c.id === id)
    if (index !== -1) {
      const item = countdowns.value[index]
      history.value.unshift({ ...item, completed: !!item.expired })
      countdowns.value.splice(index, 1)
      if (settings.value.activeCountdownId === id) {
        settings.value.activeCountdownId = countdowns.value[0]?.id || null
      }
      saveData()
    }
  }

  function setActiveCountdown(id: string | null) {
    settings.value.activeCountdownId = id
    saveData()
  }

  function checkExpiredCountdowns() {
    const now = Date.now()
    countdowns.value.forEach((item) => {
      const targetTime = dayjs(item.targetDate).valueOf()
      if (targetTime <= now && !item.expired) {
        item.expired = true
        item.expiredAt = dayjs().toISOString()
        history.value.unshift({ ...item, completed: true })
        if (item.notifyOnExpire && settings.value.notificationEnabled && !expiredNotified.value.has(item.id)) {
          expiredNotified.value.add(item.id)
          if (window.electronAPI) {
            window.electronAPI.showNotification(`⏰ ${item.title}`, '倒计时已到期！')
          }
        }
        if (item.soundOnExpire && settings.value.soundEnabled) {
          playNotificationSound()
        }
      }
    })
    saveData()
  }

  function updateSettings(newSettings: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...newSettings }
    saveData()
  }

  function clearHistory() {
    history.value = []
    saveData()
  }

  function removeHistoryItem(id: string) {
    const index = history.value.findIndex((h) => h.id === id)
    if (index !== -1) {
      history.value.splice(index, 1)
      saveData()
    }
  }

  function restoreFromHistory(id: string) {
    const index = history.value.findIndex((h) => h.id === id)
    if (index !== -1) {
      const item = { ...history.value[index] }
      delete (item as any).completed
      item.expired = false
      item.expiredAt = undefined
      countdowns.value.push(item as CountdownItem)
      history.value.splice(index, 1)
      if (!settings.value.activeCountdownId) {
        settings.value.activeCountdownId = item.id
      }
      saveData()
    }
  }

  async function saveData() {
    if (!window.electronAPI) return
    try {
      await window.electronAPI.saveData({
        countdowns: countdowns.value,
        history: history.value,
        settings: settings.value
      })
    } catch (e) {
      console.error('Failed to save data:', e)
    }
  }

  async function loadData() {
    if (!window.electronAPI) {
      loaded.value = true
      return
    }
    try {
      const data = await window.electronAPI.loadData()
      if (data) {
        if (data.countdowns) countdowns.value = data.countdowns
        if (data.history) history.value = data.history
        if (data.settings) settings.value = { ...settings.value, ...data.settings }
      }
      const displays = await window.electronAPI.getDisplays()
      if (displays && displays.length > 0) {
        const primary = displays.find((d) => d.isPrimary) || displays[0]
        settings.value.displayWidth = primary.width
        settings.value.displayHeight = primary.height
      }
      const loginSettings = await window.electronAPI.getLoginSettings()
      settings.value.autoStartOnBoot = loginSettings?.openAtLogin || false
    } catch (e) {
      console.error('Failed to load data:', e)
    }
    loaded.value = true
    checkExpiredCountdowns()
  }

  watch(countdowns, () => {
    if (loaded.value) saveData()
  }, { deep: true })

  watch(settings, () => {
    if (loaded.value) saveData()
  }, { deep: true })

  async function exportDataJSON(useElectronDialog: boolean = false): Promise<boolean> {
    const backup = createBackup(countdowns.value, history.value, settings.value)
    const content = JSON.stringify(backup, null, 2)
    const filename = `countdown_backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`

    if (useElectronDialog && window.electronAPI) {
      return await window.electronAPI.saveBackupFile(content, filename)
    } else {
      downloadFile(content, filename)
      return true
    }
  }

  async function exportDataEncrypted(password: string, useElectronDialog: boolean = false): Promise<boolean> {
    const backup = createBackup(countdowns.value, history.value, settings.value)
    const encrypted = await encryptData(backup, password)
    const content = JSON.stringify(encrypted, null, 2)
    const filename = `countdown_backup_${dayjs().format('YYYYMMDD_HHmmss')}.cwbk`

    if (useElectronDialog && window.electronAPI) {
      return await window.electronAPI.saveBackupFile(content, filename)
    } else {
      downloadFile(content, filename)
      return true
    }
  }

  function parseBackupContent(content: string): BackupData | EncryptedBackup | null {
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  function isEncryptedBackup(data: any): data is EncryptedBackup {
    return data && data.encrypted === true && typeof data.data === 'string'
  }

  function isBackupData(data: any): data is BackupData {
    return data && Array.isArray(data.countdowns) && Array.isArray(data.history) && data.settings
  }

  function mergeData(backup: BackupData) {
    const existingIds = new Set(countdowns.value.map(c => c.id))
    backup.countdowns.forEach(cd => {
      if (!existingIds.has(cd.id)) {
        countdowns.value.push(cd)
      }
    })

    const existingHistoryIds = new Set(history.value.map(h => h.id))
    backup.history.forEach(h => {
      if (!existingHistoryIds.has(h.id)) {
        history.value.unshift(h)
      }
    })

    saveData()
  }

  function overwriteData(backup: BackupData) {
    countdowns.value = backup.countdowns || []
    history.value = backup.history || []
    if (backup.settings) {
      settings.value = { ...settings.value, ...backup.settings }
    }
    saveData()
  }

  async function importData(
    content: string,
    mode: 'merge' | 'overwrite' = 'merge',
    password?: string
  ): Promise<{ success: boolean; encrypted: boolean; needPassword: boolean; error?: string }> {
    const parsed = parseBackupContent(content)
    if (!parsed) {
      return { success: false, encrypted: false, needPassword: false, error: '文件格式无效' }
    }

    try {
      if (isEncryptedBackup(parsed)) {
        if (!password) {
          return { success: false, encrypted: true, needPassword: true }
        }
        const backup = await decryptData(parsed, password)
        if (mode === 'merge') {
          mergeData(backup)
        } else {
          overwriteData(backup)
        }
        return { success: true, encrypted: true, needPassword: false }
      } else if (isBackupData(parsed)) {
        if (mode === 'merge') {
          mergeData(parsed)
        } else {
          overwriteData(parsed)
        }
        return { success: true, encrypted: false, needPassword: false }
      } else {
        return { success: false, encrypted: false, needPassword: false, error: '文件内容格式不正确' }
      }
    } catch (e: any) {
      return { success: false, encrypted: isEncryptedBackup(parsed), needPassword: false, error: e.message || '导入失败' }
    }
  }

  function resetApp() {
    countdowns.value = []
    history.value = []
    settings.value = {
      activeCountdownId: null,
      autoUpdateWallpaper: true,
      wallpaperUpdateInterval: 60000,
      autoRotateWallpaper: false,
      rotateIntervalMinutes: 30,
      currentWallpaperStyle: 'gradient',
      autoStartOnBoot: false,
      showMiniOnStartup: false,
      soundEnabled: true,
      notificationEnabled: true,
      displayWidth: 1920,
      displayHeight: 1080
    }
    saveData()
  }

  async function getStatistics() {
    return {
      totalCountdowns: countdowns.value.length,
      activeCountdowns: countdowns.value.filter(c => !c.expired).length,
      expiredCountdowns: countdowns.value.filter(c => c.expired).length,
      historyItems: history.value.length,
      wallpapersWithImage: countdowns.value.filter(c => c.backgroundImage).length
    }
  }

  return {
    countdowns,
    history,
    settings,
    loaded,
    activeCountdown,
    wallpaperCountdowns,
    miniCountdowns,
    activeCountdowns,
    addCountdown,
    updateCountdown,
    deleteCountdown,
    setActiveCountdown,
    checkExpiredCountdowns,
    updateSettings,
    clearHistory,
    removeHistoryItem,
    restoreFromHistory,
    loadData,
    saveData,
    exportDataJSON,
    exportDataEncrypted,
    importData,
    resetApp,
    getStatistics
  }
})
