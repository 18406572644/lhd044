export type WallpaperFilterType =
  | 'none'
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'grayscale'
  | 'sepia'
  | 'vintage'
  | 'cool'
  | 'warm'

export interface WallpaperFilter {
  type: WallpaperFilterType
  blur?: number
  brightness?: number
  contrast?: number
  grayscale?: number
  sepia?: number
  saturate?: number
  hueRotate?: number
}

export interface CountdownItem {
  id: string
  title: string
  targetDate: string
  description?: string
  emoji?: string
  color: string
  textColor: string
  bgGradientFrom: string
  bgGradientTo: string
  backgroundImage?: string
  backgroundFilter?: WallpaperFilter
  overlayColor?: string
  overlayOpacity?: number
  fontSize: number
  showOnWallpaper: boolean
  showOnMini: boolean
  notifyOnExpire: boolean
  soundOnExpire: boolean
  createdAt: string
  expired?: boolean
  expiredAt?: string
}

export interface HistoryItem extends CountdownItem {
  completed: boolean
}

export interface AppSettings {
  activeCountdownId: string | null
  autoUpdateWallpaper: boolean
  wallpaperUpdateInterval: number
  autoRotateWallpaper: boolean
  rotateIntervalMinutes: number
  currentWallpaperStyle: WallpaperStyle
  autoStartOnBoot: boolean
  showMiniOnStartup: boolean
  soundEnabled: boolean
  notificationEnabled: boolean
  displayWidth: number
  displayHeight: number
}

export type WallpaperStyle =
  | 'gradient'
  | 'blur'
  | 'minimal'
  | 'glass'
  | 'elegant'

export interface CountdownDiff {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
  isPast: boolean
}
