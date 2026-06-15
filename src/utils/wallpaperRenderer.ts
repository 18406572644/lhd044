import type { CountdownItem, WallpaperStyle, WallpaperFilter, AnimatedWallpaperConfig, AnimatedParticle, AnimationIntensity } from '@/types'
import { calculateDiff, formatDate, padZero } from '.'
import dayjs from 'dayjs'

export interface RenderOptions {
  width: number
  height: number
  countdown: CountdownItem
  style: WallpaperStyle
  allCountdowns?: CountdownItem[]
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 126, g: 200, b: 227 }
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function buildFilterString(filter?: WallpaperFilter): string {
  if (!filter || filter.type === 'none') return 'none'
  const parts: string[] = []
  if (filter.blur) parts.push(`blur(${filter.blur}px)`)
  if (filter.brightness) parts.push(`brightness(${filter.brightness})`)
  if (filter.contrast) parts.push(`contrast(${filter.contrast})`)
  if (filter.grayscale) parts.push(`grayscale(${filter.grayscale})`)
  if (filter.sepia) parts.push(`sepia(${filter.sepia})`)
  if (filter.saturate) parts.push(`saturate(${filter.saturate})`)
  if (filter.hueRotate) parts.push(`hue-rotate(${filter.hueRotate}deg)`)
  return parts.length ? parts.join(' ') : 'none'
}

export function getDefaultFilter(type: WallpaperFilter['type']): WallpaperFilter {
  const base: WallpaperFilter = { type }
  switch (type) {
    case 'blur':
      return { ...base, blur: 8 }
    case 'brightness':
      return { ...base, brightness: 1.2 }
    case 'contrast':
      return { ...base, contrast: 1.3 }
    case 'grayscale':
      return { ...base, grayscale: 1 }
    case 'sepia':
      return { ...base, sepia: 0.8 }
    case 'vintage':
      return { ...base, sepia: 0.4, contrast: 0.9, brightness: 1.05, saturate: 0.8 }
    case 'cool':
      return { ...base, hueRotate: 180, saturate: 1.1, brightness: 1.05 }
    case 'warm':
      return { ...base, sepia: 0.2, saturate: 1.3, brightness: 1.05 }
    default:
      return base
  }
}

async function drawBackgroundImage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  imageSrc: string,
  filter?: WallpaperFilter,
  overlayColor?: string,
  overlayOpacity?: number
) {
  try {
    const img = await loadImage(imageSrc)
    ctx.save()

    const imgAspect = img.width / img.height
    const canvasAspect = width / height
    let drawWidth: number, drawHeight: number, drawX: number, drawY: number

    if (imgAspect > canvasAspect) {
      drawHeight = height
      drawWidth = img.width * (height / img.height)
      drawX = (width - drawWidth) / 2
      drawY = 0
    } else {
      drawWidth = width
      drawHeight = img.height * (width / img.width)
      drawX = 0
      drawY = (height - drawHeight) / 2
    }

    ctx.filter = buildFilterString(filter)
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
    ctx.filter = 'none'
    ctx.restore()

    if (overlayColor && overlayOpacity !== undefined && overlayOpacity > 0) {
      ctx.save()
      ctx.fillStyle = rgba(overlayColor, overlayOpacity)
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    }
  } catch (e) {
    console.warn('Failed to load background image, falling back to gradient:', e)
  }
}

export async function renderWallpaperAsync(canvas: HTMLCanvasElement, options: RenderOptions): Promise<string> {
  const ctx = canvas.getContext('2d')!
  const { width, height, countdown, style } = options
  const diff = calculateDiff(countdown.targetDate)

  canvas.width = width
  canvas.height = height

  if (countdown.backgroundImage) {
    await drawBackgroundImage(
      ctx,
      width,
      height,
      countdown.backgroundImage,
      countdown.backgroundFilter,
      countdown.overlayColor,
      countdown.overlayOpacity
    )
  }

  if (!countdown.backgroundImage || countdown.overlayOpacity === undefined || countdown.overlayOpacity < 1) {
    drawBackground(ctx, width, height, countdown, style, !!countdown.backgroundImage)
  }

  drawCountdownContent(ctx, width, height, countdown, diff, style)

  if (options.allCountdowns && options.allCountdowns.length > 1) {
    drawOtherCountdowns(ctx, width, height, options.allCountdowns.filter(c => c.id !== countdown.id && c.showOnWallpaper), style)
  }

  drawFooter(ctx, width, height, countdown, style)

  return canvas.toDataURL('image/png')
}

