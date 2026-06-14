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

  openExternal: (url: string) => ipcRenderer.send('shell:open-external', url)
})

export type ElectronAPI = typeof window.electronAPI
