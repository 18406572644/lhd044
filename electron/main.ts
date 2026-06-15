import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, shell, Notification, dialog } from 'electron'
import { writeFile, mkdir, readFile, existsSync, unlink, readFileSync, writeFileSync } from 'fs'
import { join, dirname, extname } from 'path'
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
let interactiveWallpaperWindow: BrowserWindow | null = null
let animatedWallpaperWindow: BrowserWindow | null = null
let tray: Tray | null = null
let wallpaperUpdateTimer: NodeJS.Timeout | null = null
let isQuitting = false

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
    if (process.platform !== 'darwin' && !isQuitting) {
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
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show()
    return
  }

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

  miniWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('Mini window failed to load:', code, desc)
  })

  miniWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('Mini window render process gone:', details)
  })

  miniWindow.on('closed', () => {
    miniWindow = null
  })

  if (url) {
    miniWindow.loadURL(url + '#/mini')
  } else {
    miniWindow.loadFile(indexHtml, { hash: '/mini' })
  }

  miniWindow.once('ready-to-show', () => {
    miniWindow?.show()
  })
}

function createInteractiveWallpaperWindow() {
  if (interactiveWallpaperWindow) {
    interactiveWallpaperWindow.show()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size
  const { x, y } = primaryDisplay.bounds

  interactiveWallpaperWindow = new BrowserWindow({
    title: 'Interactive Wallpaper',
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    focusable: true,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  interactiveWallpaperWindow.setAlwaysOnTop(true, 'normal')
  interactiveWallpaperWindow.setVisibleOnAllWorkspaces(true)
  interactiveWallpaperWindow.setIgnoreMouseEvents(false)

  interactiveWallpaperWindow.on('closed', () => {
    interactiveWallpaperWindow = null
  })

  if (url) {
    interactiveWallpaperWindow.loadURL(url + '#/interactive-wallpaper')
  } else {
    interactiveWallpaperWindow.loadFile(indexHtml, { hash: '/interactive-wallpaper' })
  }

  interactiveWallpaperWindow.once('ready-to-show', () => {
    interactiveWallpaperWindow?.showInactive()
  })

  interactiveWallpaperWindow.webContents.on('did-finish-load', () => {
    interactiveWallpaperWindow?.webContents.send('wallpaper:window-ready')
  })
}

function setWallpaperWindowBehindDesktopIcons(win: BrowserWindow) {
  if (process.platform !== 'win32') return

  try {
    const hWnd = win.getNativeWindowHandle()
    const hwndNum = process.arch === 'x64' ? hWnd.readBigInt64LE(0).toString() : hWnd.readInt32LE(0).toString()
    const scriptContent = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WallpaperWin32 {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindowEx(IntPtr hWndParent, IntPtr hWndChildAfter, string lpszClass, IntPtr lpszWindow);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SendMessageTimeout(IntPtr hWnd, uint Msg, UIntPtr wParam, IntPtr lParam, uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetParent(IntPtr hWndChild, IntPtr hWndNewParent);
}
"@

$progman = [WallpaperWin32]::FindWindow("Progman", $null)
$result = [UIntPtr]::Zero
[WallpaperWin32]::SendMessageTimeout($progman, 0x052C, [UIntPtr]::Zero, [IntPtr]::Zero, 0x0002, 1000, [ref]$result) | Out-Null

$workerw = [IntPtr]::Zero
do {
    $workerw = [WallpaperWin32]::FindWindowEx([IntPtr]::Zero, $workerw, "WorkerW", [IntPtr]::Zero)
    if (-not $workerw.Equals([IntPtr]::Zero)) {
        $shellView = [WallpaperWin32]::FindWindowEx($workerw, [IntPtr]::Zero, "SHELLDLL_DefView", [IntPtr]::Zero)
        if (-not $shellView.Equals([IntPtr]::Zero)) {
            break
        }
    }
} while (-not $workerw.Equals([IntPtr]::Zero))

$handle = New-Object System.IntPtr(${hwndNum})
[WallpaperWin32]::SetParent($handle, $workerw) | Out-Null
`
    const scriptPath = join(getAppDataPath(), 'set_wallpaper_layer.ps1')
    writeFileSync(scriptPath, scriptContent, 'utf-8')
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { timeout: 10000 },
      (error) => {
        if (error) {
          console.warn('Failed to set wallpaper window layer, falling back to always on bottom:', error.message)
        }
      }
    )
  } catch (e) {
    console.warn('Failed to inject wallpaper window behind icons:', e)
  }
}

function createAnimatedWallpaperWindow() {
  if (animatedWallpaperWindow) {
    animatedWallpaperWindow.show()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size
  const { x, y } = primaryDisplay.bounds

  animatedWallpaperWindow = new BrowserWindow({
    title: 'Animated Wallpaper',
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: false,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    focusable: false,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  animatedWallpaperWindow.setAlwaysOnTop(false)
  animatedWallpaperWindow.setVisibleOnAllWorkspaces(true)
  animatedWallpaperWindow.setIgnoreMouseEvents(true)
  animatedWallpaperWindow.setFullScreenable(false)

  animatedWallpaperWindow.on('closed', () => {
    animatedWallpaperWindow = null
  })

  if (url) {
    animatedWallpaperWindow.loadURL(url + '#/animated-wallpaper')
  } else {
    animatedWallpaperWindow.loadFile(indexHtml, { hash: '/animated-wallpaper' })
  }

  animatedWallpaperWindow.once('ready-to-show', () => {
    animatedWallpaperWindow?.showInactive()
    if (process.platform === 'win32') {
      setTimeout(() => {
        if (animatedWallpaperWindow) {
          setWallpaperWindowBehindDesktopIcons(animatedWallpaperWindow)
        }
      }, 100)
    }
  })

  animatedWallpaperWindow.webContents.on('did-finish-load', () => {
    animatedWallpaperWindow?.webContents.send('wallpaper:window-ready')
  })
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
    {
      label: '交互壁纸',
      type: 'checkbox',
      checked: !!interactiveWallpaperWindow,
      click: (menuItem) => {
        if (menuItem.checked) {
          animatedWallpaperWindow?.close()
          animatedWallpaperWindow = null
          createInteractiveWallpaperWindow()
        } else {
          interactiveWallpaperWindow?.close()
          interactiveWallpaperWindow = null
        }
      }
    },
    {
      label: '动态壁纸',
      type: 'checkbox',
      checked: !!animatedWallpaperWindow,
      click: (menuItem) => {
        if (menuItem.checked) {
          interactiveWallpaperWindow?.close()
          interactiveWallpaperWindow = null
          createAnimatedWallpaperWindow()
        } else {
          animatedWallpaperWindow?.close()
          animatedWallpaperWindow = null
        }
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
        isQuitting = true
        miniWindow?.close()
        interactiveWallpaperWindow?.close()
        animatedWallpaperWindow?.close()
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
    const scriptContent = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WallpaperAPI {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
[WallpaperAPI]::SystemParametersInfo(20, 0, "${imagePath.replace(/"/g, '""')}", 3)
`
    const scriptPath = join(getAppDataPath(), 'set_wallpaper.ps1')
    try {
      writeFileSync(scriptPath, scriptContent, 'utf-8')
    } catch (e) {
      reject(e)
      return
    }
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { timeout: 15000 },
      (error, stdout, stderr) => {
        if (error) {
          console.error('setWallpaper error:', error.message, stderr)
          reject(error)
        } else {
          resolve()
        }
      }
    )
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
  animatedWallpaperWindow?.close()
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

ipcMain.handle('wallpaper:interactive-show', () => {
  createInteractiveWallpaperWindow()
  return true
})

ipcMain.handle('wallpaper:interactive-hide', () => {
  interactiveWallpaperWindow?.hide()
  return true
})

ipcMain.handle('wallpaper:interactive-close', () => {
  interactiveWallpaperWindow?.close()
  interactiveWallpaperWindow = null
  return true
})

ipcMain.handle('wallpaper:interactive-set-click-through', (_e, clickThrough: boolean) => {
  if (interactiveWallpaperWindow) {
    interactiveWallpaperWindow.setIgnoreMouseEvents(clickThrough)
    return true
  }
  return false
})

ipcMain.handle('wallpaper:interactive-send-action', (_e, action: string) => {
  mainWindow?.webContents.send('wallpaper:interactive-action', action)
  return true
})

ipcMain.handle('wallpaper:interactive-is-running', () => {
  return !!interactiveWallpaperWindow
})

ipcMain.handle('wallpaper:interactive-update-data', (_e, data: any) => {
  if (interactiveWallpaperWindow && !interactiveWallpaperWindow.isDestroyed()) {
    interactiveWallpaperWindow.webContents.send('wallpaper:update-data', data)
    return true
  }
  return false
})

ipcMain.handle('wallpaper:interactive-request-data', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('wallpaper:request-data')
    return true
  }
  return false
})

ipcMain.on('wallpaper:window-ready', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('wallpaper:request-data')
  }
})

ipcMain.handle('wallpaper:animated-show', () => {
  createAnimatedWallpaperWindow()
  return true
})

ipcMain.handle('wallpaper:animated-hide', () => {
  animatedWallpaperWindow?.hide()
  return true
})

ipcMain.handle('wallpaper:animated-close', () => {
  animatedWallpaperWindow?.close()
  animatedWallpaperWindow = null
  return true
})

ipcMain.handle('wallpaper:animated-is-running', () => {
  return !!animatedWallpaperWindow
})

ipcMain.handle('wallpaper:animated-update-data', (_e, data: any) => {
  if (animatedWallpaperWindow && !animatedWallpaperWindow.isDestroyed()) {
    animatedWallpaperWindow.webContents.send('wallpaper:update-data', data)
    return true
  }
  return false
})

ipcMain.handle('wallpaper:animated-request-data', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('wallpaper:request-data')
    return true
  }
  return false
})