export function renderWallpaper(canvas: HTMLCanvasElement, options: RenderOptions): string {
  const ctx = canvas.getContext('2d')!
  const { width, height, countdown, style } = options
  const diff = calculateDiff(countdown.targetDate)

  canvas.width = width
  canvas.height = height

  drawBackground(ctx, width, height, countdown, style)
  drawCountdownContent(ctx, width, height, countdown, diff, style)

  if (options.allCountdowns && options.allCountdowns.length > 1) {
    drawOtherCountdowns(ctx, width, height, options.allCountdowns.filter(c => c.id !== countdown.id && c.showOnWallpaper), style)
  }

  drawFooter(ctx, width, height, countdown, style)

  return canvas.toDataURL('image/png')
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  countdown: CountdownItem,
  style: WallpaperStyle,
  hasBackgroundImage: boolean = false
) {
  const { bgGradientFrom, bgGradientTo } = countdown

  if (hasBackgroundImage) {
    return
  }

  switch (style) {
    case 'gradient': {
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, bgGradientFrom)
      gradient.addColorStop(1, bgGradientTo)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      drawDecorativeCircles(ctx, width, height, bgGradientFrom, bgGradientTo)
      break
    }
    case 'blur': {
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7)
      gradient.addColorStop(0, bgGradientFrom)
      gradient.addColorStop(1, bgGradientTo)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      for (let i = 0; i < 8; i++) {
        const cx = Math.random() * width
        const cy = Math.random() * height
        const r = Math.min(width, height) * (0.1 + Math.random() * 0.2)
        const blurGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        blurGradient.addColorStop(0, rgba(i % 2 === 0 ? bgGradientFrom : bgGradientTo, 0.3))
        blurGradient.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = blurGradient
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
      }
      break
    }
    case 'minimal': {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      const sideGradient = ctx.createLinearGradient(0, 0, width * 0.3, 0)
      sideGradient.addColorStop(0, rgba(bgGradientFrom, 0.2))
      sideGradient.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = sideGradient
      ctx.fillRect(0, 0, width * 0.3, height)
      break
    }
    case 'glass': {
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, bgGradientFrom)
      gradient.addColorStop(1, bgGradientTo)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * width
        const y = Math.random() * height
        const w = 100 + Math.random() * 300
        const h = 2 + Math.random() * 4
        ctx.fillRect(x, y, w, h)
      }
      break
    }
    case 'elegant': {
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(0, 0, width, height)
      const gradient = ctx.createLinearGradient(0, height * 0.3, width, height * 0.7)
      gradient.addColorStop(0, rgba(bgGradientFrom, 0.15))
      gradient.addColorStop(0.5, rgba(bgGradientTo, 0.25))
      gradient.addColorStop(1, rgba(bgGradientFrom, 0.15))
      ctx.fillStyle = gradient
      ctx.fillRect(0, height * 0.3, width, height * 0.4)
      ctx.strokeStyle = rgba(countdown.color, 0.3)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(width * 0.1, height * 0.35)
      ctx.lineTo(width * 0.9, height * 0.35)
      ctx.moveTo(width * 0.1, height * 0.65)
      ctx.lineTo(width * 0.9, height * 0.65)
      ctx.stroke()
      break
    }
  }
}

