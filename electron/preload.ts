import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getLoginSettings: () => ipcRenderer.invoke('app:get-login-settings'),
  setLoginSettings: (openAtLogin: boolean) => ipcRenderer.invoke('app:set-login-settings', openAtLogin),

  miniWindowShow: () => ipcRenderer.invoke('window:mini-show'),
  miniWindowHide: () => ipcRenderer.invoke('window:mini-hide'),
  miniWindowToggle: () => ipcRenderer.invoke('window:mini-toggle'),
  miniWindowClose: () => ipcRenderer.invoke('window:mini-close'),
  mainWindowShow: () => ipcRenderer.invoke('window:main-show'),
  mainWindowHide: () => ipcRenderer.invoke('window:main-hide'),

  saveData: (data: any) => ipcRenderer.invoke('data:save', data),
  loadData: () => ipcRenderer.invoke('data:load'),

  saveWallpaperImage: (filename: string, dataUrl: string) =>
    ipcRenderer.invoke('wallpaper:save-image', { filename, dataUrl }),
  setWallpaper: (imagePath: string) => ipcRenderer.invoke('wallpaper:set', imagePath),
  cleanOldWallpapers: (keepFilename: string) => ipcRenderer.invoke('wallpaper:clean-old', keepFilename),

  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', { title, body }),

  getDisplays: () => ipcRenderer.invoke('app:get-displays'),

  startWallpaperAutoUpdate: (intervalMs: number) =>
    ipcRenderer.send('wallpaper:start-auto-update', intervalMs),
  stopWallpaperAutoUpdate: () => ipcRenderer.send('wallpaper:stop-auto-update'),

  onWallpaperTick: (callback: () => void) => {
    ipcRenderer.on('wallpaper:tick', callback)
    return () => ipcRenderer.removeListener('wallpaper:tick', callback)
  },
  onWallpaperRefresh: (callback: () => void) => {
    ipcRenderer.on('wallpaper:refresh', callback)
    return () => ipcRenderer.removeListener('wallpaper:refresh', callback)
  },

  openExternal: (url: string) => ipcRenderer.send('shell:open-external', url),

  selectImageFile: () => ipcRenderer.invoke('dialog:select-image'),
  saveBackupFile: (content: string, filename: string) =>
    ipcRenderer.invoke('dialog:save-backup', { content, filename }),
  openBackupFile: () => ipcRenderer.invoke('dialog:open-backup'),

  setWallpaperMode: (mode: 'static' | 'interactive') =>
    ipcRenderer.invoke('wallpaper:set-mode', mode),
  wallpaperWindowExists: () => ipcRenderer.invoke('wallpaper:window-exists'),
  setWallpaperClickThrough: (clickThrough: boolean) =>
    ipcRenderer.invoke('wallpaper:set-click-through', clickThrough),

  animatedWallpaperRequestData: () => ipcRenderer.invoke('wallpaper:request-data'),
  broadcastWallpaperData: (data: any) =>
    ipcRenderer.send('wallpaper:broadcast-data', data),

  onWallpaperUpdateData: (callback: (data: any) => void) => {
    ipcRenderer.on('wallpaper:update-data', callback)
    return () => ipcRenderer.removeListener('wallpaper:update-data', callback)
  },

  cycleCountdown: () => ipcRenderer.send('wallpaper:cycle-countdown'),
  newCountdown: () => ipcRenderer.send('wallpaper:new-countdown'),
  showMainWindow: () => ipcRenderer.send('wallpaper:show-main-window'),

  onCycleCountdown: (callback: () => void) => {
    ipcRenderer.on('wallpaper:cycle-countdown', callback)
    return () => ipcRenderer.removeListener('wallpaper:cycle-countdown', callback)
  },
  onNewCountdown: (callback: () => void) => {
    ipcRenderer.on('wallpaper:new-countdown', callback)
    return () => ipcRenderer.removeListener('wallpaper:new-countdown', callback)
  }
})

export type ElectronAPI = typeof window.electronAPI
