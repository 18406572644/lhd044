import type { CountdownItem, WallpaperStyle } from '@/types'
import { calculateDiff, formatDate, padZero } from '.'

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
