import {
  AnimatedWallpaperRenderer,
  type AnimatedRenderOptions,
  hexToRgb,
  rgba,
  drawBackground,
  drawCountdownContent,
  drawOtherCountdowns,
  drawFooter
} from './wallpaperRenderer'
import {
  calculateDiff,
  formatDate,
  padZero
} from '.'
import type {
  CountdownItem,
  WallpaperStyle,
  AnimatedWallpaperConfig,
  InteractiveWallpaperConfig,
  MousePosition,
  HotCornerArea,
  ExpandedInfoPanel,
  ScheduleItem,
  WeatherInfo
} from '@/types'
import dayjs from 'dayjs'

export interface InteractiveRenderOptions {
  width: number
  height: number
  countdown: CountdownItem
  style: WallpaperStyle
  allCountdowns?: CountdownItem[]
  animatedConfig: AnimatedWallpaperConfig
  interactiveConfig: InteractiveWallpaperConfig
}

interface InteractiveParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  baseAlpha: number
  color: string
}

interface TrailPoint {
  x: number
  y: number
  alpha: number
  size: number
}

export interface InteractionHooks {
  onCountdownClick?: () => void
  onDoubleClick?: () => void
  onHotCorner?: (area: HotCornerArea) => void
  onIdleEnter?: () => void
  onIdleLeave?: () => void
}

export class InteractiveWallpaperRenderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private bgCanvas: HTMLCanvasElement | null = null
  private bgCtx: CanvasRenderingContext2D | null = null

  private options: InteractiveRenderOptions | null = null
  private animationId: number | null = null
  private isRunning = false
  private lastFrameTime = 0
  private frameInterval = 1000 / 30
  private targetFps = 30

  private hasData = false
  private lastRenderTime = 0
  private visible = true

  private mouse: MousePosition = { x: -1000, y: -1000 }
  private smoothMouse: MousePosition = { x: -1000, y: -1000 }
  private mouseActive = false
  private particles: InteractiveParticle[] = []
  private trail: TrailPoint[] = []

  private glowPhase = 0
  private prevDiffValues = { days: -1, hours: -1, minutes: -1, seconds: -1 }
  private flipAnimations: { value: string; start: number; duration: number }[] = []
  private progressBarWidth = 0

  private lastActivityTime = 0
  private isIdle = false
  private idleExpandProgress = 0
  private expandedInfo: ExpandedInfoPanel = {
    schedule: [],
    weather: null,
    nextCountdowns: []
  }

  private clickCount = 0
  private lastClickTime = 0
  private hotCornerHover: HotCornerArea = 'none'
  private hooks: InteractionHooks = {}

  private countdownHitbox: { x: number; y: number; w: number; h: number } | null = null
  private hoverCountdown = false

  private performanceMonitor = {
    frameCount: 0,
    lastMeasureTime: 0,
    currentFps: 0,
    adaptiveFps: true
  }

  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: true })!
    this.bgCanvas = document.createElement('canvas')
    this.bgCtx = this.bgCanvas.getContext('2d')!
    this.lastActivityTime = Date.now()
    this.generateMockExpandedInfo()
  }

  unmount() {
    this.stop()
    this.canvas = null
    this.ctx = null
    this.bgCanvas = null
    this.bgCtx = null
  }

  setHooks(hooks: InteractionHooks) {
    this.hooks = hooks
  }

  setVisible(visible: boolean) {
    this.visible = visible
    if (!visible) {
      this.targetFps = 5
      this.frameInterval = 1000 / this.targetFps
    } else if (this.options) {
      this.targetFps = Math.max(10, Math.min(30, this.options.animatedConfig.fpsLimit || 24))
      this.frameInterval = 1000 / this.targetFps
    }
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
      this.initInteractiveParticles()
    }
  }

  updateOptions(options: InteractiveRenderOptions) {
    this.options = options
    this.hasData = true
    this.targetFps = Math.max(10, Math.min(30, options.animatedConfig.fpsLimit || 24))
    this.frameInterval = 1000 / this.targetFps
    this.renderStaticBackground()
    this.initInteractiveParticles()
    this.updateExpandedInfoCountdowns()
  }

  setHasData(value: boolean) {
    this.hasData = value
  }

  setMousePosition(x: number, y: number) {
    this.mouse.x = x
    this.mouse.y = y
    this.mouseActive = true
    this.resetIdle()
  }

  handleClick(x: number, y: number) {
    this.resetIdle()
    const now = Date.now()

    this.clickCount++
    if (now - this.lastClickTime < 300 && this.clickCount >= 2) {
      this.clickCount = 0
      this.hooks.onDoubleClick?.()
      return
    }
    this.lastClickTime = now
    setTimeout(() => {
      if (Date.now() - this.lastClickTime >= 280) {
        this.clickCount = 0
      }
    }, 300)

    if (this.countdownHitbox) {
      const { x: hx, y: hy, w, h } = this.countdownHitbox
      if (x >= hx - w / 2 && x <= hx + w / 2 && y >= hy - h / 2 && y <= hy + h / 2) {
        this.hooks.onCountdownClick?.()
        return
      }
    }

    const hotCorner = this.getHotCornerAt(x, y)
    if (hotCorner !== 'none' && this.options?.interactiveConfig.hotCornerEnabled) {
      this.hooks.onHotCorner?.(hotCorner)
    }
  }

  private getHotCornerAt(x: number, y: number): HotCornerArea {
    if (!this.options) return 'none'
    const { width, height } = this.options
    const cornerSize = Math.min(width, height) * 0.08

    if (x < cornerSize && y < cornerSize) return 'top-left'
    if (x > width - cornerSize && y < cornerSize) return 'top-right'
    if (x < cornerSize && y > height - cornerSize) return 'bottom-left'
    if (x > width - cornerSize && y > height - cornerSize) return 'bottom-right'
    return 'none'
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastFrameTime = performance.now()
    this.performanceMonitor.lastMeasureTime = performance.now()
    this.renderLoop()
  }

  stop() {
    this.isRunning = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private resetIdle() {
    this.lastActivityTime = Date.now()
    if (this.isIdle) {
      this.isIdle = false
      this.hooks.onIdleLeave?.()
    }
  }

  private checkIdle() {
    if (!this.options?.interactiveConfig.idleExpandEnabled) return
    const now = Date.now()
    const delay = this.options.interactiveConfig.idleExpandDelayMs
    if (!this.isIdle && now - this.lastActivityTime > delay) {
      this.isIdle = true
      this.hooks.onIdleEnter?.()
    }
  }

  private updateIdleAnimation(deltaTime: number) {
    const target = this.isIdle ? 1 : 0
    const speed = 0.002
    const diff = target - this.idleExpandProgress
    if (Math.abs(diff) > 0.001) {
      this.idleExpandProgress += diff * Math.min(1, deltaTime * speed)
    } else {
      this.idleExpandProgress = target
    }
  }

  private generateMockExpandedInfo() {
    this.expandedInfo.schedule = [
      { id: '1', title: '项目评审会议', time: '10:00', color: '#4F46E5' },
      { id: '2', title: '团队周会', time: '14:30', color: '#10B981' },
      { id: '3', title: '产品设计评审', time: '16:00', color: '#F59E0B' }
    ]
    this.expandedInfo.weather = {
      temperature: 26,
      condition: '多云',
      icon: '⛅',
      city: '本地'
    }
  }

  private updateExpandedInfoCountdowns() {
    if (this.options?.allCountdowns) {
      this.expandedInfo.nextCountdowns = this.options.allCountdowns
        .filter(c => !c.expired)
        .slice(0, 3)
    }
  }

  private initInteractiveParticles() {
    if (!this.options) return
    const config = this.options.interactiveConfig.interactiveParticles
    if (!config.enabled || !this.options.interactiveConfig.mouseFollowParticles) {
      this.particles = []
      return
    }

    const { width, height, countdown } = this.options
    const isLight = this.options.style === 'minimal' || this.options.style === 'elegant'
    const color = isLight ? countdown.color : countdown.textColor

    this.particles = []
    for (let i = 0; i < config.count; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        size: 1.5 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.5,
        baseAlpha: 0.3 + Math.random() * 0.5,
        color
      })
    }
  }

  private updateInteractiveParticles(deltaTime: number) {
    if (!this.options || this.particles.length === 0) return
    const { width, height, interactiveConfig } = this.options
    const config = interactiveConfig.interactiveParticles
    if (!config.enabled || !interactiveConfig.mouseFollowParticles) return

    const dt = deltaTime / 16

    for (const p of this.particles) {
      if (this.mouseActive && this.mouse.x > -100 && this.mouse.y > -100) {
        const dx = this.mouse.x - p.x
        const dy = this.mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = Math.min(width, height) * 0.25

        if (dist < maxDist && dist > 0.1) {
          const force = (1 - dist / maxDist) * config.followStrength * dt
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }
      }

      p.vx *= 0.96
      p.vy *= 0.96

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
      if (speed > config.maxSpeed) {
        p.vx = (p.vx / speed) * config.maxSpeed
        p.vy = (p.vy / speed) * config.maxSpeed
      }

      p.x += p.vx
      p.y += p.vy

      if (p.x < -20) p.x = width + 20
      if (p.x > width + 20) p.x = -20
      if (p.y < -20) p.y = height + 20
      if (p.y > height + 20) p.y = -20

      if (this.mouseActive && this.mouse.x > -100) {
        const dx = this.mouse.x - p.x
        const dy = this.mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const glowDist = Math.min(width, height) * 0.18
        if (dist < glowDist) {
          p.alpha = Math.min(1, p.baseAlpha + (1 - dist / glowDist) * 0.6)
        } else {
          p.alpha = p.baseAlpha
        }
      } else {
        p.alpha = p.baseAlpha
      }
    }
  }

  private updateMouseTrail(deltaTime: number) {
    if (!this.options || !this.options.interactiveConfig.mouseTrail.enabled) return
    const config = this.options.interactiveConfig.mouseTrail

    if (this.mouseActive && this.mouse.x > -100 && this.mouse.y > -100) {
      this.trail.unshift({
        x: this.mouse.x,
        y: this.mouse.y,
        alpha: 0.8,
        size: 4 + Math.random() * 3
      })
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].alpha -= config.fadeSpeed * (deltaTime / 16)
      if (this.trail[i].alpha <= 0) {
        this.trail.splice(i, 1)
      }
    }

    while (this.trail.length > config.length) {
      this.trail.pop()
    }
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

    const centerX = width / 2
    const centerY = height * 0.45
    const daysFontSize = countdown.fontSize || Math.floor(width * 0.12)
    this.countdownHitbox = {
      x: centerX,
      y: centerY + height * 0.02,
      w: daysFontSize * 3,
      h: daysFontSize * 1.2
    }
  }

  private checkNumberFlip(diff: ReturnType<typeof calculateDiff>) {
    const values = { days: diff.days, hours: diff.hours, minutes: diff.minutes, seconds: diff.seconds }
    const keys = ['seconds', 'minutes', 'hours', 'days'] as const

    keys.forEach((key, index) => {
      if (this.prevDiffValues[key] !== values[key] && this.prevDiffValues[key] !== -1) {
        const intensity = this.options?.animatedConfig.intensity || 'medium'
        const factors: Record<string, number> = { low: 0.5, medium: 1.0, high: 1.8 }
        const factor = factors[intensity]
        this.flipAnimations[index] = {
          value: values[key].toString(),
          start: performance.now(),
          duration: 400 / factor
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

  private getIntensityFactor(): number {
    const intensity = this.options?.animatedConfig.intensity || 'medium'
    const factors: Record<string, number> = { low: 0.5, medium: 1.0, high: 1.8 }
    return factors[intensity]
  }

  private updateHoverState() {
    if (!this.countdownHitbox || this.mouse.x < -100) {
      this.hoverCountdown = false
      return
    }
    const { x: hx, y: hy, w, h } = this.countdownHitbox
    this.hoverCountdown =
      this.mouse.x >= hx - w / 2 &&
      this.mouse.x <= hx + w / 2 &&
      this.mouse.y >= hy - h / 2 &&
      this.mouse.y <= hy + h / 2

    this.hotCornerHover = this.options?.interactiveConfig.hotCornerEnabled
      ? this.getHotCornerAt(this.mouse.x, this.mouse.y)
      : 'none'
  }

  private renderLoop() {
    if (!this.isRunning || !this.ctx || !this.canvas || !this.options) return

    const now = performance.now()
    const deltaTime = now - this.lastFrameTime

    if (deltaTime >= this.frameInterval) {
      this.lastFrameTime = now - (deltaTime % this.frameInterval)

      this.performanceMonitor.frameCount++
      if (now - this.performanceMonitor.lastMeasureTime >= 1000) {
        this.performanceMonitor.currentFps = this.performanceMonitor.frameCount
        this.performanceMonitor.frameCount = 0
        this.performanceMonitor.lastMeasureTime = now

        if (this.performanceMonitor.adaptiveFps && this.visible) {
          this.adaptPerformance()
        }
      }

      const diff = calculateDiff(this.options.countdown.targetDate)
      this.checkNumberFlip(diff)
      this.updateInteractiveParticles(deltaTime)
      this.updateMouseTrail(deltaTime)
      this.glowPhase += this.getGlowSpeed(this.options.countdown) * this.getIntensityFactor()
      this.updateProgressBar()
      this.checkIdle()
      this.updateIdleAnimation(deltaTime)
      this.updateHoverState()

      this.smoothMouse.x += (this.mouse.x - this.smoothMouse.x) * 0.15
      this.smoothMouse.y += (this.mouse.y - this.smoothMouse.y) * 0.15

      this.renderFrame(diff)
    }

    this.animationId = requestAnimationFrame(() => this.renderLoop())
  }

  private adaptPerformance() {
    const fps = this.performanceMonitor.currentFps
    if (fps < this.targetFps * 0.7 && this.targetFps > 10) {
      this.targetFps = Math.max(10, Math.floor(this.targetFps * 0.9))
      this.frameInterval = 1000 / this.targetFps
    } else if (fps >= this.targetFps * 1.1 && this.options) {
      const idealFps = Math.max(10, Math.min(30, this.options.animatedConfig.fpsLimit || 24))
      if (this.targetFps < idealFps) {
        this.targetFps = Math.min(idealFps, Math.floor(this.targetFps * 1.1))
        this.frameInterval = 1000 / this.targetFps
      }
    }
  }

  private renderFrame(diff: ReturnType<typeof calculateDiff>) {
    if (!this.ctx || !this.canvas || !this.options) return
    const { width, height, countdown, animatedConfig, style, interactiveConfig } = this.options
    const textColor = countdown.textColor
    const isLight = style === 'minimal' || style === 'elegant'

    this.ctx.clearRect(0, 0, width, height)

    if (this.bgCanvas) {
      this.ctx.drawImage(this.bgCanvas, 0, 0)
    }

    if (animatedConfig.breathingGlow) {
      this.renderBreathingGlow(countdown)
    }

    if (animatedConfig.particleFlow && this.particles.length > 0) {
      this.renderInteractiveParticles(countdown, style)
    }

    if (interactiveConfig.mouseTrail.enabled && this.trail.length > 0) {
      this.renderMouseTrail(countdown, isLight)
    }

    if (animatedConfig.numberFlip) {
      this.renderAnimatedNumbers(diff, countdown, style)
    }

    if (animatedConfig.progressBar) {
      this.renderProgressBar(countdown)
    }

    this.renderMouseHalo(countdown, isLight)
    this.renderHoverIndicators(countdown, textColor)
    this.renderHotCornerHints()

    if (interactiveConfig.idleExpandEnabled && this.idleExpandProgress > 0.01) {
      this.renderExpandedInfo(countdown, isLight)
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

    this.ctx.save()
    this.ctx.globalCompositeOperation = 'screen'

    if (this.mouseActive && this.smoothMouse.x > -100) {
      const mouseGlowGrad = this.ctx.createRadialGradient(
        this.smoothMouse.x, this.smoothMouse.y, 0,
        this.smoothMouse.x, this.smoothMouse.y, Math.min(width, height) * 0.25
      )
      mouseGlowGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 1.5})`)
      mouseGlowGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
      this.ctx.fillStyle = mouseGlowGrad
      this.ctx.fillRect(0, 0, width, height)
    }

    const gradient = this.ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.2,
      width / 2, height / 2, Math.max(width, height) * 0.7
    )
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    gradient.addColorStop(0.6, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`)
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`)

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

    this.ctx.restore()
  }

  private renderInteractiveParticles(countdown: CountdownItem, style: WallpaperStyle) {
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

  private renderMouseTrail(countdown: CountdownItem, isLight: boolean) {
    if (!this.ctx || this.trail.length < 2) return
    const color = isLight ? countdown.color : countdown.textColor
    const rgb = hexToRgb(color)

    this.ctx.save()
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'

    for (let i = 0; i < this.trail.length - 1; i++) {
      const p1 = this.trail[i]
      const p2 = this.trail[i + 1]
      const alpha = p1.alpha
      this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
      this.ctx.lineWidth = p1.size
      this.ctx.beginPath()
      this.ctx.moveTo(p1.x, p1.y)
      this.ctx.lineTo(p2.x, p2.y)
      this.ctx.stroke()
    }
    this.ctx.restore()
  }

  private renderMouseHalo(countdown: CountdownItem, isLight: boolean) {
    if (!this.ctx || !this.mouseActive || this.smoothMouse.x < -100) return
    const color = isLight ? countdown.color : countdown.textColor
    const rgb = hexToRgb(color)

    this.ctx.save()
    this.ctx.globalCompositeOperation = 'screen'

    const haloSize = 40 + Math.sin(this.glowPhase * 2) * 8
    const grad = this.ctx.createRadialGradient(
      this.smoothMouse.x, this.smoothMouse.y, 0,
      this.smoothMouse.x, this.smoothMouse.y, haloSize
    )
    grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`)
    grad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`)
    grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

    this.ctx.fillStyle = grad
    this.ctx.beginPath()
    this.ctx.arc(this.smoothMouse.x, this.smoothMouse.y, haloSize, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.restore()
  }

  private renderHoverIndicators(countdown: CountdownItem, textColor: string) {
    if (!this.ctx || !this.countdownHitbox) return
    const rgb = hexToRgb(textColor === '#ffffff' ? countdown.color : textColor)

    if (this.hoverCountdown) {
      this.ctx.save()
      this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`
      this.ctx.lineWidth = 2
      this.ctx.setLineDash([6, 4])
      this.ctx.strokeRect(
        this.countdownHitbox.x - this.countdownHitbox.w / 2 - 8,
        this.countdownHitbox.y - this.countdownHitbox.h / 2 - 4,
        this.countdownHitbox.w + 16,
        this.countdownHitbox.h + 8
      )
      this.ctx.setLineDash([])

      this.ctx.font = `300 ${Math.floor((this.options?.width || 1920) * 0.008)}px -apple-system, "PingFang SC", sans-serif`
      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`
      this.ctx.textAlign = 'center'
      this.ctx.fillText('点击切换 · 双击打开', this.countdownHitbox.x, this.countdownHitbox.y + this.countdownHitbox.h * 0.9)
      this.ctx.restore()
    }
  }

  private renderHotCornerHints() {
    if (!this.ctx || !this.options || !this.options.interactiveConfig.hotCornerEnabled) return
    const { width, height } = this.options
    const cornerSize = Math.min(width, height) * 0.08
    const activeCorner = this.hotCornerHover

    if (activeCorner === 'none') return

    const corners: Record<Exclude<HotCornerArea, 'none'>, { x: number; y: number; label: string }> = {
      'top-left': { x: cornerSize / 2, y: cornerSize / 2, label: '设置' },
      'top-right': { x: width - cornerSize / 2, y: cornerSize / 2, label: '切换模式' },
      'bottom-left': { x: cornerSize / 2, y: height - cornerSize / 2, label: '迷你窗口' },
      'bottom-right': { x: width - cornerSize / 2, y: height - cornerSize / 2, label: '新建倒计时' }
    }

    const corner = corners[activeCorner]
    if (!corner) return

    const color = hexToRgb(this.options.countdown.color)

    this.ctx.save()
    this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`
    this.ctx.beginPath()
    this.ctx.arc(corner.x, corner.y, cornerSize * 0.7, 0, Math.PI * 2)
    this.ctx.fill()

    this.ctx.font = `400 ${Math.floor(cornerSize * 0.35)}px -apple-system, "PingFang SC", sans-serif`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`
    this.ctx.fillText(corner.label, corner.x, corner.y)
    this.ctx.restore()
  }

  private renderExpandedInfo(countdown: CountdownItem, isLight: boolean) {
    if (!this.ctx || !this.options) return
    const ctx = this.ctx
    const { width, height } = this.options
    const progress = this.idleExpandProgress
    const panelColor = isLight ? countdown.color : countdown.textColor
    const rgb = hexToRgb(panelColor)
    const textRgb = isLight ? hexToRgb(countdown.color) : hexToRgb(countdown.textColor)

    const panelWidth = width * 0.28 * progress
    const panelX = width * 0.02
    const panelY = height * 0.05
    const panelHeight = height * 0.85

    if (panelWidth < 2) return

    ctx.save()

    ctx.fillStyle = `rgba(${isLight ? 255 : rgb.r}, ${isLight ? 255 : rgb.g}, ${isLight ? 255 : rgb.b}, ${isLight ? 0.92 : 0.88})`
    ctx.beginPath()
    this.roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 16)
    ctx.fill()

    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.3 * progress})`
    ctx.lineWidth = 1
    ctx.stroke()

    if (progress < 0.15) {
      ctx.restore()
      return
    }

    const contentProgress = Math.min(1, (progress - 0.1) / 0.9)
    ctx.globalAlpha = contentProgress

    const titleSize = Math.floor(panelWidth * 0.08)
    const subSize = Math.floor(panelWidth * 0.055)
    const bodySize = Math.floor(panelWidth * 0.045)
    const paddingX = panelWidth * 0.08
    let currentY = panelY + panelHeight * 0.05

    ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.95)`
    ctx.font = `600 ${titleSize}px -apple-system, "PingFang SC", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('今日概览', panelX + paddingX, currentY)
    currentY += titleSize * 1.8

    if (this.expandedInfo.weather) {
      const w = this.expandedInfo.weather
      ctx.font = `${subSize * 2}px -apple-system, "Segoe UI Emoji", sans-serif`
      ctx.fillText(w.icon, panelX + paddingX, currentY)

      ctx.font = `600 ${subSize * 1.5}px -apple-system, "PingFang SC", sans-serif`
      ctx.fillText(`${w.temperature}°C`, panelX + paddingX + subSize * 2.5, currentY + subSize * 0.3)

      ctx.font = `400 ${subSize}px -apple-system, "PingFang SC", sans-serif`
      ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.7)`
      ctx.fillText(`${w.condition} · ${w.city}`, panelX + paddingX + subSize * 2.5, currentY + subSize * 2)
      currentY += subSize * 5
    }

    ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.9)`
    ctx.font = `600 ${subSize}px -apple-system, "PingFang SC", sans-serif`
    ctx.fillText('今日日程', panelX + paddingX, currentY)
    currentY += subSize * 1.5

    this.expandedInfo.schedule.forEach((item) => {
      const itemColor = hexToRgb(item.color)
      ctx.fillStyle = `rgba(${itemColor.r}, ${itemColor.g}, ${itemColor.b}, 1)`
      ctx.beginPath()
      ctx.arc(panelX + paddingX + 4, currentY + bodySize * 0.5, 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.9)`
      ctx.font = `400 ${bodySize}px -apple-system, "PingFang SC", sans-serif`
      ctx.fillText(item.title, panelX + paddingX + 16, currentY)

      ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.6)`
      ctx.font = `300 ${bodySize}px -apple-system, "PingFang SC", sans-serif`
      ctx.textAlign = 'right'
      ctx.fillText(item.time, panelX + panelWidth - paddingX, currentY)
      ctx.textAlign = 'left'
      currentY += bodySize * 1.6
    })

    currentY += subSize
    ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.9)`
    ctx.font = `600 ${subSize}px -apple-system, "PingFang SC", sans-serif`
    ctx.fillText('即将到来', panelX + paddingX, currentY)
    currentY += subSize * 1.5

    this.expandedInfo.nextCountdowns.forEach((cd) => {
      const cdColor = hexToRgb(cd.color)
      const diff = calculateDiff(cd.targetDate)
      ctx.fillStyle = `rgba(${cdColor.r}, ${cdColor.g}, ${cdColor.b}, 1)`
      ctx.beginPath()
      ctx.arc(panelX + paddingX + 4, currentY + bodySize * 0.5, 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.9)`
      ctx.font = `400 ${bodySize}px -apple-system, "PingFang SC", sans-serif`
      const title = cd.title.length > 12 ? cd.title.slice(0, 12) + '...' : cd.title
      ctx.fillText(title, panelX + paddingX + 16, currentY)

      ctx.fillStyle = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.6)`
      ctx.font = `300 ${bodySize}px -apple-system, "PingFang SC", sans-serif`
      ctx.textAlign = 'right'
      const dayText = diff.isPast ? `+${diff.days}天` : `${diff.days}天`
      ctx.fillText(dayText, panelX + panelWidth - paddingX, currentY)
      ctx.textAlign = 'left'
      currentY += bodySize * 1.6
    })

    ctx.restore()
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
      { value: diff.days.toString(), label: '天', y: centerY + height * 0.02, fontSize: countdown.fontSize || Math.floor(width * 0.12), unitOffset: 1.3, anim: this.flipAnimations[3], isPast: diff.isPast, key: 'days' },
      { value: padZero(diff.hours), label: '', y: centerY + height * 0.13, fontSize: Math.floor(width * 0.022), unitOffset: 0, anim: this.flipAnimations[2], key: 'hours' },
      { value: padZero(diff.minutes), label: '', y: centerY + height * 0.13, fontSize: Math.floor(width * 0.022), unitOffset: 0, anim: this.flipAnimations[1], key: 'minutes', offset: Math.floor(width * 0.022) * 2.2 },
      { value: padZero(diff.seconds), label: '', y: centerY + height * 0.13, fontSize: Math.floor(width * 0.022), unitOffset: 0, anim: this.flipAnimations[0], key: 'seconds', offset: Math.floor(width * 0.022) * 4.4 }
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

      if (item.isPast && item.key === 'days') {
        displayValue = `+${displayValue}`
      }

      if (this.hoverCountdown && item.key === 'days') {
        opacity *= 1.1
        scaleY *= 1.02
      }

      this.ctx.save()
      this.ctx.globalAlpha = opacity
      this.ctx.font = `${item.key === 'days' ? '200' : '400'} ${item.fontSize}px -apple-system, "PingFang SC", sans-serif`
      this.ctx.fillStyle = textColor

      let x = centerX
      if (item.offset) {
        x = centerX - item.fontSize * 2.2 + item.offset
      }

      this.ctx.translate(x, item.y)
      this.ctx.transform(1, skewX, 0, scaleY, 0, 0)
      this.ctx.fillText(displayValue, 0, 0)
      this.ctx.restore()

      if (item.label && item.key === 'days') {
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

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }
}
