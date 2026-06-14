import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, shell, Notification } from 'electron'
import { writeFile, mkdir, readFile, existsSync, unlink } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

let mainWindow: BrowserWindow | null = null
let miniWindow: BrowserWindow | null = null
let tray: Tray | null = null
let wallpaperUpdateTimer: NodeJS.Timeout | null = null

const preload = join(__dirname, '../dist-electron/preload.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

function getAppDataPath() {
  return app.getPath('userData')
}

function getWallpaperDir() {
  return join(getAppDataPath(), 'wallpapers')
}

function getDataFilePath() {
  return join(getAppDataPath(), 'data.json')
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdir(dir, { recursive: true }, () => {})
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    title: '倒计时壁纸',
    width: Math.min(1100, width * 0.8),
    height: Math.min(750, height * 0.85),
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: true,
    backgroundColor: '#f0f7ff',
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (e) => {
    if (process.platform !== 'darwin') {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  if (url) {
    mainWindow.loadURL(url)
  } else {
    mainWindow.loadFile(indexHtml)
  }
}

function createMiniWindow() {
  miniWindow = new BrowserWindow({
    title: '迷你倒计时',
    width: 320,
    height: 200,
    minWidth: 280,
    minHeight: 160,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    show: false,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  miniWindow.setAlwaysOnTop(true, 'screen-saver')

  if (url) {
    miniWindow.loadURL(url + '#/mini')
  } else {
    miniWindow.loadFile(indexHtml, { hash: '/mini' })
  }
}

function createTray() {
  const iconPath = join(process.env.VITE_PUBLIC || '', 'tray.png')
  let image = nativeImage.createEmpty()
  if (existsSync(iconPath)) {
    image = nativeImage.createFromPath(iconPath)
  } else {
    const size = 16
    const canvas = Buffer.alloc(size * size * 4)
    for (let i = 0; i < size * size; i++) {
      canvas[i * 4] = 135
      canvas[i * 4 + 1] = 206
      canvas[i * 4 + 2] = 250
      canvas[i * 4 + 3] = 255
    }
    image = nativeImage.createFromBuffer(canvas, { width: size, height: size })
  }

  tray = new Tray(image)
  tray.setToolTip('倒计时壁纸')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: '迷你窗口',
      click: () => {
        if (!miniWindow) {
          createMiniWindow()
        }
        miniWindow?.show()
        miniWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: '刷新壁纸',
      click: () => {
        mainWindow?.webContents.send('wallpaper:refresh')
      }
    },
    { type: 'separator' },
    {
      label: '开机自启动',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (menuItem) => {
        app.setLoginItemSettings({
          openAtLogin: menuItem.checked
        })
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
}

function setWallpaperWindows(imagePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const psScript = `
      Add-Type -TypeDefinition @"
      using System;
      using System.Runtime.InteropServices;
      public class Wallpaper {
          [DllImport("user32.dll", CharSet = CharSet.Auto)]
          public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
      }
"@
      [Wallpaper]::SystemParametersInfo(20, 0, "${imagePath.replace(/'/g, "''")}", 3)
    `
    exec(`powershell -Command "${psScript}"`, (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

app.whenReady().then(() => {
  ensureDir(getAppDataPath())
  ensureDir(getWallpaperDir())

  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep app running in tray
  }
})

app.on('before-quit', () => {
  if (wallpaperUpdateTimer) {
    clearInterval(wallpaperUpdateTimer)
  }
})

ipcMain.handle('app:get-login-settings', () => {
  return app.getLoginItemSettings()
})

ipcMain.handle('app:set-login-settings', (_e, openAtLogin: boolean) => {
  app.setLoginItemSettings({ openAtLogin })
  return true
})

ipcMain.handle('window:mini-show', () => {
  if (!miniWindow) {
    createMiniWindow()
  }
  miniWindow?.show()
  miniWindow?.focus()
  return true
})

ipcMain.handle('window:mini-hide', () => {
  miniWindow?.hide()
  return true
})

ipcMain.handle('window:mini-toggle', () => {
  if (!miniWindow) {
    createMiniWindow()
    const win = miniWindow as BrowserWindow | null
    win?.show()
    return true
  }
  if (miniWindow.isVisible()) {
    miniWindow.hide()
    return false
  } else {
    miniWindow.show()
    return true
  }
})

ipcMain.handle('window:mini-close', () => {
  miniWindow?.close()
  miniWindow = null
  return true
})

ipcMain.handle('window:main-show', () => {
  mainWindow?.show()
  mainWindow?.focus()
  return true
})

ipcMain.handle('window:main-hide', () => {
  mainWindow?.hide()
  return true
})

ipcMain.handle('data:save', async (_e, data: any) => {
  const filePath = getDataFilePath()
  ensureDir(dirname(filePath))
  return new Promise((resolve, reject) => {
    writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8', (err) => {
      if (err) reject(err)
      else resolve(true)
    })
  })
})

ipcMain.handle('data:load', async () => {
  const filePath = getDataFilePath()
  if (!existsSync(filePath)) {
    return null
  }
  return new Promise((resolve, reject) => {
    readFile(filePath, 'utf-8', (err, data) => {
      if (err) reject(err)
      else {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve(null)
        }
      }
    })
  })
})

ipcMain.handle('wallpaper:save-image', async (_e, { filename, dataUrl }: { filename: string; dataUrl: string }) => {
  const dir = getWallpaperDir()
  ensureDir(dir)
  const filePath = join(dir, filename)
  const base64 = dataUrl.split(';base64,').pop() || ''
  return new Promise((resolve, reject) => {
    writeFile(filePath, base64, { encoding: 'base64' }, (err) => {
      if (err) reject(err)
      else resolve(filePath)
    })
  })
})

ipcMain.handle('wallpaper:set', async (_e, imagePath: string) => {
  try {
    if (process.platform === 'win32') {
      await setWallpaperWindows(imagePath)
    }
    return true
  } catch (e) {
    console.error('Failed to set wallpaper:', e)
    return false
  }
})

ipcMain.handle('wallpaper:clean-old', async (_e, keepFilename: string) => {
  const dir = getWallpaperDir()
  if (!existsSync(dir)) return true
  return new Promise((resolve) => {
    const fs = require('fs')
    const path = require('path')
    fs.readdir(dir, (err: Error | null, files: string[]) => {
      if (err) {
        resolve(true)
        return
      }
      files.forEach((file: string) => {
        if (file !== keepFilename && file.endsWith('.png')) {
          try {
            unlink(path.join(dir, file), () => {})
          } catch {
            // ignore
          }
        }
      })
      resolve(true)
    })
  })
})

ipcMain.handle('notification:show', async (_e, { title, body }: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body })
    notification.show()
  }
  return true
})

ipcMain.handle('app:get-displays', () => {
  return screen.getAllDisplays().map(d => ({
    id: d.id,
    width: d.size.width,
    height: d.size.height,
    scaleFactor: d.scaleFactor,
    isPrimary: d.id === screen.getPrimaryDisplay().id
  }))
})

ipcMain.on('wallpaper:start-auto-update', (_e, intervalMs: number) => {
  if (wallpaperUpdateTimer) {
    clearInterval(wallpaperUpdateTimer)
  }
  wallpaperUpdateTimer = setInterval(() => {
    mainWindow?.webContents.send('wallpaper:tick')
  }, intervalMs)
})

ipcMain.on('wallpaper:stop-auto-update', () => {
  if (wallpaperUpdateTimer) {
    clearInterval(wallpaperUpdateTimer)
    wallpaperUpdateTimer = null
  }
})

ipcMain.on('shell:open-external', (_e, url: string) => {
  shell.openExternal(url)
})
