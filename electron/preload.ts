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

  onDataUpdated: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('data:updated', handler)
    return () => ipcRenderer.removeListener('data:updated', handler)
  },

  interactiveWallpaperShow: () => ipcRenderer.invoke('wallpaper:interactive-show'),
  interactiveWallpaperHide: () => ipcRenderer.invoke('wallpaper:interactive-hide'),
  interactiveWallpaperClose: () => ipcRenderer.invoke('wallpaper:interactive-close'),
  interactiveWallpaperSetClickThrough: (clickThrough: boolean) =>
    ipcRenderer.invoke('wallpaper:interactive-set-click-through', clickThrough),
  interactiveWallpaperSendAction: (action: string) =>
    ipcRenderer.invoke('wallpaper:interactive-send-action', action),
  interactiveWallpaperIsRunning: () => ipcRenderer.invoke('wallpaper:interactive-is-running'),
  interactiveWallpaperUpdateData: (data: any) =>
    ipcRenderer.invoke('wallpaper:interactive-update-data', data),
  interactiveWallpaperRequestData: () => ipcRenderer.invoke('wallpaper:interactive-request-data'),

  animatedWallpaperShow: () => ipcRenderer.invoke('wallpaper:animated-show'),
  animatedWallpaperHide: () => ipcRenderer.invoke('wallpaper:animated-hide'),
  animatedWallpaperClose: () => ipcRenderer.invoke('wallpaper:animated-close'),
  animatedWallpaperIsRunning: () => ipcRenderer.invoke('wallpaper:animated-is-running'),
  animatedWallpaperUpdateData: (data: any) =>
    ipcRenderer.invoke('wallpaper:animated-update-data', data),
  animatedWallpaperRequestData: () => ipcRenderer.invoke('wallpaper:animated-request-data'),

  onInteractiveAction: (callback: (action: string) => void) => {
    const handler = (_e: any, action: string) => callback(action)
    ipcRenderer.on('wallpaper:interactive-action', handler)
    return () => ipcRenderer.removeListener('wallpaper:interactive-action', handler)
  },

  onWallpaperUpdateData: (callback: (data: any) => void) => {
    const handler = (_e: any, data: any) => callback(data)
    ipcRenderer.on('wallpaper:update-data', handler)
    return () => ipcRenderer.removeListener('wallpaper:update-data', handler)
  },

  onWallpaperRequestData: (callback: () => void) => {
    const handler = (_e: any) => callback()
    ipcRenderer.on('wallpaper:request-data', handler)
    return () => ipcRenderer.removeListener('wallpaper:request-data', handler)
  },

  onWallpaperWindowReady: (callback: () => void) => {
    const handler = (_e: any) => callback()
    ipcRenderer.on('wallpaper:window-ready', handler)
    return () => ipcRenderer.removeListener('wallpaper:window-ready', handler)
  },

  selectImageFile: () => ipcRenderer.invoke('dialog:select-image'),
  saveBackupFile: (content: string, filename: string) =>
    ipcRenderer.invoke('dialog:save-backup', { content, filename }),
  openBackupFile: () => ipcRenderer.invoke('dialog:open-backup')
})

export type ElectronAPI = typeof window.electronAPI
