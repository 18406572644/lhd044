import type {
  InteractiveWallpaperConfig,
  InteractiveAction,
  ParticleConfig,
  GlowConfig,
  MouseFollowConfig,
  IdleDetectionConfig,
  HotZone,
  HotZonePosition,
  InteractiveState
} from '@/types'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  life: number
  maxLife: number
  color: string
  trail: Array<{ x: number; y: number }>
}

export interface MouseState {
  x: number
  y: number
  smoothX: number
  smoothY: number
  isMoving: boolean
  lastMoveTime: number
  isOverCountdown: boolean
}

export interface HotZoneRect {
  x: number
  y: number
  width: number
  height: number
  zone: HotZone
  hover: boolean
}

export interface CountdownHitBox {
  x: number
  y: number
  width: number
  height: number
}

export class InteractiveWallpaperEngine {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private width = 0
  private height = 0
  private config: InteractiveWallpaperConfig
  private particles: Particle[] = []
  private mouse: MouseState = {
    x: 0, y: 0,
    smoothX: 0, smoothY: 0,
    isMoving: false,
    lastMoveTime: 0,
    isOverCountdown: false
  }
  private hotZoneRects: HotZoneRect[] = []
  private countdownHitBox: CountdownHitBox | null = null
  private state: InteractiveState = 'idle'
  private animationId: number | null = null
  private idleTimer: number | null = null
  private lastFrameTime = 0
  private frameCount = 0
  private lastFpsTime = 0
  private currentFps = 0
  private onAction: ((action: InteractiveAction) => void) | null = null
  private onStateChange: ((state: InteractiveState) => void) | null = null
  private doubleClickTimer: number | null = null
  private lastClickTime = 0
  private isRunning = false
  private throttledFrame = false

  constructor(config: InteractiveWallpaperConfig) {
    this.config = config
  }

  setActionHandler(handler: (action: InteractiveAction) => void) {
    this.onAction = handler
  }

  setStateChangeHandler(handler: (state: InteractiveState) => void) {
    this.onStateChange = handler
  }