function drawDecorativeCircles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color1: string,
  color2: string
) {
  ctx.save()
  ctx.globalAlpha = 0.15

  const circles = [
    { x: width * 0.15, y: height * 0.2, r: Math.min(width, height) * 0.12, color: color1 },
    { x: width * 0.85, y: height * 0.15, r: Math.min(width, height) * 0.08, color: color2 },
    { x: width * 0.9, y: height * 0.8, r: Math.min(width, height) * 0.15, color: color1 },
    { x: width * 0.1, y: height * 0.85, r: Math.min(width, height) * 0.1, color: color2 }
  ]

  circles.forEach(({ x, y, r, color }) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.restore()
}

function drawCountdownContent(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  countdown: CountdownItem,
  diff: ReturnType<typeof calculateDiff>,
  style: WallpaperStyle
) {
  const centerX = width / 2
  const centerY = height * 0.45
  const textColor = countdown.textColor

  ctx.save()

  if (countdown.emoji) {
    ctx.font = `${Math.floor(width * 0.06)}px -apple-system, "Segoe UI Emoji", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = textColor
    ctx.fillText(countdown.emoji, centerX, centerY - height * 0.18)
  }

  ctx.font = `300 ${Math.floor(width * 0.025)}px -apple-system, "PingFang SC", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = rgba(textColor === '#ffffff' ? '#ffffff' : countdown.color, style === 'minimal' || style === 'elegant' ? 0.7 : 0.9)
  ctx.fillText(countdown.title, centerX, centerY - height * 0.08)

  const daysFontSize = countdown.fontSize || Math.floor(width * 0.12)
  ctx.font = `200 ${daysFontSize}px -apple-system, "PingFang SC", sans-serif`
  ctx.fillStyle = textColor
  const daysText = diff.isPast ? `+${diff.days}` : diff.days.toString()
  ctx.fillText(daysText, centerX, centerY + height * 0.02)

  ctx.font = `400 ${Math.floor(width * 0.018)}px -apple-system, "PingFang SC", sans-serif`
  ctx.fillStyle = rgba(textColor === '#ffffff' ? '#ffffff' : countdown.color, style === 'minimal' || style === 'elegant' ? 0.6 : 0.8)
  ctx.fillText('天', centerX + daysFontSize * 1.3, centerY + height * 0.02)

  ctx.font = `400 ${Math.floor(width * 0.022)}px -apple-system, "PingFang SC", sans-serif`
  const timeText = `${padZero(diff.hours)} : ${padZero(diff.minutes)} : ${padZero(diff.seconds)}`
  ctx.fillStyle = rgba(textColor === '#ffffff' ? '#ffffff' : countdown.color, style === 'minimal' || style === 'elegant' ? 0.7 : 0.85)
  ctx.fillText(timeText, centerX, centerY + height * 0.13)

  ctx.font = `300 ${Math.floor(width * 0.014)}px -apple-system, "PingFang SC", sans-serif`
  ctx.fillStyle = rgba(textColor === '#ffffff' ? '#ffffff' : countdown.color, style === 'minimal' || style === 'elegant' ? 0.5 : 0.7)
  ctx.fillText(formatDate(countdown.targetDate), centerX, centerY + height * 0.2)

  if (countdown.description) {
    ctx.font = `300 ${Math.floor(width * 0.012)}px -apple-system, "PingFang SC", sans-serif`
    ctx.fillStyle = rgba(textColor === '#ffffff' ? '#ffffff' : countdown.color, style === 'minimal' || style === 'elegant' ? 0.4 : 0.6)
    ctx.fillText(countdown.description, centerX, centerY + height * 0.25)
  }

  ctx.restore()
}

function drawOtherCountdowns(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  countdowns: CountdownItem[],
  style: WallpaperStyle
) {
  if (!countdowns.length) return

  const itemHeight = height * 0.05
  const startY = height * 0.78
  const itemWidth = width * 0.18
  const gap = width * 0.02
  const totalWidth = countdowns.length * itemWidth + (countdowns.length - 1) * gap
  let startX = (width - totalWidth) / 2

  countdowns.slice(0, 5).forEach((cd) => {
    const diff = calculateDiff(cd.targetDate)
    const textColor = style === 'minimal' || style === 'elegant' ? cd.color : cd.textColor

    ctx.save()
    ctx.globalAlpha = 0.85

    if (style === 'glass') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.beginPath()
      const r = 8
      roundRect(ctx, startX, startY, itemWidth, itemHeight, r)
      ctx.fill()
    }

    ctx.font = `400 ${Math.floor(width * 0.009)}px -apple-system, "PingFang SC", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = rgba(textColor, 0.9)
    const title = cd.title.length > 8 ? cd.title.slice(0, 8) + '...' : cd.title
    ctx.fillText(title, startX + itemWidth / 2, startY + itemHeight * 0.35)

    ctx.font = `600 ${Math.floor(width * 0.012)}px -apple-system, sans-serif`
    ctx.fillStyle = textColor
    ctx.fillText(
      diff.isPast ? `+${diff.days}天` : `${diff.days}天`,
      startX + itemWidth / 2,
      startY + itemHeight * 0.75
    )

    ctx.restore()
    startX += itemWidth + gap
  })
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  countdown: CountdownItem,
  style: WallpaperStyle
) {
  ctx.save()
  ctx.font = `300 ${Math.floor(width * 0.008)}px -apple-system, "PingFang SC", sans-serif`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  const footerColor = style === 'minimal' || style === 'elegant' ? countdown.color : countdown.textColor
  ctx.fillStyle = rgba(footerColor, 0.35)
  ctx.fillText('Countdown Wallpaper', width * 0.97, height * 0.97)
  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export interface AnimatedRenderOptions {
  width: number
  height: number
  countdown: CountdownItem
  style: WallpaperStyle
  allCountdowns?: CountdownItem[]
  animatedConfig: AnimatedWallpaperConfig
}

const INTENSITY_FACTORS: Record<AnimationIntensity, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.8
}

export class AnimatedWallpaperRenderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private bgCanvas: HTMLCanvasElement | null = null
  private bgCtx: CanvasRenderingContext2D | null = null
  private options: AnimatedRenderOptions | null = null
  private animationId: number | null = null
  private isRunning = false
  private lastFrameTime = 0
  private frameInterval = 1000 / 18

  private particles: AnimatedParticle[] = []
  private glowPhase = 0
  private prevDiffValues = { days: -1, hours: -1, minutes: -1, seconds: -1 }
  private flipAnimations: { value: string; start: number; duration: number }[] = []
  private progressBarWidth = 0
  private hasData = false

  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: true })!
    this.bgCanvas = document.createElement('canvas')
    this.bgCtx = this.bgCanvas.getContext('2d')!
  }

  unmount() {
    this.stop()
    this.canvas = null
    this.ctx = null
    this.bgCanvas = null
    this.bgCtx = null
  }

  resize(width: number, height: number) {
    if (this.canvas) {
      this.canvas.width = width
      this.canvas.height = height
    }
    if (this.bgCanvas) {
      this.bgCanvas.width = width
      this.bgCanvas.height = height
    }
    if (this.options) {
      this.options.width = width
      this.options.height = height
      this.renderStaticBackground()
      this.initParticles()
    }
  }

  updateOptions(options: AnimatedRenderOptions) {
    this.options = options
    this.hasData = true
    this.frameInterval = 1000 / Math.max(10, Math.min(30, options.animatedConfig.fpsLimit || 18))
    this.renderStaticBackground()
    this.initParticles()
  }

  setHasData(value: boolean) {
    this.hasData = value
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastFrameTime = performance.now()
    this.renderLoop()
  }

  stop() {
    this.isRunning = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private getIntensityFactor(): number {
    return INTENSITY_FACTORS[this.options?.animatedConfig.intensity || 'medium']
  }

  private initParticles() {
    if (!this.options) return
    const { width, height, countdown, animatedConfig } = this.options
    if (!animatedConfig.particleFlow) {
      this.particles = []
      return
    }
    const factor = this.getIntensityFactor()
    const baseCount = 50
    const count = Math.floor(baseCount * factor)
    const densityFactor = this.getDensityFactor(countdown)
    const totalCount = Math.floor(count * densityFactor)

    this.particles = []
    for (let i = 0; i < totalCount; i++) {
      this.particles.push(this.createParticle(width, height, factor))
    }
  }

  private getDensityFactor(countdown: CountdownItem): number {
    const totalMs = dayjs(countdown.targetDate).valueOf() - Date.now()
    const totalDays = Math.abs(totalMs) / (1000 * 60 * 60 * 24)
    if (totalMs <= 0) return 1.5
    if (totalDays <= 1) return 1.8
    if (totalDays <= 7) return 1.4
    if (totalDays <= 30) return 1.1
    return 0.8
  }

  private createParticle(width: number, height: number, factor: number): AnimatedParticle {
    const maxLife = 300 + Math.random() * 400
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6 * factor,
      vy: (Math.random() - 0.5) * 0.6 * factor - 0.1 * factor,
      size: 1 + Math.random() * 2.5 * factor,
      alpha: 0.2 + Math.random() * 0.5,
      life: Math.random() * maxLife,
      maxLife
    }
  }

  private updateParticles(deltaTime: number) {
    if (!this.options || !this.particles.length) return
    const { width, height, animatedConfig, countdown } = this.options
    if (!animatedConfig.particleFlow) return

    const factor = this.getIntensityFactor()
    const urgency = this.getUrgencyFactor(countdown)

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life += deltaTime
      p.x += p.vx * (1 + urgency * 0.5)
      p.y += p.vy * (1 + urgency * 0.5)

      const lifeRatio = p.life / p.maxLife
      if (lifeRatio < 0.1) {
        p.alpha = (lifeRatio / 0.1) * (0.2 + Math.random() * 0.5)
      } else if (lifeRatio > 0.9) {
        p.alpha = ((1 - lifeRatio) / 0.1) * (0.2 + Math.random() * 0.5)
      }

      if (p.life >= p.maxLife || p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) {
        this.particles[i] = this.createParticle(width, height, factor)
        this.particles[i].x = Math.random() * width
        this.particles[i].y = height + 10
      }
    }
  }

  private getUrgencyFactor(countdown: CountdownItem): number {
    const totalMs = dayjs(countdown.targetDate).valueOf() - Date.now()
    const totalDays = totalMs / (1000 * 60 * 60 * 24)
    if (totalMs <= 0) return 2
    if (totalDays <= 1) return 1.8
    if (totalDays <= 3) return 1.4
    if (totalDays <= 7) return 1
    if (totalDays <= 30) return 0.6
    return 0.3
  }

  private getGlowSpeed(countdown: CountdownItem): number {
    const urgency = this.getUrgencyFactor(countdown)
    return 0.015 + urgency * 0.025
  }

  private renderStaticBackground() {
    if (!this.bgCtx || !this.bgCanvas || !this.options) return
    const { width, height, countdown, style, allCountdowns } = this.options
    const diff = calculateDiff(countdown.targetDate)

    this.bgCanvas.width = width
    this.bgCanvas.height = height
    const ctx = this.bgCtx

    drawBackground(ctx, width, height, countdown, style, !!countdown.backgroundImage)
    drawCountdownContent(ctx, width, height, countdown, diff, style)

    if (allCountdowns && allCountdowns.length > 1) {
      drawOtherCountdowns(ctx, width, height, allCountdowns.filter(c => c.id !== countdown.id && c.showOnWallpaper), style)
    }

    drawFooter(ctx, width, height, countdown, style)
  }

  private renderLoop() {
    if (!this.isRunning || !this.ctx || !this.canvas || !this.options) return

    const now = performance.now()
    const deltaTime = now - this.lastFrameTime

    if (deltaTime >= this.frameInterval) {
      this.lastFrameTime = now - (deltaTime % this.frameInterval)
      const diff = calculateDiff(this.options.countdown.targetDate)
      this.checkNumberFlip(diff)
      this.updateParticles(deltaTime)
      this.glowPhase += this.getGlowSpeed(this.options.countdown) * this.getIntensityFactor()
      this.updateProgressBar()
      this.renderFrame(diff)
    }

    this.animationId = requestAnimationFrame(() => this.renderLoop())
  }

  private checkNumberFlip(diff: ReturnType<typeof calculateDiff>) {
    const values = { days: diff.days, hours: diff.hours, minutes: diff.minutes, seconds: diff.seconds }
    const keys = ['seconds', 'minutes', 'hours', 'days'] as const

    keys.forEach((key, index) => {
      if (this.prevDiffValues[key] !== values[key] && this.prevDiffValues[key] !== -1) {
        this.flipAnimations[index] = {
          value: values[key].toString(),
          start: performance.now(),
          duration: 400 / this.getIntensityFactor()
        }
      }
      this.prevDiffValues[key] = values[key]
    })
  }

  private updateProgressBar() {
    if (!this.options) return
    const { countdown } = this.options
    const createdAt = dayjs(countdown.createdAt).valueOf()
    const targetAt = dayjs(countdown.targetDate).valueOf()
    const now = Date.now()
    const total = targetAt - createdAt
    const elapsed = now - createdAt
    this.progressBarWidth = Math.max(0, Math.min(1, total > 0 ? elapsed / total : 1))
  }

  private renderFrame(diff: ReturnType<typeof calculateDiff>) {
    if (!this.ctx || !this.canvas || !this.options) return
    const { width, height, countdown, animatedConfig, style } = this.options
    const textColor = countdown.textColor

    this.ctx.clearRect(0, 0, width, height)

    if (this.bgCanvas) {
      this.ctx.drawImage(this.bgCanvas, 0, 0)
    }

    if (animatedConfig.breathingGlow) {
      this.renderBreathingGlow(countdown)
    }

    if (animatedConfig.particleFlow && this.particles.length > 0) {
      this.renderParticles(countdown, style)
    }

    if (animatedConfig.numberFlip) {
      this.renderAnimatedNumbers(diff, countdown, style)
    }

    if (animatedConfig.progressBar) {
      this.renderProgressBar(countdown)
    }

    if (textColor === '#ffffff') {
      // no-op, light text already visible on dark bg
    }
  }

  private renderBreathingGlow(countdown: CountdownItem) {
    if (!this.ctx || !this.canvas) return
    const { width, height } = this.canvas
    const factor = this.getIntensityFactor()
    const baseAlpha = 0.12 * factor
    const pulseAmount = 0.08 * factor
    const alpha = baseAlpha + Math.sin(this.glowPhase) * pulseAmount
    const urgency = this.getUrgencyFactor(countdown)

    const color = countdown.color
    const rgb = hexToRgb(color)

    const gradient = this.ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.2,
      width / 2, height / 2, Math.max(width, height) * 0.7
    )
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    gradient.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`)
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`)

    this.ctx.save()
    this.ctx.globalCompositeOperation = 'screen'
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, width, height)

    const edgeThickness = 40 + urgency * 30
    const edgeAlpha = alpha * (0.6 + urgency * 0.4)

    const topGrad = this.ctx.createLinearGradient(0, 0, 0, edgeThickness)
    topGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${edgeAlpha})`)
    topGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    this.ctx.fillStyle = topGrad
    this.ctx.fillRect(0, 0, width, edgeThickness)

    const bottomGrad = this.ctx.createLinearGradient(0, height - edgeThickness, 0, height)
    bottomGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    bottomGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${edgeAlpha})`)
    this.ctx.fillStyle = bottomGrad
    this.ctx.fillRect(0, height - edgeThickness, width, edgeThickness)

    const leftGrad = this.ctx.createLinearGradient(0, 0, edgeThickness, 0)
    leftGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${edgeAlpha})`)
    leftGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    this.ctx.fillStyle = leftGrad
    this.ctx.fillRect(0, 0, edgeThickness, height)

    const rightGrad = this.ctx.createLinearGradient(width - edgeThickness, 0, width, 0)
    rightGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    rightGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${edgeAlpha})`)
    this.ctx.fillStyle = rightGrad
    this.ctx.fillRect(width - edgeThickness, 0, edgeThickness, height)

    this.ctx.restore()
  }

  private renderParticles(countdown: CountdownItem, style: WallpaperStyle) {
    if (!this.ctx) return
    const isLight = style === 'minimal' || style === 'elegant'
    const particleColor = isLight ? countdown.color : countdown.textColor
    const rgb = hexToRgb(particleColor)

    this.ctx.save()
    for (const p of this.particles) {
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.alpha})`
      this.ctx.fill()
    }
    this.ctx.restore()
  }

  private renderAnimatedNumbers(diff: ReturnType<typeof calculateDiff>, countdown: CountdownItem, style: WallpaperStyle) {
    if (!this.ctx || !this.canvas) return
    const { width, height } = this.canvas
    const centerX = width / 2
    const centerY = height * 0.45
    const textColor = countdown.textColor
    const isLight = style === 'minimal' || style === 'elegant'

    const now = performance.now()
    const flipData = [
      { value: diff.days.toString(), label: '天', y: centerY + height * 0.02, fontSize: countdown.fontSize || Math.floor(width * 0.12), unitOffset: 1.3, anim: this.flipAnimations[3], isPast: diff.isPast },
      { value: padZero(diff.hours), label: '', y: centerY + height * 0.13, fontSize: Math.floor(width * 0.022), unitOffset: 0, anim: this.flipAnimations[2] },
      { value: padZero(diff.minutes), label: '', y: centerY + height * 0.13, fontSize: Math.floor(width * 0.022), unitOffset: 0, anim: this.flipAnimations[1], offset: Math.floor(width * 0.022) * 2.2 },
      { value: padZero(diff.seconds), label: '', y: centerY + height * 0.13, fontSize: Math.floor(width * 0.022), unitOffset: 0, anim: this.flipAnimations[0], offset: Math.floor(width * 0.022) * 4.4 }
    ]

    this.ctx.save()
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'

    for (const item of flipData) {
      let displayValue = item.value
      let scaleY = 1
      let opacity = 1
      let skewX = 0

      if (item.anim) {
        const elapsed = now - item.anim.start
        const progress = Math.min(1, elapsed / item.anim.duration)
        if (progress < 1) {
          const easeProgress = 1 - Math.pow(1 - progress, 3)
          scaleY = 1 - Math.sin(easeProgress * Math.PI) * 0.35
          opacity = 0.4 + Math.sin(easeProgress * Math.PI) * 0.6
          skewX = Math.sin(easeProgress * Math.PI) * 0.08
        } else {
          item.anim = undefined as any
        }
      }

      if (item.isPast && item === flipData[0]) {
        displayValue = `+${displayValue}`
      }

      this.ctx.save()
      this.ctx.globalAlpha = opacity
      this.ctx.font = `${item === flipData[0] ? '200' : '400'} ${item.fontSize}px -apple-system, "PingFang SC", sans-serif`
      this.ctx.fillStyle = textColor

      let x = centerX
      if (item.offset) {
        x = centerX - item.fontSize * 2.2 + item.offset
      }

      this.ctx.translate(x, item.y)
      this.ctx.transform(1, skewX, 0, scaleY, 0, 0)
      this.ctx.fillText(displayValue, 0, 0)
      this.ctx.restore()

      if (item.label && item === flipData[0]) {
        this.ctx.save()
        this.ctx.font = `400 ${Math.floor(width * 0.018)}px -apple-system, "PingFang SC", sans-serif`
        const titleColor = textColor === '#ffffff' ? '#ffffff' : countdown.color
        const unitRgb = hexToRgb(titleColor)
        this.ctx.fillStyle = `rgba(${unitRgb.r}, ${unitRgb.g}, ${unitRgb.b}, ${isLight ? 0.6 : 0.8})`
        this.ctx.fillText(item.label, centerX + item.fontSize * item.unitOffset, item.y)
        this.ctx.restore()
      }
    }

    this.ctx.restore()
  }

  private renderProgressBar(countdown: CountdownItem) {
    if (!this.ctx || !this.canvas) return
    const { width, height } = this.canvas
    const barHeight = 3
    const barY = height - 8
    const padding = width * 0.1
    const barWidth = width - padding * 2

    const color = countdown.color
    const rgb = hexToRgb(color)

    this.ctx.save()

    this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
    this.ctx.fillRect(padding, barY, barWidth, barHeight)

    const progressWidth = barWidth * this.progressBarWidth
    const gradient = this.ctx.createLinearGradient(padding, barY, padding + progressWidth, barY)
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`)
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.95)`)
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(padding, barY, progressWidth, barHeight)

    if (progressWidth > 0) {
      const glowGrad = this.ctx.createRadialGradient(
        padding + progressWidth, barY + barHeight / 2, 0,
        padding + progressWidth, barY + barHeight / 2, 12
      )
      glowGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`)
      glowGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
      this.ctx.fillStyle = glowGrad
      this.ctx.fillRect(padding + progressWidth - 12, barY - 6, 24, barHeight + 12)
    }

    this.ctx.font = `300 ${Math.floor(width * 0.007)}px -apple-system, "PingFang SC", sans-serif`
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'bottom'
    this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`
    this.ctx.fillText(`${Math.floor(this.progressBarWidth * 100)}%`, padding, barY - 4)
    this.ctx.textAlign = 'right'
    this.ctx.fillText(formatDate(countdown.targetDate), padding + barWidth, barY - 4)

    this.ctx.restore()
  }
}
