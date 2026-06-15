import dayjs from 'dayjs'
import type { CountdownDiff, CountdownItem, AppSettings, HistoryItem } from '@/types'

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

export interface BackupData {
  version: string
  exportedAt: string
  countdowns: CountdownItem[]
  history: HistoryItem[]
  settings: AppSettings
}

export interface EncryptedBackup {
  version: string
  encrypted: true
  data: string
  iv: string
  salt: string
}

const BACKUP_VERSION = '1.0.0'
const ENCRYPTION_KEY_PREFIX = 'countdown-wallpaper-backup'

function str2ab(str: string): ArrayBuffer {
  const buf = new ArrayBuffer(str.length * 2)
  const bufView = new Uint16Array(buf)
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
}

function ab2str(buf: ArrayBuffer): string {
  return String.fromCharCode(...new Uint16Array(buf))
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    str2ab(ENCRYPTION_KEY_PREFIX + password),
    { name: 'PBKDF2' } as any,
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer.slice(salt.byteOffset, salt.byteLength),
      iterations: 100000,
      hash: 'SHA-256'
    } as any,
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptData(data: BackupData, password: string): Promise<EncryptedBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const encoded = str2ab(JSON.stringify(data))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteLength) } as any,
    key,
    encoded
  )
  return {
    version: BACKUP_VERSION,
    encrypted: true,
    data: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer.slice(iv.byteOffset, iv.byteLength)),
    salt: bufferToBase64(salt.buffer.slice(salt.byteOffset, salt.byteLength))
  }
}

export async function decryptData(encrypted: EncryptedBackup, password: string): Promise<BackupData> {
  const saltBuffer = base64ToBuffer(encrypted.salt)
  const ivBuffer = base64ToBuffer(encrypted.iv)
  const salt = new Uint8Array(saltBuffer)
  const iv = new Uint8Array(ivBuffer)
  const key = await deriveKey(password, salt)
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer } as any,
      key,
      base64ToBuffer(encrypted.data)
    )
    return JSON.parse(ab2str(decrypted)) as BackupData
  } catch (e) {
    throw new Error('密码错误或数据已损坏')
  }
}

export function createBackup(countdowns: CountdownItem[], history: HistoryItem[], settings: AppSettings): BackupData {
  return {
    version: BACKUP_VERSION,
    exportedAt: dayjs().toISOString(),
    countdowns,
    history,
    settings
  }
}

export function downloadFile(content: string, filename: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
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
