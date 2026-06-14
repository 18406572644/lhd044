import dayjs from 'dayjs'
import type { CountdownDiff, CountdownItem } from '@/types'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

export function calculateDiff(targetDate: string): CountdownDiff {
  const target = dayjs(targetDate).startOf('day')
  const now = dayjs().startOf('day')
  const diffMs = target.valueOf() - now.valueOf()
  const totalMs = dayjs(targetDate).valueOf() - Date.now()
  const absMs = Math.abs(totalMs)

  const days = Math.floor(absMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((absMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((absMs % (1000 * 60)) / 1000)

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: diffMs,
    isPast: totalMs <= 0
  }
}

export function formatDate(date: string): string {
  return dayjs(date).format('YYYY年MM月DD日')
}

export function formatDateTime(date: string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

export function padZero(n: number): string {
  return n.toString().padStart(2, '0')
}

export function createDefaultCountdown(): Partial<CountdownItem> {
  return {
    title: '新的倒计时',
    targetDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    description: '',
    emoji: '🎉',
    color: '#7ec8e3',
    textColor: '#ffffff',
    bgGradientFrom: '#a8dcf0',
    bgGradientTo: '#ffd1da',
    fontSize: 120,
    showOnWallpaper: true,
    showOnMini: true,
    notifyOnExpire: true,
    soundOnExpire: true
  }
}

export const DEFAULT_COLOR_PRESETS = [
  { name: '天空蓝粉', from: '#a8dcf0', to: '#ffd1da', text: '#ffffff', color: '#7ec8e3' },
  { name: '晨曦紫', from: '#c9b1ff', to: '#ffc3e0', text: '#ffffff', color: '#a78bfa' },
  { name: '薄荷绿', from: '#a7f3d0', to: '#bae6fd', text: '#065f46', color: '#34d399' },
  { name: '蜜桃粉', from: '#fecdd3', to: '#fde68a', text: '#831843', color: '#fb7185' },
  { name: '星空蓝', from: '#1e3a5f', to: '#3b82c4', text: '#ffffff', color: '#60a5fa' },
  { name: '暖阳橙', from: '#fed7aa', to: '#fecaca', text: '#7c2d12', color: '#fb923c' },
  { name: '薰衣草', from: '#ddd6fe', to: '#fbcfe8', text: '#5b21b6', color: '#a78bfa' },
  { name: '海洋蓝', from: '#7dd3fc', to: '#818cf8', text: '#ffffff', color: '#38bdf8' }
]

export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.15)
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.3)

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (e) {
    console.log('Audio not available')
  }
}
