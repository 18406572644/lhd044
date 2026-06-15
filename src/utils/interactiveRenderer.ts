import type { CountdownItem, WallpaperStyle, InteractiveWallpaperConfig, InteractiveState, InteractiveAction } from '@/types'
import { calculateDiff, formatDate, padZero } from '@/utils'
import { InteractiveWallpaperEngine, type CountdownHitBox } from '@/utils/interactiveWallpaper'

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

export interface InteractiveRenderOptions {
  width: number
  height: number
  countdown: CountdownItem
  style: WallpaperStyle
  allCountdowns?: CountdownItem[]
  interactiveConfig: InteractiveWallpaperConfig
  interactiveState: InteractiveState
  onCountdownHitBox?: (hitBox: CountdownHitBox) => void
}

export class InteractiveRenderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private bgCanvas: HTMLCanvasElement | null = null
  private bgCtx: CanvasRenderingContext2D | null = null
  private engine: InteractiveWallpaperEngine | null = null
  private currentCountdown: CountdownItem | null = null
  private currentStyle: WallpaperStyle = 'gradient'
  private animationId: number | null = null
  private isRunning = false
  private lastTickTime = 0
  private tickInterval = 1000

  constructor() {
    this.engine = new InteractiveWallpaperEngine({
      particles: { count: 40, minSize: 1, maxSize: 3, speed: 0.5, color: '#ffffff', opacity: 0.6, trailLength: 0 },
      glow: { enabled: true, radius: 200, color: '#7ec8e3', opacity: 0.15, pulseSpeed: 0.02 },
      mouseFollow: { enabled: true, influence: 150, smoothing: 0.08, particleAttraction: 0.3, glowFollow: true },
      idleDetection: { enabled: true, timeoutMs: 5000, expandedInfoTypes: ['schedule', 'weather', 'quote'] },
      hotZones: [],
      clickThrough: false,
      showCountdownClickHint: true,
      doubleClickOpenMain: true
    })
  }

  getEngine(): InteractiveWallpaperEngine {
    return this.engine!
  }

  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: true })!
    this.bgCanvas = document.createElement('canvas')
    this.bgCtx = this.bgCanvas.getContext('2d')!
    this.engine!.mount(canvas)
  }

  unmount() {
    this.stop()
    this.engine!.unmount()
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
    this.engine!.updateConfig(this.engine!['config'])
    if (this.currentCountdown) {
      this.renderStaticBackground({
        width,
        height,
        countdown: this.currentCountdown,
        style: this.currentStyle,
        interactiveConfig: this.engine!['config'],
        interactiveState: this.engine!.getState()
      })
    }
  }

  updateOptions(options: InteractiveRenderOptions) {
    this.currentCountdown = options.countdown
    this.currentStyle = options.style
    this.engine!.updateConfig(options.interactiveConfig)
    this.renderStaticBackground(options)
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTickTime = performance.now()
    this.engine!.start()
    this.renderLoop()
  }

  stop() {
    this.isRunning = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.engine!.stop()
  }

  private renderLoop() {
    if (!this.isRunning || !this.ctx || !this.canvas) return

    const now = performance.now()
    if (now - this.lastTickTime >= this.tickInterval) {
      this.lastTickTime = now
      this.renderStaticBackground({
        width: this.canvas.width,
        height: this.canvas.height,
        countdown: this.currentCountdown!,
        style: this.currentStyle,
        interactiveConfig: this.engine!['config'],
        interactiveState: this.engine!.getState()
      })
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.bgCanvas) {
      this.ctx.drawImage(this.bgCanvas, 0, 0)
    }

    this.animationId = requestAnimationFrame(() => this.renderLoop())
  }

  private renderStaticBackground(options: InteractiveRenderOptions) {
    if (!this.bgCtx || !this.bgCanvas || !options.countdown) return

    const { width, height, countdown, style, interactiveState } = options
    const diff = calculateDiff(countdown.targetDate)

    this.bgCanvas.width = width
    this.bgCanvas.height = height
    const ctx = this.bgCtx

    this.drawBackground(ctx, width, height, countdown, style)

    this.drawCountdownContent(ctx, width, height, countdown, diff, style)

    if (interactiveState === 'expanded') {
      this.drawExpandedInfo(ctx, width, height, countdown, style)
    }

    const hitBox = this.computeCountdownHitBox(width, height, diff)
    if (options.onCountdownHitBox) {
      options.onCountdownHitBox(hitBox)
    }
    this.engine!.setCountdownHitBox(hitBox)
  }

  private computeCountdownHitBox(width: number, height: number, diff: ReturnType<typeof calculateDiff>): CountdownHitBox {
    const centerX = width / 2
    const centerY = height * 0.45
    const daysFontSize = this.currentCountdown?.fontSize || Math.floor(width * 0.12)
    return {
      x: centerX - daysFontSize * 1.8,
      y: centerY - height * 0.1,
      width: daysFontSize * 3.6,
      height: height * 0.35
    }
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    countdown: CountdownItem,
    style: WallpaperStyle
  ) {
    const { bgGradientFrom, bgGradientTo } = countdown

    switch (style) {
      case 'gradient': {
        const gradient = ctx.createLinearGradient(0, 0, width, height)
        gradient.addColorStop(0, bgGradientFrom)
        gradient.addColorStop(1, bgGradientTo)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
        this.drawDecorativeCircles(ctx, width, height, bgGradientFrom, bgGradientTo)
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
          const color = i % 2 === 0 ? bgGradientFrom : bgGradientTo
          const rgb = hexToRgb(color)
          blurGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`)
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
        const rgb = hexToRgb(bgGradientFrom)
        sideGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`)
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
        const rgbFrom = hexToRgb(bgGradientFrom)
        const rgbTo = hexToRgb(bgGradientTo)
        gradient.addColorStop(0, `rgba(${rgbFrom.r}, ${rgbFrom.g}, ${rgbFrom.b}, 0.15)`)
        gradient.addColorStop(0.5, `rgba(${rgbTo.r}, ${rgbTo.g}, ${rgbTo.b}, 0.25)`)
        gradient.addColorStop(1, `rgba(${rgbFrom.r}, ${rgbFrom.g}, ${rgbFrom.b}, 0.15)`)
        ctx.fillStyle = gradient
        ctx.fillRect(0, height * 0.3, width, height * 0.4)
        const rgbColor = hexToRgb(countdown.color)
        ctx.strokeStyle = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.3)`
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

  private drawDecorativeCircles(
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

  private drawCountdownContent(
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
    const isLight = style === 'minimal' || style === 'elegant'

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
    const titleColor = textColor === '#ffffff' ? '#ffffff' : countdown.color
    const rgb = hexToRgb(titleColor)
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isLight ? 0.7 : 0.9})`
    ctx.fillText(countdown.title, centerX, centerY - height * 0.08)

    const daysFontSize = countdown.fontSize || Math.floor(width * 0.12)
    ctx.font = `200 ${daysFontSize}px -apple-system, "PingFang SC", sans-serif`
    ctx.fillStyle = textColor
    const daysText = diff.isPast ? `+${diff.days}` : diff.days.toString()
    ctx.fillText(daysText, centerX, centerY + height * 0.02)

    ctx.font = `400 ${Math.floor(width * 0.018)}px -apple-system, "PingFang SC", sans-serif`
    const unitRgb = hexToRgb(titleColor)
    ctx.fillStyle = `rgba(${unitRgb.r}, ${unitRgb.g}, ${unitRgb.b}, ${isLight ? 0.6 : 0.8})`
    ctx.fillText('天', centerX + daysFontSize * 1.3, centerY + height * 0.02)

    ctx.font = `400 ${Math.floor(width * 0.022)}px -apple-system, "PingFang SC", sans-serif`
    const timeText = `${padZero(diff.hours)} : ${padZero(diff.minutes)} : ${padZero(diff.seconds)}`
    ctx.fillStyle = `rgba(${unitRgb.r}, ${unitRgb.g}, ${unitRgb.b}, ${isLight ? 0.7 : 0.85})`
    ctx.fillText(timeText, centerX, centerY + height * 0.13)

    ctx.font = `300 ${Math.floor(width * 0.014)}px -apple-system, "PingFang SC", sans-serif`
    ctx.fillStyle = `rgba(${unitRgb.r}, ${unitRgb.g}, ${unitRgb.b}, ${isLight ? 0.5 : 0.7})`
    ctx.fillText(formatDate(countdown.targetDate), centerX, centerY + height * 0.2)

    if (countdown.description) {
      ctx.font = `300 ${Math.floor(width * 0.012)}px -apple-system, "PingFang SC", sans-serif`
      ctx.fillStyle = `rgba(${unitRgb.r}, ${unitRgb.g}, ${unitRgb.b}, ${isLight ? 0.4 : 0.6})`
      ctx.fillText(countdown.description, centerX, centerY + height * 0.25)
    }

    ctx.restore()
  }

  private drawExpandedInfo(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    countdown: CountdownItem,
    style: WallpaperStyle
  ) {
    const y = height * 0.72
    const alpha = 0.6
    const textColor = countdown.textColor

    ctx.save()
    ctx.font = `300 ${Math.floor(width * 0.01)}px -apple-system, "PingFang SC", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const rgb = hexToRgb(textColor)
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`

    const infoItems = [
      `📅 今日：${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}`,
      `🌤 天气：晴 22°C`
    ]

    infoItems.forEach((text, i) => {
      ctx.fillText(text, width / 2, y + i * (width * 0.018))
    })

    ctx.restore()
  }
}
