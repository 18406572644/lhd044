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

  onDataUpdated: (callback: () => void) => () => void

  interactiveWallpaperShow: () => Promise<boolean>
  interactiveWallpaperHide: () => Promise<boolean>
  interactiveWallpaperClose: () => Promise<boolean>
  interactiveWallpaperSetClickThrough: (clickThrough: boolean) => Promise<boolean>
  interactiveWallpaperSendAction: (action: string) => Promise<boolean>
  interactiveWallpaperIsRunning: () => Promise<boolean>
  interactiveWallpaperUpdateData: (data: any) => Promise<boolean>
  interactiveWallpaperRequestData: () => Promise<boolean>

  animatedWallpaperShow: () => Promise<boolean>
  animatedWallpaperHide: () => Promise<boolean>
  animatedWallpaperClose: () => Promise<boolean>
  animatedWallpaperIsRunning: () => Promise<boolean>
  animatedWallpaperUpdateData: (data: any) => Promise<boolean>
  animatedWallpaperRequestData: () => Promise<boolean>

  onInteractiveAction: (callback: (action: string) => void) => () => void
  onWallpaperUpdateData: (callback: (data: any) => void) => () => void
  onWallpaperRequestData: (callback: () => void) => () => void
  onWallpaperWindowReady: (callback: () => void) => () => void

  selectImageFile: () => Promise<string | null>
  saveBackupFile: (content: string, filename: string) => Promise<boolean>
  openBackupFile: () => Promise<string | null>
}

interface Window {
  electronAPI: ElectronAPI
}
