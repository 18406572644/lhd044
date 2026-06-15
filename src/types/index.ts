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

export type WallpaperMode = 'static' | 'interactive'

export type InteractiveState = 'idle' | 'active' | 'expanded'

export type HotZonePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export interface HotZone {
  id: string
  position: HotZonePosition
  size: number
  action: 'new-countdown' | 'toggle-mode' | 'next-countdown' | 'show-main'
  label: string
  icon: string
}

export interface ParticleConfig {
  count: number
  minSize: number
  maxSize: number
  speed: number
  color: string
  opacity: number
  trailLength: number
}

export interface GlowConfig {
  enabled: boolean
  radius: number
  color: string
  opacity: number
  pulseSpeed: number
}

export interface MouseFollowConfig {
  enabled: boolean
  influence: number
  smoothing: number
  particleAttraction: number
  glowFollow: boolean
}

export interface IdleDetectionConfig {
  enabled: boolean
  timeoutMs: number
  expandedInfoTypes: ('schedule' | 'weather' | 'quote')[]
}

export interface InteractiveWallpaperConfig {
  particles: ParticleConfig
  glow: GlowConfig
  mouseFollow: MouseFollowConfig
  idleDetection: IdleDetectionConfig
  hotZones: HotZone[]
  clickThrough: boolean
  showCountdownClickHint: boolean
  doubleClickOpenMain: boolean
}

export type InteractiveAction =
  | { type: 'switch-countdown'; direction: 'next' | 'prev' }
  | { type: 'open-main-window' }
  | { type: 'new-countdown' }
  | { type: 'toggle-mode' }
  | { type: 'hot-zone'; zone: HotZone }

export type WallpaperStyle =
  | 'gradient'
  | 'blur'
  | 'minimal'
  | 'glass'
  | 'elegant'

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
  wallpaperMode: WallpaperMode
  interactiveConfig: InteractiveWallpaperConfig
}

export interface CountdownDiff {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
  isPast: boolean
}
