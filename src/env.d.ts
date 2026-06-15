/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ElectronAPI {
  getLoginSettings: () => Promise<{ openAtLogin: boolean; openAsHidden?: boolean }>
  setLoginSettings: (openAtLogin: boolean) => Promise<boolean>

  miniWindowShow: () => Promise<boolean>
  miniWindowHide: () => Promise<boolean>
  miniWindowToggle: () => Promise<boolean>
  miniWindowClose: () => Promise<boolean>
  mainWindowShow: () => Promise<boolean>
  mainWindowHide: () => Promise<boolean>

  saveData: (data: any) => Promise<boolean>
  loadData: () => Promise<any>

  saveWallpaperImage: (filename: string, dataUrl: string) => Promise<string>
  setWallpaper: (imagePath: string) => Promise<boolean>
  cleanOldWallpapers: (keepFilename: string) => Promise<boolean>

  showNotification: (title: string, body: string) => Promise<boolean>

  getDisplays: () => Promise<
    Array<{
      id: number
      width: number
      height: number
      scaleFactor: number
      isPrimary: boolean
    }>
  >

  startWallpaperAutoUpdate: (intervalMs: number) => void
  stopWallpaperAutoUpdate: () => void

  onWallpaperTick: (callback: () => void) => () => void
  onWallpaperRefresh: (callback: () => void) => () => void

  openExternal: (url: string) => void

  selectImageFile: () => Promise<string | null>
  saveBackupFile: (content: string, filename: string) => Promise<boolean>
  openBackupFile: () => Promise<string | null>

  setWallpaperMode: (mode: 'static' | 'interactive') => Promise<boolean>
  wallpaperWindowExists: () => Promise<boolean>
  setWallpaperClickThrough: (clickThrough: boolean) => Promise<boolean>

  animatedWallpaperRequestData: () => Promise<any>
  broadcastWallpaperData: (data: any) => void

  onWallpaperUpdateData: (callback: (data: any) => void) => () => void

  cycleCountdown: () => void
  newCountdown: () => void
  showMainWindow: () => void

  onCycleCountdown: (callback: () => void) => () => void
  onNewCountdown: (callback: () => void) => () => void

  onDataUpdated?: (callback: (data: any) => void) => () => void
}

interface Window {
  electronAPI: ElectronAPI
}
