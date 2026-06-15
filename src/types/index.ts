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
  wallpaperMode: WallpaperMode
  interactiveConfig: InteractiveWallpaperConfig
  animatedConfig: AnimatedWallpaperConfig
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

export type AnimationIntensity = 'low' | 'medium' | 'high'

export interface AnimatedParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  life: number
  maxLife: number
}

export interface AnimatedWallpaperConfig {
  particleFlow: boolean
  breathingGlow: boolean
  numberFlip: boolean
  progressBar: boolean
  intensity: AnimationIntensity
  fpsLimit: number
}

export type WallpaperMode = 'static' | 'interactive'

export interface InteractiveWallpaperConfig {
  mouseFollowParticles: boolean
  clickThrough: boolean
  hotCornerEnabled: boolean
  idleExpandEnabled: boolean
  idleExpandDelayMs: number
  interactiveParticles: InteractiveParticleConfig
  mouseTrail: MouseTrailConfig
}

export interface InteractiveParticleConfig {
  enabled: boolean
  count: number
  followStrength: number
  maxSpeed: number
}

export interface MouseTrailConfig {
  enabled: boolean
  length: number
  fadeSpeed: number
}

export interface MousePosition {
  x: number
  y: number
}

export type HotCornerArea = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'none'

export interface ExpandedInfoPanel {
  schedule: ScheduleItem[]
  weather: WeatherInfo | null
  nextCountdowns: CountdownItem[]
}

export interface ScheduleItem {
  id: string
  title: string
  time: string
  color: string
}

export interface WeatherInfo {
  temperature: number
  condition: string
  icon: string
  city: string
}