  updateConfig(config: InteractiveWallpaperConfig) {
    const particleCountChanged = config.particles.count !== this.config.particles.count
    this.config = config
    if (particleCountChanged) {
      this.adjustParticleCount()
    }
    this.rebuildHotZones()
  }

  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: true })!
    this.width = canvas.width
    this.height = canvas.height
    this.mouse.smoothX = this.width / 2
    this.mouse.smoothY = this.height / 2
    this.initParticles()
    this.rebuildHotZones()
    this.bindEvents()
  }

  unmount() {
    this.stop()
    this.unbindEvents()
    this.canvas = null
    this.ctx = null
  }

  resize(width: number, height: number) {
    if (!this.canvas) return
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.rebuildHotZones()
  }

  setCountdownHitBox(hitBox: CountdownHitBox | null) {
    this.countdownHitBox = hitBox
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastFrameTime = performance.now()
    this.lastFpsTime = this.lastFrameTime
    this.frameCount = 0
    this.loop(this.lastFrameTime)
  }

  stop() {
    this.isRunning = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  getState(): InteractiveState {
    return this.state
  }

  getFps(): number {
    return this.currentFps
  }

  private initParticles() {
    this.particles = []
    const count = this.config.particles.count
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle())
    }
  }

  private createParticle(fromMouse = false): Particle {
    const cfg = this.config.particles
    const size = cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize)
    let x: number, y: number
    if (fromMouse && this.config.mouseFollow.enabled) {
      x = this.mouse.smoothX + (Math.random() - 0.5) * 60
      y = this.mouse.smoothY + (Math.random() - 0.5) * 60
    } else {
      x = Math.random() * this.width
      y = Math.random() * this.height
    }
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * cfg.speed,
      vy: (Math.random() - 0.5) * cfg.speed,
      size,
      opacity: cfg.opacity * (0.3 + Math.random() * 0.7),
      life: 0,
      maxLife: 600 + Math.random() * 400,
      color: cfg.color,
      trail: []
    }
  }

  private adjustParticleCount() {
    const target = this.config.particles.count
    while (this.particles.length < target) {
      this.particles.push(this.createParticle())
    }
    while (this.particles.length > target) {
      this.particles.pop()
    }
  }

  private rebuildHotZones() {
    this.hotZoneRects = this.config.hotZones.map(zone => {
      const rect = this.computeHotZoneRect(zone)
      return { ...rect, zone, hover: false }
    })
  }

  private computeHotZoneRect(zone: HotZone): { x: number; y: number; width: number; height: number } {
    const s = zone.size
    const margin = 10
    switch (zone.position) {
      case 'bottom-right':
        return { x: this.width - s - margin, y: this.height - s - margin, width: s, height: s }
      case 'bottom-left':
        return { x: margin, y: this.height - s - margin, width: s, height: s }
      case 'top-right':
        return { x: this.width - s - margin, y: margin, width: s, height: s }
      case 'top-left':
        return { x: margin, y: margin, width: s, height: s }
    }
  }

  private bindEvents() {
    if (!this.canvas) return
    this.canvas.addEventListener('mousemove', this.handleMouseMove)
    this.canvas.addEventListener('click', this.handleClick)
    this.canvas.addEventListener('dblclick', this.handleDblClick)
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave)
  }

  private unbindEvents() {
    if (!this.canvas) return
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('click', this.handleClick)
    this.canvas.removeEventListener('dblclick', this.handleDblClick)
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave)
  }

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas!.getBoundingClientRect()
    this.mouse.x = e.clientX - rect.left
    this.mouse.y = e.clientY - rect.top
    this.mouse.isMoving = true
    this.mouse.lastMoveTime = performance.now()
    this.resetIdleTimer()
    if (this.state !== 'active') {
      this.setState('active')
    }
    this.mouse.isOverCountdown = this.isInCountdownHitBox(this.mouse.x, this.mouse.y)
    for (const hz of this.hotZoneRects) {
      hz.hover = this.isInRect(this.mouse.x, this.mouse.y, hz)
    }
  }

  private handleClick = (e: MouseEvent) => {
    const rect = this.canvas!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const now = performance.now()
    if (now - this.lastClickTime < 300) {
      return
    }
    this.lastClickTime = now

    for (const hz of this.hotZoneRects) {
      if (this.isInRect(x, y, hz)) {
        this.onAction?.({ type: 'hot-zone', zone: hz.zone })
        return
      }
    }

    if (this.countdownHitBox && this.isInCountdownHitBox(x, y)) {
      this.onAction?.({ type: 'switch-countdown', direction: 'next' })
      return
    }

    if (this.config.doubleClickOpenMain) {
      if (this.doubleClickTimer !== null) {
        clearTimeout(this.doubleClickTimer)
        this.doubleClickTimer = null
      }
      this.doubleClickTimer = window.setTimeout(() => {
        this.doubleClickTimer = null
      }, 300)
    }
  }

  private handleDblClick = (_e: MouseEvent) => {
    if (this.config.doubleClickOpenMain) {
      this.onAction?.({ type: 'open-main-window' })
    }
  }

  private handleMouseLeave = () => {
    this.mouse.isMoving = false
    for (const hz of this.hotZoneRects) {
      hz.hover = false
    }
  }

  private isInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
  }

  private isInCountdownHitBox(x: number, y: number): boolean {
    if (!this.countdownHitBox) return false
    return this.isInRect(x, y, this.countdownHitBox)
  }

  private resetIdleTimer() {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    if (this.config.idleDetection.enabled) {
      this.idleTimer = window.setTimeout(() => {
        if (!this.mouse.isMoving) {
          this.setState('expanded')
        }
      }, this.config.idleDetection.timeoutMs)
    }
  }

  private setState(state: InteractiveState) {
    if (this.state === state) return
    this.state = state
    this.onStateChange?.(state)
  }

  private loop = (timestamp: number) => {
    if (!this.isRunning) return

    const elapsed = timestamp - this.lastFrameTime

    if (elapsed < 16) {
      this.animationId = requestAnimationFrame(this.loop)
      return
    }

    if (elapsed > 100) {
      this.lastFrameTime = timestamp
      this.animationId = requestAnimationFrame(this.loop)
      return
    }

    this.lastFrameTime = timestamp
    this.frameCount++

    if (timestamp - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount
      this.frameCount = 0
      this.lastFpsTime = timestamp
    }

    const now = performance.now()
    if (this.mouse.isMoving && now - this.mouse.lastMoveTime > 200) {
      this.mouse.isMoving = false
    }

    this.updateMouse()
    this.updateParticles()
    this.updateIdleState(now)

    if (this.ctx && this.canvas) {
      this.render()
    }

    this.animationId = requestAnimationFrame(this.loop)
  }

  private updateMouse() {
    const cfg = this.config.mouseFollow
    if (!cfg.enabled) return
    this.mouse.smoothX += (this.mouse.x - this.mouse.smoothX) * cfg.smoothing
    this.mouse.smoothY += (this.mouse.y - this.mouse.smoothY) * cfg.smoothing
  }

  private updateParticles() {
    const cfg = this.config.particles
    const mouseCfg = this.config.mouseFollow

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life++

      if (p.life >= p.maxLife) {
        this.particles[i] = this.createParticle()
        continue
      }

      if (mouseCfg.enabled && mouseCfg.particleAttraction > 0 && this.mouse.isMoving) {
        const dx = this.mouse.smoothX - p.x
        const dy = this.mouse.smoothY - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < mouseCfg.influence && dist > 1) {
          const force = mouseCfg.particleAttraction * (1 - dist / mouseCfg.influence)
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }
      }

      p.vx *= 0.98
      p.vy *= 0.98
      p.x += p.vx
      p.y += p.vy

      if (p.x < -20) p.x = this.width + 20
      if (p.x > this.width + 20) p.x = -20
      if (p.y < -20) p.y = this.height + 20
      if (p.y > this.height + 20) p.y = -20

      if (cfg.trailLength > 0) {
        p.trail.push({ x: p.x, y: p.y })
        if (p.trail.length > cfg.trailLength) {
          p.trail.shift()
        }
      }
    }
  }

  private updateIdleState(now: number) {
    if (!this.config.idleDetection.enabled) return
    if (this.state === 'active' && !this.mouse.isMoving && now - this.mouse.lastMoveTime > this.config.idleDetection.timeoutMs) {
      this.setState('expanded')
    }
    if (this.state === 'expanded' && this.mouse.isMoving) {
      this.setState('active')
    }
    if (this.state === 'idle' && this.mouse.isMoving) {
      this.setState('active')
    }
  }

  private render() {
    const ctx = this.ctx!
    ctx.clearRect(0, 0, this.width, this.height)
    this.renderGlow(ctx)
    this.renderParticles(ctx)
    this.renderHotZones(ctx)
    if (this.config.showCountdownClickHint && this.countdownHitBox) {
      this.renderClickHint(ctx)
    }
  }

  private renderGlow(ctx: CanvasRenderingContext2D) {
    const cfg = this.config.glow
    if (!cfg.enabled) return

    let gx = this.width / 2
    let gy = this.height / 2
    if (cfg.pulseSpeed > 0 || this.config.mouseFollow.glowFollow) {
      if (this.config.mouseFollow.glowFollow && this.mouse.isMoving) {
        gx = this.mouse.smoothX
        gy = this.mouse.smoothY
      }
    }

    const pulse = cfg.pulseSpeed > 0
      ? Math.sin(performance.now() * cfg.pulseSpeed * 0.001) * 0.15 + 0.85
      : 1

    const r = cfg.radius * pulse
    const gradient = ctx.createRadialGradient(gx, gy, 0, gx, gy, r)
    const { hexToRgb } = this
    const rgb = hexToRgb(cfg.color)
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${cfg.opacity * pulse})`)
    gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${cfg.opacity * 0.3 * pulse})`)
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(gx - r, gy - r, r * 2, r * 2)
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    const cfg = this.config.particles
    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife
      const fadeIn = Math.min(p.life / 60, 1)
      const fadeOut = lifeRatio > 0.8 ? 1 - (lifeRatio - 0.8) / 0.2 : 1
      const alpha = p.opacity * fadeIn * fadeOut

      if (cfg.trailLength > 0 && p.trail.length > 1) {
        ctx.beginPath()
        ctx.moveTo(p.trail[0].x, p.trail[0].y)
        for (let i = 1; i < p.trail.length; i++) {
          ctx.lineTo(p.trail[i].x, p.trail[i].y)
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`
        ctx.lineWidth = p.size * 0.5
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      const rgb = this.hexToRgb(p.color)
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
      ctx.fill()
    }
  }

  private renderHotZones(ctx: CanvasRenderingContext2D) {
    for (const hz of this.hotZoneRects) {
      const alpha = hz.hover ? 0.35 : 0.12
      ctx.save()
      ctx.beginPath()
      const r = 12
      this.roundRect(ctx, hz.x, hz.y, hz.width, hz.height, r)
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.fill()
      if (hz.hover) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      ctx.restore()

      ctx.save()
      ctx.font = `${Math.floor(hz.width * 0.3)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = `rgba(255, 255, 255, ${hz.hover ? 0.9 : 0.6})`
      ctx.fillText(hz.zone.icon, hz.x + hz.width / 2, hz.y + hz.height * 0.38)

      ctx.font = `${Math.max(9, Math.floor(hz.width * 0.1))}px -apple-system, "PingFang SC", sans-serif`
      ctx.fillStyle = `rgba(255, 255, 255, ${hz.hover ? 0.8 : 0.5})`
      ctx.fillText(hz.zone.label, hz.x + hz.width / 2, hz.y + hz.height * 0.72)
      ctx.restore()
    }
  }

  private renderClickHint(ctx: CanvasRenderingContext2D) {
    if (!this.countdownHitBox || !this.mouse.isOverCountdown) return
    const hb = this.countdownHitBox
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(hb.x - 8, hb.y - 8, hb.width + 16, hb.height + 16)
    ctx.setLineDash([])

    ctx.font = '11px -apple-system, "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.fillText('点击切换', hb.x + hb.width / 2, hb.y - 14)
    ctx.restore()
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
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

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 }
  }
}