ipcMain.handle('data:save', async (_e, data: any) => {
  const filePath = getDataFilePath()
  ensureDir(dirname(filePath))
  return new Promise((resolve, reject) => {
    writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8', (err) => {
      if (err) reject(err)
      else {
        if (miniWindow && !miniWindow.isDestroyed()) {
          miniWindow.webContents.send('data:updated')
        }
        resolve(true)
      }
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

ipcMain.handle('dialog:select-image', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择背景图片',
    filters: [
      { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }
    ],
    properties: ['openFile']
  })
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    try {
      const data = readFileSync(filePath)
      const ext = extname(filePath).slice(1).toLowerCase()
      const mimeMap: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        bmp: 'image/bmp',
        webp: 'image/webp'
      }
      const mime = mimeMap[ext] || 'image/png'
      return `data:${mime};base64,${data.toString('base64')}`
    } catch (e) {
      console.error('Failed to read image:', e)
      return null
    }
  }
  return null
})

ipcMain.handle('dialog:save-backup', async (_e, { content, filename }: { content: string; filename: string }) => {
  const result = await dialog.showSaveDialog({
    title: '保存备份文件',
    defaultPath: filename,
    filters: [
      { name: '备份文件', extensions: ['json', 'cwbk'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  if (!result.canceled && result.filePath) {
    try {
      writeFileSync(result.filePath, content, 'utf-8')
      return true
    } catch (e) {
      console.error('Failed to save backup:', e)
      return false
    }
  }
  return false
})

ipcMain.handle('dialog:open-backup', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择备份文件',
    filters: [
      { name: '备份文件', extensions: ['json', 'cwbk'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    properties: ['openFile']
  })
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const content = readFileSync(result.filePaths[0], 'utf-8')
      return content
    } catch (e) {
      console.error('Failed to read backup:', e)
      return null
    }
  }
  return null
})
